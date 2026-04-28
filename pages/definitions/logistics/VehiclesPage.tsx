import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Edit, FileText, Loader2, Plus, Save, Trash2, Truck, X } from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type DriverOption = {
    id: string;
    name: string;
};

type VehicleRow = {
    id?: string;
    vehicle_code?: string;
    plate_no: string;
    description?: string;
    brand?: string;
    model?: string;
    color?: string;
    type?: string;
    driver_id?: string;
    driver_name?: string;
    license_expiry?: string;
    insurance_expiry?: string;
    notes?: string;
    is_active?: number | boolean;
};

const emptyVehicle: VehicleRow = {
    vehicle_code: '',
    plate_no: '',
    description: '',
    brand: '',
    model: '',
    color: '',
    type: '',
    driver_id: '',
    license_expiry: '',
    insurance_expiry: '',
    notes: '',
    is_active: 1,
};

const isActive = (value: unknown) => value !== 0 && value !== false;

export const VehiclesPage: React.FC = () => {
    const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
    const [drivers, setDrivers] = useState<DriverOption[]>([]);
    const [current, setCurrent] = useState<VehicleRow>(emptyVehicle);
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
            const [vehicleRows, driverRows] = await Promise.all([
                window.electronAPI.logistics.getVehicles(),
                window.electronAPI.logistics.getDrivers(),
            ]);
            setVehicles(Array.isArray(vehicleRows) ? vehicleRows : []);
            setDrivers(Array.isArray(driverRows) ? driverRows : []);
        } catch (err) {
            console.error(err);
            setError('تعذر تحميل المركبات');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setCurrent(emptyVehicle);
        setEditingId(null);
        setIsModalOpen(false);
        setError(null);
    };

    const openCreate = () => {
        setCurrent(emptyVehicle);
        setEditingId(null);
        setError(null);
        setIsModalOpen(true);
    };

    const openEdit = (vehicle: VehicleRow) => {
        setCurrent({ ...emptyVehicle, ...vehicle });
        setEditingId(vehicle.id || null);
        setError(null);
        setIsModalOpen(true);
    };

    useCreateIntent(openCreate);

    const driverName = (vehicle: VehicleRow) => {
        if (vehicle.driver_name) return vehicle.driver_name;
        if (!vehicle.driver_id) return '-';
        return drivers.find((driver) => driver.id === vehicle.driver_id)?.name || '-';
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!String(current.plate_no || '').trim()) {
            setError('رقم اللوحة مطلوب');
            return;
        }

        try {
            setSaving(true);
            await window.electronAPI.logistics.saveVehicle({
                ...current,
                id: editingId || current.id,
                is_active: isActive(current.is_active) ? 1 : 0,
            });
            await loadData();
            closeModal();
        } catch (err: any) {
            setError(err?.message || 'تعذر حفظ المركبة');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('هل أنت متأكد من حذف هذه المركبة؟')) return;

        try {
            await window.electronAPI.logistics.deleteVehicle(id);
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف المركبة');
        }
    };

    const handleDeleteRows = async (rows: VehicleRow[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذه المركبة؟' : `هل أنت متأكد من حذف ${rows.length} مركبات؟`)) return;

        try {
            for (const row of rows) {
                if (row.id) await window.electronAPI.logistics.deleteVehicle(row.id);
            }
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف المركبات المحددة');
        }
    };

    const expiryBadge = (date?: string) => {
        if (!date) return '-';
        const expired = new Date(date) < new Date();
        return (
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${expired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {date}
            </span>
        );
    };

    const driverOptions = React.useMemo(
        () => drivers.map((driver) => ({ value: driver.id, label: driver.name })),
        [drivers],
    );

    const columns = React.useMemo<DefinitionListColumn<VehicleRow>[]>(() => [
        {
            key: 'vehicle_code',
            label: 'رقم السيارة',
            width: 140,
            defaultVisible: true,
            getSearchValue: (vehicle) => `${vehicle.vehicle_code || ''} ${vehicle.plate_no || ''} ${vehicle.description || ''} ${vehicle.brand || ''} ${vehicle.model || ''} ${driverName(vehicle)}`,
            renderCell: (vehicle) => vehicle.vehicle_code ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">{vehicle.vehicle_code}</span>
            ) : '-',
        },
        {
            key: 'plate_no',
            label: 'رقم اللوحة',
            width: 150,
            defaultVisible: true,
            getDisplayValue: (vehicle) => vehicle.plate_no || '-',
            renderCell: (vehicle) => <span className="font-mono font-bold text-slate-800" dir="ltr">{vehicle.plate_no || '-'}</span>,
        },
        {
            key: 'description',
            label: 'وصف السيارة',
            width: 240,
            defaultVisible: true,
            getDisplayValue: (vehicle) => vehicle.description || '-',
        },
        {
            key: 'brand_model',
            label: 'الماركة / الموديل',
            width: 180,
            defaultVisible: true,
            getValue: (vehicle) => `${vehicle.brand || ''} ${vehicle.model || ''}`.trim(),
            getDisplayValue: (vehicle) => [vehicle.brand, vehicle.model].filter(Boolean).join(' / ') || '-',
            renderCell: (vehicle) => (
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">{vehicle.brand || '-'}</div>
                    <div className="truncate text-xs text-slate-400">{vehicle.model || '-'}</div>
                </div>
            ),
        },
        {
            key: 'driver_id',
            label: 'السائق',
            type: 'enum',
            filterType: 'lookup',
            options: driverOptions,
            width: 180,
            defaultVisible: true,
            getValue: (vehicle) => vehicle.driver_id || '',
            getDisplayValue: (vehicle) => driverName(vehicle),
            renderCell: (vehicle) => vehicle.driver_id || vehicle.driver_name ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    <Truck size={12} />
                    {driverName(vehicle)}
                </span>
            ) : '-',
        },
        {
            key: 'license_expiry',
            label: 'انتهاء الترخيص',
            type: 'date',
            filterType: 'date',
            width: 150,
            defaultVisible: true,
            getDisplayValue: (vehicle) => vehicle.license_expiry || '-',
            renderCell: (vehicle) => expiryBadge(vehicle.license_expiry),
        },
        {
            key: 'insurance_expiry',
            label: 'انتهاء التأمين',
            type: 'date',
            filterType: 'date',
            width: 150,
            defaultVisible: false,
            getDisplayValue: (vehicle) => vehicle.insurance_expiry || '-',
            renderCell: (vehicle) => expiryBadge(vehicle.insurance_expiry),
        },
        {
            key: 'type',
            label: 'النوع',
            width: 140,
            defaultVisible: false,
            getDisplayValue: (vehicle) => vehicle.type || '-',
        },
        {
            key: 'color',
            label: 'اللون',
            width: 120,
            defaultVisible: false,
            getDisplayValue: (vehicle) => vehicle.color || '-',
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 130,
            defaultVisible: true,
            getValue: (vehicle) => (isActive(vehicle.is_active) ? 1 : 0),
            renderCell: (vehicle) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isActive(vehicle.is_active) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isActive(vehicle.is_active) ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {isActive(vehicle.is_active) ? 'نشطة' : 'غير نشطة'}
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
            renderCell: (vehicle) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => openEdit(vehicle)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(vehicle.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [driverOptions, drivers, vehicles]);

    return (
        <div className="app-page" dir="rtl">
            <WorkspaceHeader
                icon={<Truck size={24} />}
                title="تعريف السيارات والمركبات"
                subtitle="إدارة المركبات والسائقين والترخيص والتأمين من خلال جدول موحد قابل للتصفية."
                badges={[
                    { label: `المركبات ${vehicles.length}`, tone: 'warning' },
                    { label: `النشطة ${vehicles.filter((vehicle) => isActive(vehicle.is_active)).length}`, tone: 'success' },
                    { label: `السائقين ${drivers.length}`, tone: 'info' },
                ]}
                actions={(
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-700"
                    >
                        <Plus size={18} />
                        مركبة جديدة
                    </button>
                )}
                className="mb-6"
            />

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
                screenKey="definitions.vehicles"
                data={vehicles}
                loading={loading}
                columns={columns}
                rowKey={(vehicle) => String(vehicle.id || vehicle.plate_no)}
                searchPlaceholder="بحث عن مركبة..."
                emptyMessage="لا توجد مركبات مطابقة للمعايير الحالية"
                createLabel="مركبة جديدة"
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadData}
                defaultSort={{ key: 'plate_no', direction: 'asc' }}
            />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" dir="rtl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                {editingId ? <Edit size={20} className="text-orange-600" /> : <Truck size={20} className="text-orange-600" />}
                                {editingId ? 'تعديل بيانات مركبة' : 'إضافة مركبة جديدة'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 transition hover:text-red-500">
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="max-h-[calc(92vh-4.5rem)] space-y-4 overflow-y-auto p-6">
                            {error && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم السيارة</label>
                                    <input
                                        type="text"
                                        value={current.vehicle_code || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, vehicle_code: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="رمز..."
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم اللوحة <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={current.plate_no || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, plate_no: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 font-mono outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="12-3456"
                                        dir="ltr"
                                        autoFocus
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">وصف السيارة</label>
                                    <input
                                        type="text"
                                        value={current.description || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, description: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="وصف عام..."
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الماركة</label>
                                    <input
                                        type="text"
                                        value={current.brand || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, brand: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="Toyota"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الموديل</label>
                                    <input
                                        type="text"
                                        value={current.model || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, model: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="2024"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">اللون</label>
                                    <input
                                        type="text"
                                        value={current.color || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, color: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="أبيض"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">النوع / الفئة</label>
                                    <input
                                        type="text"
                                        value={current.type || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, type: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="شاحنة"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">السائق المسؤول</label>
                                    <select
                                        value={current.driver_id || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, driver_id: event.target.value }))}
                                        className="w-full rounded-lg border bg-white px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                    >
                                        <option value="">بدون سائق</option>
                                        {drivers.map((driver) => (
                                            <option key={driver.id} value={driver.id}>{driver.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Calendar size={16} />
                                        انتهاء الترخيص
                                    </label>
                                    <input
                                        type="date"
                                        value={current.license_expiry || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, license_expiry: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Calendar size={16} />
                                        انتهاء التأمين
                                    </label>
                                    <input
                                        type="date"
                                        value={current.insurance_expiry || ''}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, insurance_expiry: event.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                    />
                                </div>

                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 md:col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={isActive(current.is_active)}
                                        onChange={(event) => setCurrent((prev) => ({ ...prev, is_active: event.target.checked ? 1 : 0 }))}
                                    />
                                    مركبة نشطة
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
                                    className="h-24 w-full resize-none rounded-lg border px-3 py-2 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
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
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-70"
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
