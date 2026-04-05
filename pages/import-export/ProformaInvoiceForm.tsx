import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Save, ArrowLeft, Plus, Trash } from 'lucide-react';
import { ProformaInvoice, ProformaInvoiceLine } from '../../types';
import { useTabs } from '../../src/contexts/TabsContext';

export const ProformaInvoiceForm: React.FC = () => {
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const { id } = useParams();
    const isNew = id === 'new' || !id;

    const [header, setHeader] = useState<Partial<ProformaInvoice>>({
        proforma_no: '',
        date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        currency_id: 'USD',
        exchange_rate: 1
    });
    const [lines, setLines] = useState<Partial<ProformaInvoiceLine>[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        // Load Suppliers
        try {
            const partners = await window.electronAPI.partner.getPartners('SUPPLIER');
            setSuppliers(partners);

            if (!isNew && id) {
                const data = await window.electronAPI.import.getProforma(id);
                if (data) {
                    setHeader(data);
                    setLines(data.lines || []);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (!header.supplier_id || !header.proforma_no) {
            alert('الرجاء تعبئة اسم المورد ورقم الفاتورة');
            return;
        }

        const data = { header, lines };
        try {
            const result = await window.electronAPI.import.saveProforma(data);
            if (result.success) {
                navigateInTab('/import/dashboard', 'لوحة الاستيراد');
            }
        } catch (e) {
            alert('حدث خطأ أثناء حفظ الفاتورة');
        }
    };

    const addLine = () => {
        setLines([...lines, {
            id: crypto.randomUUID(),
            description: '',
            quantity: 1,
            unit_price: 0,
            total_price: 0
        }]);
    };

    const updateLine = (index: number, field: keyof ProformaInvoiceLine, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };

        // Auto-calc total
        if (field === 'quantity' || field === 'unit_price') {
            const qty = field === 'quantity' ? Number(value) : newLines[index].quantity || 0;
            const price = field === 'unit_price' ? Number(value) : newLines[index].unit_price || 0;
            newLines[index].total_price = qty * price;
        }

        setLines(newLines);
    };

    const removeLine = (index: number) => {
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
    };

    const totalAmount = lines.reduce((sum, line) => sum + (line.total_price || 0), 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigateInTab('/import/dashboard', 'لوحة الاستيراد')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">{isNew ? 'فاتورة مبدئية جديدة' : `تعديل فاتورة ${header.proforma_no}`}</h1>
                </div>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 font-bold"
                >
                    <Save size={18} /> حفظ الفاتورة
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>تفاصيل الفاتورة</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">رقم الفاتورة</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
                                value={header.proforma_no}
                                onChange={e => setHeader({ ...header, proforma_no: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">المورد</label>
                            <select
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
                                value={header.supplier_id || ''}
                                onChange={e => setHeader({ ...header, supplier_id: e.target.value })}
                            >
                                <option value="">اختر المورد</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name_ar} - {s.code}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">التاريخ</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
                                value={header.date}
                                onChange={e => setHeader({ ...header, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">العملة</label>
                            <select
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
                                value={header.currency_id}
                                onChange={e => setHeader({ ...header, currency_id: e.target.value })}
                            >
                                <option value="USD">دولار أمريكي (USD)</option>
                                <option value="EUR">يورو (EUR)</option>
                                <option value="ILS">شيكل (ILS)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">سعر الصرف</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
                                value={header.exchange_rate}
                                onChange={e => setHeader({ ...header, exchange_rate: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">تاريخ الانتهاء</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none transition-shadow"
                                value={header.expiry_date || ''}
                                onChange={e => setHeader({ ...header, expiry_date: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>الأصناف والبنود</CardTitle>
                    <button onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-bold">
                        <Plus size={16} /> إضافة بند جديد
                    </button>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-gray-50 text-sm text-gray-600 border-b border-gray-200">
                                <th className="p-3 font-bold">الصنف / البيان</th>
                                <th className="p-3 w-24 font-bold">الكمية</th>
                                <th className="p-3 w-32 font-bold">السعر</th>
                                <th className="p-3 w-32 font-bold">المجموع</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lines.map((line, index) => (
                                <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 outline-none"
                                            placeholder="اسم الصنف أو الوصف"
                                            value={line.description || line.item_name || ''}
                                            onChange={e => updateLine(index, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 outline-none"
                                            value={line.quantity}
                                            onChange={e => updateLine(index, 'quantity', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 outline-none"
                                            value={line.unit_price}
                                            onChange={e => updateLine(index, 'unit_price', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-2 font-bold text-gray-700">
                                        {line.total_price?.toLocaleString()}
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeLine(index)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50">
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {lines.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400">
                                        لا توجد أصناف مضافة. اضغط على "إضافة بند جديد" للبدء.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 font-bold border-t border-gray-200">
                                <td colSpan={3} className="p-3 pl-6">المجموع الكلي ({header.currency_id}):</td>
                                <td className="p-3 text-blue-700 text-lg">{totalAmount.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};
