import React, { useState, useEffect } from 'react';
import { FileText, Printer, Search, Download } from 'lucide-react';

export const Payslips = () => {
    const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() }); // Default fast month? Logic says current month usually not ready, maybe previous?
    // Let's stick to current for selection default.
    const [slips, setSlips] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSlips();
    }, [period]);

    const loadSlips = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getSlips(period);
            setSlips(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (slip: any) => {
        // Simple print for now. Ideally fetch slip details and open new window or specialized print component.
        // We can use a dirty trick: Open a new window with slip HTML.
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html dir="rtl">
                <head>
                    <title>Payslip - ${slip.employee_name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .info { margin-bottom: 20px; display: flex; justify-content: space-between; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: right; }
                        .net { font-size: 20px; font-weight: bold; text-align: center; border: 2px solid #333; padding: 10px; background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>قسيمة راتب / Payslip</h2>
                        <p>${period.month} / ${period.year}</p>
                    </div>
                    <div class="info">
                        <div>
                            <strong>الموظف:</strong> ${slip.employee_name}<br>
                            <strong>الرقم الوظيفي:</strong> '${slip.employee_code}'
                        </div>
                        <div>
                            <strong>القسم:</strong> ${slip.department_name || '-'}<br>
                            <strong>المسمى الوظيفي:</strong> ${slip.job_title || '-'}
                        </div>
                    </div>

                    <table class="table">
                        <tr>
                            <th>البيان</th>
                            <th>المبلغ</th>
                        </tr>
                        <tr>
                            <td>الراتب الأساسي</td>
                            <td>${slip.basic_salary.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>البدلات</td>
                            <td>${slip.total_allowances.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>العمل الإضافي</td>
                            <td>${slip.overtime_amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="color: red;">الخصومات (غياب/سلف/جزاءات)</td>
                            <td style="color: red;">-${(slip.absent_days_deduction + slip.advance_deduction + slip.penalty_deduction).toFixed(2)}</td>
                        </tr>
                    </table>

                    <div class="net">
                        الصافي للدفع: ${slip.net_salary.toFixed(2)} ILS
                    </div>
                    
                    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                        <div>توقيع الموظف</div>
                        <div>ختم الشركة</div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="app-page" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> أرشيف الرواتب والقسائم
                    </h1>
                    <p className="text-gray-500 text-sm">استعراض وطباعة قسائم الرواتب الشهرية</p>
                </div>

                <div className="flex bg-white p-2 rounded-xl shadow-sm border gap-2">
                    <select className="border-none outline-none font-bold text-gray-700 bg-transparent" value={period.month} onChange={e => setPeriod({ ...period, month: +e.target.value })}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })}</option>
                        ))}
                    </select>
                    <input type="number" className="w-20 border rounded px-2" value={period.year} onChange={e => setPeriod({ ...period, year: +e.target.value })} />
                    <button onClick={loadSlips} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Search size={18} /></button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">جاري التحميل...</div>
            ) : slips.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-gray-500 font-bold">لا توجد سجلات لهذه الفترة</h3>
                    <p className="text-gray-400 text-sm">تأكد من اختيار الشهر الصحيح أو قم بإنشاء مسير الرواتب أولاً</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slips.map(slip => (
                        <PayslipCard key={slip.id} slip={slip} onPrint={() => handlePrint(slip)} />
                    ))}
                </div>
            )}
        </div>
    );
};

const PayslipCard = ({ slip, onPrint }: any) => {
    const deductions = slip.absent_days_deduction + slip.advance_deduction + slip.penalty_deduction;
    return (
        <div className="card overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <div>
                    <div className="font-bold text-gray-800">{slip.employee_name}</div>
                    <div className="text-xs text-gray-500">{slip.job_title}</div>
                </div>
                <div className="bg-white px-2 py-1 rounded text-xs font-mono border">{slip.employee_code}</div>
            </div>
            <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center border-b border-dashed pb-2">
                    <span className="text-gray-500">الراتب + البدلات</span>
                    <span className="font-bold">{(slip.basic_salary + slip.total_allowances).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed pb-2">
                    <span className="text-gray-500">العمل الإضافي</span>
                    <span className="font-bold text-green-600">+{slip.overtime_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed pb-2 text-red-600">
                    <span>إجمالي الخصومات</span>
                    <span className="font-bold">-{deductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 bg-blue-50 p-2 rounded-lg mt-2">
                    <span className="font-bold text-blue-900">الصافي</span>
                    <span className="font-bold text-lg text-blue-700">{slip.net_salary.toFixed(2)}</span>
                </div>
            </div>
            <div className="p-3 border-t flex justify-end">
                <button onClick={onPrint} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-sm font-bold">
                    <Printer size={16} /> طباعة القسيمة
                </button>
            </div>
        </div>
    )
}

