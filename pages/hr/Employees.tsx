import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, DollarSign } from 'lucide-react';

const Employees = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        employee_code: '',
        first_name: '',
        last_name: '',
        position: '',
        department: '',
        branch_id: '',
        basic_salary: 0,
        currency_id: 'ILS',
        status: 'ACTIVE',
        join_date: new Date().toISOString().split('T')[0]
    });

    const [branches, setBranches] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const emps = await window.electronAPI.getEmployees();
            setEmployees(emps);

            const brs = await window.electronAPI.branch.getBranches();
            setBranches(brs);

            const curs = await window.electronAPI.currency.getCurrencies();
            setCurrencies(curs);

        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        try {
            await window.electronAPI.saveEmployee({ ...formData, id: currentEmployee?.id });
            setIsDialogOpen(false);
            loadData();
            resetForm();
        } catch (error) {
            console.error("Failed to save employee", error);
        }
    };

    const resetForm = () => {
        setCurrentEmployee(null);
        setFormData({
            employee_code: '',
            first_name: '',
            last_name: '',
            position: '',
            department: '',
            branch_id: '',
            basic_salary: 0,
            currency_id: 'ILS',
            status: 'ACTIVE',
            join_date: new Date().toISOString().split('T')[0]
        });
    };

    const handleEdit = (emp: any) => {
        setCurrentEmployee(emp);
        setFormData({
            employee_code: emp.employee_code,
            first_name: emp.first_name,
            last_name: emp.last_name,
            position: emp.position,
            department: emp.department,
            branch_id: emp.branch_id,
            basic_salary: emp.basic_salary,
            currency_id: emp.currency_id,
            status: emp.status,
            join_date: emp.join_date
        });
        setIsDialogOpen(true);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الموظفين</h1>
                    <p className="text-gray-500">إدارة ملفات الموظفين والرواتب</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsDialogOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    موظف جديد
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg w-fit border border-gray-200">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            placeholder="بحث بالاسم أو الكود..."
                            className="bg-transparent border-none focus:outline-none w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="p-4 rounded-tr-lg">الكود</th>
                                <th className="p-4">الاسم الكامل</th>
                                <th className="p-4">المنصب / القسم</th>
                                <th className="p-4">الراتب الأساسي</th>
                                <th className="p-4">الفرع</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4 rounded-tl-lg">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.filter(e =>
                                e.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                e.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((emp) => (
                                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="p-4 font-mono font-medium text-gray-700">{emp.employee_code}</td>
                                    <td className="p-4">{emp.first_name} {emp.last_name}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{emp.position}</span>
                                            <span className="text-xs text-gray-400">{emp.department}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                            {emp.basic_salary.toLocaleString()}
                                            <span className="text-xs text-gray-400 font-normal">{emp.currency_symbol || emp.currency_id}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{emp.branch_name || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {emp.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden" dir="rtl">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{currentEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}</h2>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">كود الموظف</label>
                                <input className="w-full p-2 border rounded-md" value={formData.employee_code} onChange={e => setFormData({ ...formData, employee_code: e.target.value })} placeholder="EMP-001" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">الفرع</label>
                                <select className="w-full p-2 border rounded-md" value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })}>
                                    <option value="">اختر الفرع</option>
                                    {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">الاسم الأول</label>
                                <input className="w-full p-2 border rounded-md" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">الاسم الأخير</label>
                                <input className="w-full p-2 border rounded-md" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">المسمى الوظيفي</label>
                                <input className="w-full p-2 border rounded-md" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">القسم</label>
                                <input className="w-full p-2 border rounded-md" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">الراتب الأساسي</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input type="number" className="w-full p-2 pl-9 border rounded-md" value={formData.basic_salary} onChange={e => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">العملة</label>
                                <select className="w-full p-2 border rounded-md" value={formData.currency_id} onChange={e => setFormData({ ...formData, currency_id: e.target.value })}>
                                    {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">تاريخ الانضمام</label>
                                <input type="date" className="w-full p-2 border rounded-md" value={formData.join_date} onChange={e => setFormData({ ...formData, join_date: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">الحالة</label>
                                <select className="w-full p-2 border rounded-md" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="ACTIVE">نشط</option>
                                    <option value="RESIGNED">مستقيل</option>
                                    <option value="TERMINATED">منهي خدماته</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
                            <button onClick={() => setIsDialogOpen(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100">إلغاء</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium">حفظ الموظف</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
