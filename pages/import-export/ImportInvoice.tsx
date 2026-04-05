import React, { useState, useEffect } from 'react';
import { Save, User, ShoppingCart, Calendar, Plus, Trash2, ArrowRight, Printer, Calculator, Ship } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ImportInvoice = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [header, setHeader] = useState({
        supplier_id: '',
        branch_id: '',
        warehouse_id: '',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        invoice_no: 'NEW',
        vendor_invoice_no: '',
        currency_id: 'USD', // Imports usually USD/EUR
        exchange_rate: 1,
        shipment_id: '', // Usage: Filtered by this
    });

    const [lines, setLines] = useState<any[]>([
        { id: 1, item_id: '', quantity: 1, unit_id: '', unit_price: 0, tax_amount: 0, total: 0 }
    ]);

    // Master Data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);

    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        try {
            const [supp, wh, itm, unt, curr, nextNo, shps] = await Promise.all([
                window.electronAPI.partner.getPartners('SUPPLIER'),
                window.electronAPI.getWarehouses(),
                window.electronAPI.inventory.getItems(),
                window.electronAPI.inventory.getUnits(),
                window.electronAPI.currency.getCurrencies(),
                window.electronAPI.purchase.getNextInvoiceNo ? window.electronAPI.purchase.getNextInvoiceNo() : Promise.resolve('NEW'),
                window.electronAPI.import.getShipments({ status: 'Open' })
            ]);
            setSuppliers(supp);
            setWarehouses(wh);
            setItems(itm);
            setUnits(unt);
            setCurrencies(curr);
            setShipments(shps || []);

            // Set defaults
            if (wh.length > 0) setHeader(h => ({ ...h, warehouse_id: wh[0].id, branch_id: wh[0].id, invoice_no: nextNo }));

            // Set first currency (likely USD if available, else first)
            const usd = curr.find((c: any) => c.code === 'USD');
            if (usd) setHeader(h => ({ ...h, currency_id: usd.id, exchange_rate: usd.exchange_rate }));

        } catch (error) {
            console.error("Failed to load master data", error);
        }
    };

    // When Link Shipment Selected -> Auto-fill Supplier?
    const handleShipmentChange = (shipmentId: string) => {
        const shipment = shipments.find(s => s.id === shipmentId);
        if (shipment) {
            setHeader(h => ({
                ...h,
                shipment_id: shipmentId,
                supplier_id: shipment.supplier_id || h.supplier_id, // Auto-select supplier if linked
                notes: `Linked to Shipment #${shipment.shipment_no}`
            }));
        } else {
            setHeader(h => ({ ...h, shipment_id: shipmentId }));
        }
    }

    // --- Calculations ---
    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.unit_price = item.cost_price || 0;
                line.unit_id = item.base_unit_id;
                line.description = item.name_ar;
            }
        }

        line.total = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
        newLines[index] = line;
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { id: Date.now(), item_id: '', quantity: 1, unit_id: '', unit_price: 0, tax_amount: 0, total: 0 }]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        const subtotal = lines.reduce((sum, l) => sum + (l.total || 0), 0);
        // Imports often have 0 VAT on Invoice (VAT paid at customs). 
        // We'll keep VAT logic but default to 0 if tax_amount not set manually or by item logic. 
        // For now, lines have default 0 tax.
        const taxTotal = lines.reduce((sum, l) => sum + (Number(l.tax_amount) || 0), 0);
        const grandTotal = subtotal + taxTotal;
        return { subtotal, taxTotal, grandTotal };
    };

    const { subtotal, taxTotal, grandTotal } = calculateTotals();

    const handleSave = async (print: boolean = false) => {
        if (!header.shipment_id) {
            if (!confirm('لم يتم اختيار ملف استيراد. هل تريد المتابعة كفاتورة مشتريات عادية؟')) return;
        }

        if (!header.supplier_id || lines.length === 0) {
            alert('الرجاء إدخال البيانات الأساسية (المورد والأصناف)');
            return;
        }

        setLoading(true);
        try {
            const invoiceData = {
                header: {
                    ...header,
                    subtotal,
                    tax_total: taxTotal,
                    grand_total: grandTotal,
                    // Ensure clearing flags are off
                    is_clearing_invoice: 0
                },
                lines: lines
            };

            const result = await window.electronAPI.purchase.createInvoice(invoiceData);
            if (result.success) {
                alert(`تم حفظ فاتورة الاستيراد بنجاح رقم ${result.invoice_no}`);
                navigate('/import/shipments');
            }
        } catch (error: any) {
            console.error(error);
            alert('فشلت العملية: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Ship className="w-6 h-6 text-blue-600" />
                            فاتورة استيراد (خارجية)
                        </h1>
                        <span className="text-sm text-slate-500 font-mono mt-1 block">
                            Import Invoice #{header.invoice_no}
                        </span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                    >
                        {loading ? 'جاري الحفظ...' : (
                            <>
                                <Save className="w-5 h-5" />
                                حفظ الفاتورة
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content */}
                <div className="col-span-9 space-y-6">
                    {/* Shipment & Supplier Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
                            <label className="block text-sm font-bold text-blue-800 mb-2">اختر ملف الاستيراد (الشحنة)</label>
                            <select
                                className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={header.shipment_id}
                                onChange={(e) => handleShipmentChange(e.target.value)}
                            >
                                <option value="">-- اختر ملف الشحنة --</option>
                                {shipments.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.shipment_no} - {s.supplier_name} ({s.status})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">المورد</label>
                                <select
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                    value={header.supplier_id}
                                    onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })}
                                >
                                    <option value="">اختر المورد...</option>
                                    {suppliers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">رقم الفاتورة (للمورد)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                    value={header.vendor_invoice_no}
                                    onChange={(e) => setHeader({ ...header, vendor_invoice_no: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">العملة</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-2/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                        value={header.currency_id}
                                        onChange={(e) => {
                                            const curr = currencies.find(c => c.id === e.target.value);
                                            setHeader({ ...header, currency_id: e.target.value, exchange_rate: curr?.exchange_rate || 1 });
                                        }}
                                    >
                                        {currencies.map(c => (
                                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center"
                                        value={header.exchange_rate}
                                        onChange={(e) => setHeader({ ...header, exchange_rate: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-600 font-bold text-sm border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center">#</th>
                                    <th className="px-4 py-3">الصنف</th>
                                    <th className="px-4 py-3 w-24 text-center">الكمية</th>
                                    <th className="px-4 py-3 w-32 text-center">السعر ({currencies.find(c => c.id === header.currency_id)?.code})</th>
                                    <th className="px-4 py-3 w-32 text-center">الإجمالي</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lines.map((line, index) => (
                                    <tr key={line.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-4 py-2 text-center text-slate-400 font-mono text-xs">{index + 1}</td>
                                        <td className="px-4 py-2">
                                            <select
                                                className="w-full bg-transparent border-none outline-none font-medium text-slate-800"
                                                value={line.item_id}
                                                onChange={(e) => updateLine(index, 'item_id', e.target.value)}
                                            >
                                                <option value="" disabled>اختر الصنف...</option>
                                                {items.map(i => (
                                                    <option key={i.id} value={i.id}>{i.code} - {i.name_ar}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full bg-transparent border-none text-center outline-none font-mono text-slate-600"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value))}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900">
                                            {line.total.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button onClick={() => removeLine(index)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={6} className="px-4 py-2">
                                        <button onClick={addLine} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm w-full">
                                            <Plus className="w-4 h-4" /> إضافة صنف
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="col-span-3 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-slate-500" />
                            ملخص
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>المجموع</span>
                                <span className="font-mono">{grandTotal.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-4 text-center">
                                سيتم ترحيل الفاتورة للمورد وتحديث المخزون (وارد).
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportInvoice;
