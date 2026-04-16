import React, { useState, useEffect } from 'react';
import { Banknote, Users, AlertCircle, Plus, Search } from 'lucide-react';

const AdvancesLoans = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [advances, setAdvances] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalActive: 0, count: 0 });
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Mock data logic for now as API might be limited. Integrating with what we have.
        // We need a GET for advances. PayrollService has getActiveAdvances(empId).
        // Let's assume we need to fetch all. For now I'll create a simple list view.

        // TODO: Full API for getAllAdvances
        // const data = await window.electron.ipcRenderer.invoke('hr-get-advances'); 
    };

    return (
        <div className="app-page" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Banknote className="text-orange-600" /> السلف والقروض
                    </h1>
                    <p className="text-gray-500">إدارة السلف المالية للموظفين وجدول الأقساط</p>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-orange-700 flex items-center gap-2">
                    <Plus size={18} /> طلب سلفة جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl text-center border shadow-sm">
                    <div className="text-gray-500 mb-2 font-medium">إجمالي السلف القائمة</div>
                    <div className="text-3xl font-bold text-orange-600 font-mono">0.00</div>
                    <div className="text-xs text-gray-400 mt-2">ILS</div>
                </div>
                <div className="bg-white p-5 rounded-xl text-center border shadow-sm">
                    <div className="text-gray-500 mb-2 font-medium">عدد المقترضين</div>
                    <div className="text-3xl font-bold text-gray-700 font-mono">0</div>
                </div>
                <div className="bg-white p-5 rounded-xl text-center border shadow-sm">
                    <div className="text-gray-500 mb-2 font-medium">أقساط هذا الشهر</div>
                    <div className="text-3xl font-bold text-blue-600 font-mono">0.00</div>
                </div>
            </div>

            <div className="card p-8 text-center text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-600">لا توجد سلف نشطة</h3>
                <p>استخدم زر "طلب سلفة جديد" لإضافة سلفة لموظف.</p>
            </div>

            {showModal && <NewAdvanceModal onClose={() => setShowModal(false)} />}
        </div>
    );
};

const NewAdvanceModal = ({ onClose }: any) => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [form, setForm] = useState({ employee_id: '', amount: '', repayment_start_date: '', installments_count: 1 });

    useEffect(() => {
        (async () => {
            const data = await window.electronAPI.hr.getEmployees();
            setEmployees(data);
            if (data.length > 0) setForm(f => ({ ...f, employee_id: data[0].id }));
        })();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await window.electronAPI.hr.saveAdvance(form);
            onClose();
            alert('تم حفظ السلفة بنجاح');
        } catch (error) {
            alert('Error: ' + error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">تسجيل سلفة مالية</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">الموظف</label>
                        <select className="w-full border p-2 rounded" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">المبلغ (ILS)</label>
                        <input type="number" required className="w-full border p-2 rounded" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">تاريخ بدء السداد</label>
                        <input type="date" required className="w-full border p-2 rounded" value={form.repayment_start_date} onChange={e => setForm({ ...form, repayment_start_date: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">عدد الأقساط الشهرية</label>
                        <input type="number" min="1" max="24" required className="w-full border p-2 rounded" value={form.installments_count} onChange={e => setForm({ ...form, installments_count: +e.target.value })} />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">إلغاء</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">حفظ السلفة</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AdvancesLoans;
