import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit, FileText, Loader2, Phone, Plus, Save, Trash2, User, X } from 'lucide-react';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type DriverRow = {
    id?: string;
    name: string;
    phone?: string;
    license_no?: string;
    license_expiry?: string;
    notes?: string;
    is_active?: number | boolean;
};

const emptyDriver: DriverRow = {
    name: '',
    phone: '',
    license_no: '',
    license_expiry: '',
    notes: '',
    is_active: 1,
};

const isActive = (value: unknown) => value !== 0 && value !== false;

export const DriversPage: React.FC = () => {
    const [drivers, setDrivers] = useState<DriverRow[]>([]);
    const [current, setCurrent] = useState<DriverRow>(emptyDriver);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const rows = await window.electronAPI.logistics.getDrivers();
            setDrivers(Array.isArray(rows) ? rows : []);
        } catch (err) {
            console.error(err);
            setError('تعذر تحميل السائقين');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setCurrent(emptyDriver);
        setEditingId(null);
        setIsModalOpen(false);
        setError(null);
    };

    const openCreate = () => {
        setCurrent(emptyDriver);
        setEditingId(null);
        setError(null);
        setIsModalOpen(true);
    };

    const openEdit = (driver: DriverRow) => {
        setCurrent({ ...emptyDriver, ...driver });
        setEditingId(driver.id || null);
        setError(null);
        setIsModalOpen(true);
    };

    useCreateIntent(openCreate);

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!String(current.name || '').trim()) {
            setError('اسم السائق مطلوب');
            return;
        }

        try {
            setSaving(true);
            await window.electronAPI.logistics.saveDriver({
                ...current,
                id: editingId || current.id,
                is_active: isActive(current.is_active) ? 1 : 0,
            });
            await loadData();
            closeModal();
        } catch (err: any) {
            setError(err?.message || 'تعذر حفظ السائق');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('هل أنت متأكد من حذف هذا السائق؟')) return;

        try {
            await window.electronAPI.logistics.deleteDriver(id);
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف السائق');
        }
    };

    const handleDeleteRows = async (rows: DriverRow[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذا السائق؟' : `هل أنت متأكد من حذف ${rows.length} سائقين؟`)) return;

        try {
            for (const row of rows) {
                if (row.id) await window.electronAPI.logistics.deleteDriver(row.id);
            }
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف السائقين المحددين');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<DriverRow>[]>(() => [
        {
            key: 'name',
            label: 'اسم السائق',
            width: 260,
            defaultVisible: true,
            getSearchValue: (driver) => `${driver.name || ''} ${driver.phone || ''} ${driver.license_no || ''}`,
            renderCell: (driver) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {driver.name?.charAt(0) || '#'}
                    </div>
                    <span className="font-bold text-slate-800">{driver.name || '-'}</span>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'الهاتف',
            width: 160,
            defaultVisible: true,
            getDisplayValue: (driver) => driver.phone || '-',
        },
        {
            key: 'license_no',
            label: 'رقم الرخصة',
            width: 160,
            defaultVisible: true,
            getDisplayValue: (driver) => driver.license_no || '-',
            renderCell: (driver) => driver.license_no ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{driver.license_no}</span>
            ) : '-',
        },
        {
            key: 'license_expiry',
            label: 'انتهاء الرخصة',
            type: 'date',
            filterType: 'date',
            width: 150,
            defaultVisible: true,
            getDisplayValue: (driver) => driver.license_expiry || '-',
            renderCell: (driver) => {
                if (!driver.license_expiry) return '-';
                const expired = new Date(driver.license_expiry) < new Date();
                return (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${expired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {driver.license_expiry}
                    </span>
                );
            },
        },
        {
            key: 'notes',
            label: 'ملاحظات',
            width: 240,
            defaultVisible: false,
            getDisplayValue: (driver) => driver.notes || '-',
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 130,
            defaultVisible: true,
            getValue: (driver) => (isActive(driver.is_active) ? 1 : 0),
            renderCell: (driver) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isActive(driver.is_active) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isActive(driver.is_active) ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {isActive(driver.is_active) ? 'نشط' : 'غير نشط'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 120,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (driver) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => openEdit(driver)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(driver.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [drivers]);

    return (
        <div className="app-page" dir="rtl">

            {error && !isModalOpen && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="mr-auto rounded-md p-1 hover:bg-rose-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            <DefinitionMasterList
                headerIcon={<User size={24} />}
                headerTitle="تعريف السائقين"
                headerSubtitle="إدارة السائقين والرخص ومعلومات الاتصال من خلال جدول موحد قابل للتصفية."
                headerBadges={[
                    { label: `السائقين ${drivers.length}`, tone: 'warning' },
                    { label: `النشطين ${drivers.filter((driver) => isActive(driver.is_active)).length}`, tone: 'success' },
                ]}

                screenKey="definitions.drivers"
                data={drivers}
                loading={loading}
                columns={columns}
                rowKey={(driver) => String(driver.id || driver.name)}
                searchPlaceholder="بحث عن سائق..."
                emptyMessage="لا توجد بيانات سائقين مطابقة للمعايير الحالية"
                createLabel="سائق جديد"
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadData}
                defaultSort={{ key: 'name', direction: 'asc' }}
            />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" dir="rtl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                {editingId ? <Edit size={20} className="text-blue-600" /> : <User size={20} className="text-blue-600" />}
                                {editingId ? 'تعديل بيانات سائق' : 'إضافة سائق جديد'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 transition hover:text-red-500">
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            {error && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">اسم السائق <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={current.name || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, name: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="الاسم الكامل"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم الهاتف</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute right-3 top-3 text-gray-400" />
                                        <input
                                            type="text"
                                            value={current.phone || ''}
                                            onChange={(event) => setCurrent((prev) => ({ ...prev, phone: event.target.value }))}
                                            className="w-full rounded-lg border py-2 pl-3 pr-9 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            placeholder="05xxxxxxxx"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم الرخصة</label>
                                    <input
                                        type="text"
                                        value={current.license_no || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, license_no: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="رقم رخصة القيادة"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ انتهاء الرخصة</label>
                                    <input
                                        type="date"
                                        value={current.license_expiry || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, license_expiry: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <label className="mt-7 flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={isActive(current.is_active)}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, is_active: event.target.checked ? 1 : 0 }))}
                                    />
                                    سائق نشط
                                </label>
                            </div>

                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <FileText size={16} />
                                    ملاحظات
                                </label>
                                <textarea
                                    value={current.notes || ''}
                                    onChange={(event) => setCurrent((prev) => ({ ...prev, notes: event.target.value }))}
                                    className="h-24 w-full resize-none rounded-lg border px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="أي ملاحظات إضافية..."
                                />
                            </div>

                            <div className="flex gap-3 border-t pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200">
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-70"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
