
import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Calendar, User, Save, CheckCircle } from 'lucide-react';

const CommissionCalculation = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // List of sales reps (employees with Commission/Mixed salary type)
    const [salesReps, setSalesReps] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSalesReps();
    }, []);

    // Load existing commissions when period changes
    useEffect(() => {
        loadCommissions();
    }, [month, year]);

    const loadSalesReps = async () => {
        try {
            const allEmps = await window.electronAPI.hr.getEmployees();
            // Filter: Must be 'COMMISSION' or 'MIXED'
            const reps = allEmps.filter((e: any) =>
                e.contract?.salary_type === 'COMMISSION' || e.contract?.salary_type === 'MIXED'
            );
            setSalesReps(reps);
        } catch (err) { console.error(err); }
    };

    const loadCommissions = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.commission.get(month, year);
            setCommissions(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const calculate = async () => {
        setLoading(true);
        try {
            // For each rep, we would theoretically fetch their sales total.
            // Since we just added sales_rep_id, existing invoices won't have it.
            // This is a simulation based on contract rate.
            // In a real scenario, we'd query: SELECT SUM(grand_total) FROM sales_invoices WHERE sales_rep_id = ? AND date BETWEEN ? AND ?

            const newCommissions = salesReps.map(rep => {
                // Check if already exists/approved
                const existing = commissions.find(c => c.employee_id === rep.id);
                if (existing && existing.status === 'APPROVED') return existing;

                const rate = rep.contract?.commission_rate || 0; // percentage e.g. 2

                // MOCK SALES DATA (Replace with API call: window.electronAPI.sales.getRepTotal(rep.id, month, year))
                // For now we will assume 0 or random for demo if no data
                const mockTotalSales = 0; // TODO: Implement getRepTotal

                const amount = mockTotalSales * (rate / 100);

                return {
                    id: existing?.id,
                    employee_id: rep.id,
                    employee_name: `${rep.first_name} ${rep.last_name}`,
                    period_start: `${year}-${String(month).padStart(2, '0')}-01`,
                    period_end: `${year}-${String(month).padStart(2, '0')}-28`, // Approximate
                    total_sales: mockTotalSales,
                    commission_rate: rate,
                    commission_amount: amount,
                    status: 'PENDING'
                };
            });

            setCommissions(newCommissions);

        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Helper to manually edit sales/amount before approval
    const updateAmount = (index: number, field: string, value: number) => {
        const updated = [...commissions];
        updated[index] = { ...updated[index], [field]: value };
        // Recalculate amount if sales changed
        if (field === 'total_sales') {
            updated[index].commission_amount = value * (updated[index].commission_rate / 100);
        }
        setCommissions(updated);
    };

    const save = async () => {
        try {
            await window.electronAPI.commission.save(commissions);
            alert('تم حفظ العمولات بنجاح');
            loadCommissions();
        } catch (err: any) {
            alert('خطأ: ' + err.message);
        }
    };

    return (
        <div className="app-page" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600"><DollarSign size={24} /></div>
                    <h1 className="text-2xl font-bold text-gray-800">احتساب عمولات المبيعات</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="outline-none bg-transparent font-medium">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <span className="text-gray-400">/</span>
                        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="outline-none bg-transparent font-medium">
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>

                    <button
                        onClick={calculate}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Calculator size={18} />
                        <span>احتساب (جلب المبيعات)</span>
                    </button>

                    <button
                        onClick={save}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <Save size={18} />
                        <span>اعتماد وحفظ</span>
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                            <th className="p-4">المندوب</th>
                            <th className="p-4">إجمالي المبيعات</th>
                            <th className="p-4">نسبة العمولة %</th>
                            <th className="p-4">قيمة العمولة</th>
                            <th className="p-4">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {commissions.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">اضغط "احتساب" لجلب البيانات</td></tr>
                        ) : (
                            commissions.map((comm, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{comm.employee_name || 'موظف ' + comm.employee_id}</td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            value={comm.total_sales || 0}
                                            onChange={e => updateAmount(idx, 'total_sales', parseFloat(e.target.value))}
                                            className="w-32 p-1 border rounded text-center focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                            {comm.commission_rate}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-green-600 font-bold text-lg">
                                        {comm.commission_amount?.toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${comm.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {comm.status === 'APPROVED' ? 'معتمد' : 'معلق'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                ملاحظة: النظام يجلب المبيعات المرتبطة بالمندوب تلقائياً. يمكنك تعديل "إجمالي المبيعات" يدوياً إذا لزم الأمر قبل الحفظ.
            </div>
        </div>
    );
};

export default CommissionCalculation;

