import React, { useState, useEffect } from 'react';
import { User, Plus, Edit, Save, Trash, Phone, Mail, Briefcase } from 'lucide-react';

export const Employees = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        position: '',
        department: '',
        basic_salary: 0,
        phone: '',
        email: '',
        join_date: new Date().toISOString().split('T')[0],
        status: 'Active'
    });

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const data = await window.electronAPI.getEmployees();
                setEmployees(data || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.basic_salary) {
            alert("الرجاء إدخال الاسم والراتب الأساسي");
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.saveEmployee(formData);
            alert("تم حفظ بيانات الموظف بنجاح");
            setIsEditing(false);
            setFormData({
                id: '', name: '', position: '', department: '', basic_salary: 0,
                phone: '', email: '', join_date: new Date().toISOString().split('T')[0], status: 'Active'
            });
            loadEmployees();
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    };

    const handleEdit = (emp: any) => {
        setFormData(emp);
        setIsEditing(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans" dir="rtl">
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <User className="text-blue-600" /> إدارة الموظفين
                </h1>
                <button
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> موظف جديد
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex gap-6">

                {/* List */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? <div className="text-center w-full col-span-3">جاري التحميل...</div> : employees.map(emp => (
                        <div key={emp.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-full -mr-8 -mt-8"></div>

                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                                    <User size={24} />
                                </div>
                                <button onClick={() => handleEdit(emp)} className="text-slate-400 hover:text-blue-600 p-1">
                                    <Edit size={18} />
                                </button>
                            </div>

                            <h3 className="font-bold text-lg text-slate-800 mb-1">{emp.name}</h3>
                            <div className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                                <Briefcase size={14} /> {emp.position}
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 border-t pt-3">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" /> {emp.phone || '-'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" /> {emp.email || '-'}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 flex justify-between items-center border-t border-dashed">
                                <span className="text-xs text-slate-400">الراتب الأساسي</span>
                                <span className="font-bold font-mono text-emerald-600 text-lg">{Number(emp.basic_salary).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Form Sidebar */}
                {isEditing && (
                    <div className="w-96 bg-white border-l border-slate-200 shadow-xl fixed inset-y-0 left-0 z-50 p-6 overflow-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold">{formData.id ? 'تعديل موظف' : 'موظف جديد'}</h2>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500 font-bold">إغلاق</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">الاسم الكامل</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded p-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">المسمى الوظيفي</label>
                                    <input type="text" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">القسم</label>
                                    <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full border rounded p-2" />
                                </div>
                            </div>

                            <hr className="my-2" />

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">الراتب الأساسي</label>
                                <input type="number" value={formData.basic_salary} onChange={e => setFormData({ ...formData, basic_salary: Number(e.target.value) })} className="w-full border rounded p-2 font-mono font-bold" />
                            </div>

                            <hr className="my-2" />

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">تاريخ التعيين</label>
                                <input type="date" value={formData.join_date} onChange={e => setFormData({ ...formData, join_date: e.target.value })} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">رقم الهاتف</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">البريد الإلكتروني</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded p-2" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">الحالة</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border rounded p-2">
                                    <option value="Active">على رأس عمله (Active)</option>
                                    <option value="Terminated">منهي خدماته (Terminated)</option>
                                </select>
                            </div>

                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-4 shadow hover:bg-blue-700 transition">
                                保存 (Save)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
