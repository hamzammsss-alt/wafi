
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Edit, Search, Truck, Fuel, Calendar, FileText } from 'lucide-react';

export const VehiclesPage: React.FC = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]); // Drivers list
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState<any>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI && window.electronAPI.logistics) {
                // @ts-ignore
                const [vehRows, drvRows] = await Promise.all([
                    // @ts-ignore
                    window.electronAPI.logistics.getVehicles(),
                    // @ts-ignore
                    window.electronAPI.logistics.getDrivers()
                ]);
                setVehicles(vehRows);
                setDrivers(drvRows);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!current.plate_no) {
            alert("الرجاء إدخال رقم اللوحة");
            return;
        }

        try {
            // @ts-ignore
            if (window.electronAPI && window.electronAPI.logistics) {
                // @ts-ignore
                await window.electronAPI.logistics.saveVehicle(current);
                loadData();
                setIsEditing(false);
                setCurrent({});
                alert("تم الحفظ بنجاح");
            }
        } catch (err: any) {
            alert('خطأ في الحفظ: ' + err.message);
        }
    };

    const handleEdit = (item: any) => {
        setCurrent({ ...item });
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('هل أنت متأكد من الحذف؟')) {
            try {
                // @ts-ignore
                if (window.electronAPI) {
                    // @ts-ignore
                    await window.electronAPI.logistics.deleteVehicle(id);
                    loadData();
                }
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const filteredData = vehicles.filter(item =>
        item.plate_no.toLowerCase().includes(search.toLowerCase()) ||
        (item.model && item.model.toLowerCase().includes(search.toLowerCase())) ||
        (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
        (item.vehicle_code && item.vehicle_code.toLowerCase().includes(search.toLowerCase())) ||
        (item.driver_name && item.driver_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <Truck size={24} />
                </div>
                <span>تعريف السيارات والمركبات</span>
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b flex items-center gap-2">
                        {isEditing ? <Edit size={18} /> : <Truck size={18} />}
                        {isEditing ? 'تعديل بيانات مركبة' : 'إضافة مركبة جديدة'}
                    </h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم السيارة</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.vehicle_code || ''}
                                    onChange={e => setCurrent({ ...current, vehicle_code: e.target.value })}
                                    placeholder="رمز..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم اللوحة <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono text-left"
                                    value={current.plate_no || ''}
                                    onChange={e => setCurrent({ ...current, plate_no: e.target.value })}
                                    placeholder="12-3456"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">وصف السيارة</label>
                            <input
                                type="text"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                value={current.description || ''}
                                onChange={e => setCurrent({ ...current, description: e.target.value })}
                                placeholder="وصف عام..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الماركة</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.brand || ''}
                                    onChange={e => setCurrent({ ...current, brand: e.target.value })}
                                    placeholder="Toyota..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الموديل</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.model || ''}
                                    onChange={e => setCurrent({ ...current, model: e.target.value })}
                                    placeholder="2024..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اللون</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.color || ''}
                                    onChange={e => setCurrent({ ...current, color: e.target.value })}
                                    placeholder="أبيض..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">النوع / الفئة</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.type || ''}
                                    onChange={e => setCurrent({ ...current, type: e.target.value })}
                                    placeholder="شاحنة..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السائق المسئول</label>
                            <select
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                value={current.driver_id || ''}
                                onChange={e => setCurrent({ ...current, driver_id: e.target.value })}
                            >
                                <option value="">بدون سائق</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">انتهاء الترخيص</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.license_expiry || ''}
                                    onChange={e => setCurrent({ ...current, license_expiry: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">انتهاء التأمين</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    value={current.insurance_expiry || ''}
                                    onChange={e => setCurrent({ ...current, insurance_expiry: e.target.value })}
                                />
                            </div>
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                            <textarea
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all h-20 resize-none"
                                value={current.notes || ''}
                                onChange={e => setCurrent({ ...current, notes: e.target.value })}
                                placeholder="أي ملاحظات إضافية..."
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-lg">
                            <input
                                type="checkbox"
                                id="isActive"
                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                checked={current.is_active !== 0} // Default true
                                onChange={e => setCurrent({ ...current, is_active: e.target.checked ? 1 : 0 })}
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">مركبة نشطة</label>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg font-bold hover:bg-orange-700 flex justify-center items-center gap-2 shadow-sm transition-all active:scale-95"
                            >
                                <Save size={18} /> حفظ
                            </button>
                            {isEditing && (
                                <button
                                    onClick={() => { setIsEditing(false); setCurrent({}); }}
                                    className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
                        <div className="relative w-72">
                            <input
                                className="w-full p-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="بحث عن مركبة..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <Search size={18} className="absolute top-2.5 right-3 text-gray-400" />
                        </div>
                        <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                            العدد: <span className="text-orange-600 font-bold">{filteredData.length}</span>
                        </div>
                    </div>

                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="p-4 text-left">رقم السيارة</th>
                                    <th className="p-4 text-left">رقم اللوحة</th>   {/* LTR aware */}
                                    <th className="p-4 text-right">وصف السيارة</th>
                                    <th className="p-4 text-right">الماركة / الموديل</th>
                                    <th className="p-4 text-right">السائق</th>
                                    <th className="p-4 text-right">انتهاء الترخيص</th>
                                    <th className="p-4 text-center">الحالة</th>
                                    <th className="p-4 w-24 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                                            <span>جاري التحميل...</span>
                                        </div>
                                    </td></tr>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map(item => (
                                        <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                                            <td className="p-4 font-bold text-gray-700 text-sm">{item.vehicle_code || '-'}</td>
                                            <td className="p-4 font-bold text-slate-800 font-mono text-left" dir="ltr">
                                                {item.plate_no}
                                            </td>
                                            <td className="p-4 text-gray-600 text-sm max-w-xs truncate" title={item.description || ''}>{item.description || '-'}</td>
                                            <td className="p-4 text-gray-700 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{item.brand}</span>
                                                    <span className="text-slate-500 text-xs">{item.model}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600 text-sm">
                                                {item.driver_name ? (
                                                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                        <Truck size={14} /> {item.driver_name}
                                                    </span>
                                                ) : <span className="text-gray-400 text-xs">غير محدد</span>}
                                            </td>
                                            <td className="p-4 text-gray-600 text-sm">
                                                {item.license_expiry ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs ${new Date(item.license_expiry) < new Date() ? 'bg-red-100 text-red-600 font-bold' : 'bg-gray-100'
                                                        }`}>
                                                        {item.license_expiry}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {item.is_active ? 'نشط' : 'غير نشط'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="تعديل">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="حذف">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                                            <Truck size={48} className="opacity-20" />
                                            <span>لا توجد بيانات</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
