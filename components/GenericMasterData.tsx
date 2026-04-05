import React, { useState, useEffect } from 'react';
import { Save, Trash2, Edit, Search, FileText } from 'lucide-react';

interface Column {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'boolean';
}

interface GenericMasterDataProps {
    title: string;
    icon?: React.ReactNode;
    subtitle?: string; // e.g. "Master Data"
    columns: Column[];
    tableName?: string; // DB table name
    initialData?: any[]; // Keep for fallback/mock
}

export const GenericMasterData: React.FC<GenericMasterDataProps> = ({
    title, icon, columns, tableName, initialData = []
}) => {
    const [data, setData] = useState<any[]>(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState<any>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tableName) loadData();
    }, [tableName]);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const rows = await window.electronAPI.crudOperation({ operation: 'READ', table: tableName });
                setData(rows);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Basic validation: Check if first field is filled
        if (!current[columns[0].key]) return;

        try {
            // @ts-ignore
            if (window.electronAPI && tableName) {
                if (isEditing) {
                    // @ts-ignore
                    await window.electronAPI.crudOperation({ operation: 'UPDATE', table: tableName, data: current, id: current.id });
                } else {
                    // @ts-ignore
                    await window.electronAPI.crudOperation({ operation: 'CREATE', table: tableName, data: current });
                }
                loadData(); // Reload
            } else {
                // Local Fallback
                if (isEditing) {
                    setData(data.map(item => item.id === current.id ? current : item));
                } else {
                    setData([...data, { ...current, id: Date.now() }]);
                }
            }
        } catch (err) {
            alert('خطأ في الحفظ: ' + err);
        }

        setIsEditing(false);
        setCurrent({});
    };

    const handleEdit = (item: any) => {
        setCurrent(item);
        setIsEditing(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('هل أنت متأكد من الحذف؟')) {
            try {
                // @ts-ignore
                if (window.electronAPI && tableName) {
                    // @ts-ignore
                    await window.electronAPI.crudOperation({ operation: 'DELETE', table: tableName, id });
                    loadData();
                } else {
                    setData(data.filter(item => item.id !== id));
                }
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const filteredData = data.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
        )
    );

    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                {icon || <FileText className="text-gray-600" />} {title}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
                    <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">
                        {isEditing ? 'تعديل سجل' : 'إضافة سجل جديد'}
                    </h2>
                    <div className="space-y-4">
                        {columns.map(col => (
                            <div key={col.key}>
                                <label className="block text-sm text-gray-600 mb-1">{col.label}</label>
                                {col.type === 'boolean' ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-emerald-600 rounded"
                                            checked={current[col.key] === 1 || current[col.key] === true}
                                            onChange={e => setCurrent({ ...current, [col.key]: e.target.checked ? 1 : 0 })}
                                        />
                                        <span className="text-sm text-gray-500">فعال</span>
                                    </div>
                                ) : (
                                    <input
                                        type={col.type || 'text'}
                                        className="w-full p-2 border rounded"
                                        value={current[col.key] || ''}
                                        onChange={e => setCurrent({ ...current, [col.key]: e.target.value })}
                                    />
                                )}
                            </div>
                        ))}

                        <div className="flex gap-2 mt-4">
                            <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 flex justify-center items-center gap-2">
                                <Save size={18} /> حفظ
                            </button>
                            {isEditing && (
                                <button onClick={() => { setIsEditing(false); setCurrent({}); }} className="bg-gray-200 text-gray-700 px-4 rounded hover:bg-gray-300">
                                    إلغاء
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="relative w-64">
                            <input
                                className="w-full p-2 pr-8 border rounded text-sm"
                                placeholder="بحث..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <Search size={16} className="absolute top-3 right-2 text-gray-400" />
                        </div>
                        <div className="text-sm text-gray-500 font-bold">
                            العدد: {filteredData.length}
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[600px]">
                        <table className="w-full text-right">
                            <thead className="bg-gray-100 text-gray-600 font-bold border-b sticky top-0">
                                <tr>
                                    {columns.map(col => (
                                        <th key={col.key} className="p-4">{col.label}</th>
                                    ))}
                                    <th className="p-4 w-24">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={columns.length + 1} className="p-8 text-center text-gray-500">جاري التحميل...</td></tr>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map(item => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                                            {columns.map(col => (
                                                <td key={col.key} className="p-4">
                                                    {col.type === 'boolean' ? (
                                                        (item[col.key] === 1 || item[col.key] === true) ?
                                                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">نعم</span> :
                                                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">لا</span>
                                                    ) : (
                                                        item[col.key]
                                                    )}
                                                </td>
                                            ))}
                                            <td className="p-4 flex gap-2">
                                                <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length + 1} className="p-8 text-center text-gray-400">
                                            لا توجد بيانات
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
