import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, User, Search, ShoppingCart, Printer } from 'lucide-react';
import { useHotkeys } from '../src/hooks/useHotkeys';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const SalesInvoice = () => {
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [savedId, setSavedId] = useState<string | null>(null);

    // رأس الفاتورة
    const [header, setHeader] = useState({
        ref_no: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        warehouse_id: '', // New Field
        customerName: '',
        notes: ''
    });
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // جدول الأصناف
    const [rows, setRows] = useState<any[]>([
        { id: 1, barcode: '', productId: '', name: '', quantity: 1, price: 0, total: 0, cost: 0 }
    ]);

    // لتحسين تجربة الباركود
    const lastRowRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        initPage();
    }, []);

    const initPage = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // Fetch Accounts (Customers) - Filter by Type 'Asset' & Code starts with '11' or specific Customer parent
            // Ideally we need getCustomers() or filter getAccounts. Assuming getAccounts returns all for now.
            // @ts-ignore
            const accs = await window.electronAPI.getAccounts();
            // Filter logic: Assets -> Receivables (or user definition). For prototype: All Assets.
            setCustomers(accs?.filter((a: any) => a.type === 'Asset' || a.account_type === 'Customer') || []);

            // Fetch Warehouses
            // @ts-ignore
            const whs = await window.electronAPI.getWarehouses();
            // Default to first active warehouse
            if (whs && whs.length > 0) {
                const defaultWh = whs.find((w: any) => w.is_active);
                if (defaultWh) setHeader(h => ({ ...h, warehouse_id: defaultWh.id }));
            }

            // Next Invoice No
            // @ts-ignore
            const next = await window.electronAPI.getNextInvoiceNo();
            setHeader(h => ({ ...h, ref_no: next }));

            // Check for Quotation conversion
            const quotationId = searchParams.get('quotation_id');
            if (quotationId) {
                try {
                    // @ts-ignore
                    const q = await window.electronAPI.sales.getQuotation(quotationId);
                    if (q) {
                        // Map Quotation to Invoice
                        setHeader(h => ({
                            ...h,
                            customerId: q.header.customer_id,
                            notes: `Converted from Quotation #${q.header.quotation_no}`,
                            warehouse_id: q.header.warehouse_id || h.warehouse_id
                        }));

                        if (q.lines && q.lines.length > 0) {
                            setRows(q.lines.map((l: any, i: number) => ({
                                id: i + 1,
                                barcode: l.item_code || '',
                                productId: l.item_id,
                                name: l.item_name || '',
                                quantity: l.quantity,
                                price: l.unit_price,
                                total: l.quantity * l.unit_price,
                                cost: 0 // Fetch detailed cost if needed
                            })));
                        }
                    }
                } catch (err) {
                    console.error("Error loading quotation", err);
                }
            }
        }
    };

    // معالجة البحث عن صنف بالباركود
    const handleBarcode = async (rowId: number, barcode: string) => {
        // تحديث الباركود في الستيت
        updateRow(rowId, 'barcode', barcode);

        // إذا ضغط إنتر أو خرج من الحقل وكان هناك قيمة
        if (barcode.length > 2) { // لنفترض أن الباركود أطول من 2
            // @ts-ignore
            const items = await window.electronAPI.getItems(); // Fetch all items for now
            const product = items.find((p: any) => p.code === barcode || p.name_ar.includes(barcode) || p.name_en.includes(barcode));

            if (product) {
                setRows(prev => prev.map(r => {
                    if (r.id === rowId) {
                        return {
                            ...r,
                            productId: product.id,
                            name: product.name_ar || product.name_en,
                            price: product.sell_price || 100, // Fallback if no price in Item Master yet
                            cost: product.avg_cost || 0,
                            total: (product.sell_price || 100) * r.quantity
                        };
                    }
                    return r;
                }));
                // نقل التركيز للكمية (يمكن تحسينه برمجياً)
            }
        }
    };

    const updateRow = (id: number, field: string, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                const updated = { ...r, [field]: value };
                // إعادة حساب الإجمالي
                if (field === 'quantity' || field === 'price') {
                    updated.total = Number(updated.quantity) * Number(updated.price);
                }
                return updated;
            }
            return r;
        }));
    };

    const addRow = () => {
        setRows([...rows, { id: rows.length + 1, barcode: '', productId: '', name: '', quantity: 1, price: 0, total: 0, cost: 0 }]);
    };

    // Keyboard Shortcuts
    useHotkeys('F10', () => handleSave());
    useHotkeys('F4', () => addRow());

    const handleSave = async () => {
        if (!header.customerId || rows.filter(r => r.productId).length === 0) {
            alert("الرجاء اختيار عميل وإضافة أصناف");
            return;
        }

        try {
            setLoading(true);
            // @ts-ignore
            await window.electronAPI.saveInvoice({
                header: {
                    ref_no: header.ref_no,
                    date: header.date,
                    description: header.notes || 'فاتورة مبيعات'
                },
                customerId: header.customerId,
                totalAmount: grandTotal,
                items: rows.filter(r => r.productId)
            });

            alert("تم حفظ الفاتورة وتحديث المخزون!");

            // Set saved ID to enable print
            // ideally backend returns ID. Let's assume user stays on page to print or we redirect.
            // For now, let's keep it simple.

            // Allow printing the current one before reset?
            // Better UX: Show "Saved Successfully" and enable Print button, don't auto-reset immediately or ask user.
            // But preserving existing reset behavior for POS speed:

            // Reset
            setRows([{ id: 1, barcode: '', productId: '', name: '', quantity: 1, price: 0, total: 0, cost: 0 }]);
            initPage();
            setHeader(h => ({ ...h, customerId: '', customerName: '', notes: '' }));
            setSavedId(null); // Reset saved state

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5]">
            {/* 1. Toolbar */}
            <div className="bg-gray-200 border-b border-gray-300 p-1 flex gap-2 shadow-sm">
                <button onClick={handleSave} disabled={loading} className="flex flex-col items-center px-4 py-1 hover:bg-gray-300 rounded text-blue-800 disabled:opacity-50">
                    <Save size={18} />
                    <span className="text-xs font-bold mt-1">حفظ (F10)</span>
                </button>
                <button
                    onClick={() => {
                        // Mock Print: navigate to print preview with ref_no or latest ID
                        // Since we don't have ID returned in this mocked 'saveInvoice', we use ref_no
                        if (header.ref_no) navigate(`/print/invoice/${header.ref_no}`);
                    }}
                    className="flex flex-col items-center px-4 py-1 hover:bg-gray-300 rounded text-gray-700"
                >
                    <Printer size={18} />
                    <span className="text-xs font-bold mt-1">طباعة</span>
                </button>
                <button onClick={addRow} className="flex flex-col items-center px-4 py-1 hover:bg-gray-300 rounded text-green-800">
                    <Plus size={18} />
                    <span className="text-xs font-bold mt-1">صنف جديد</span>
                </button>
            </div>

            {/* 2. Header Data */}
            <div className="bg-white p-4 border-b border-gray-200 grid grid-cols-12 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">رقم الفاتورة</label>
                    <input type="text" value={header.ref_no} readOnly className="w-full bg-yellow-50 border border-gray-300 rounded px-2 py-1 font-mono font-bold text-center text-red-600" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                    <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="col-span-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1">العميل</label>
                    <div className="relative">
                        <User size={14} className="absolute right-2 top-2 text-gray-400" />
                        <select
                            value={header.customerId}
                            onChange={e => setHeader({ ...header, customerId: e.target.value })}
                            className="w-full border border-gray-300 rounded px-8 py-1 text-sm bg-white focus:border-blue-500"
                        >
                            <option value="">-- اختر العميل --</option>
                            {customers.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="col-span-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1">ملاحظات</label>
                    <input type="text" value={header.notes} onChange={e => setHeader({ ...header, notes: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1" placeholder="ملاحظات الفاتورة..." />
                </div>
            </div>

            {/* 3. Grid (Items) */}
            <div className="flex-1 bg-white overflow-auto p-4">
                <table className="w-full border-collapse text-sm dense-grid">
                    <thead className="bg-blue-50 text-blue-800 font-bold sticky top-0 shadow-sm border-b-2 border-blue-200">
                        <tr>
                            <th className="w-10 text-center">#</th>
                            <th className="w-32">الباركود / بحث</th>
                            <th>اسم الصنف</th>
                            <th className="w-20 text-center">الوحدة</th>
                            <th className="w-24 text-center">الكمية</th>
                            <th className="w-24 text-center">السعر</th>
                            <th className="w-32 text-center">الإجمالي</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id} className="hover:bg-yellow-50">
                                <td className="text-center bg-gray-50 text-gray-500">{index + 1}</td>
                                <td className="p-0">
                                    <input
                                        type="text"
                                        value={row.barcode}
                                        onChange={e => updateRow(row.id, 'barcode', e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleBarcode(row.id, row.barcode)}
                                        placeholder="scan..."
                                        className="w-full h-full px-2 py-1 font-mono focus:bg-white"
                                        autoFocus={index === rows.length - 1} // التركيز على آخر سطر
                                    />
                                </td>
                                <td className="px-2 bg-gray-50 text-gray-700">{row.name}</td>
                                <td className="text-center bg-gray-50">PCS</td>
                                <td className="p-0">
                                    <input
                                        type="number"
                                        value={row.quantity}
                                        onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                                        className="w-full h-full text-center font-bold text-blue-600 focus:bg-white"
                                    />
                                </td>
                                <td className="p-0">
                                    <input
                                        type="number"
                                        value={row.price}
                                        onChange={e => updateRow(row.id, 'price', e.target.value)}
                                        className="w-full h-full text-center focus:bg-white"
                                    />
                                </td>
                                <td className="bg-gray-50 text-center font-bold text-gray-800">
                                    {row.total.toFixed(2)}
                                </td>
                                <td className="text-center cursor-pointer text-gray-400 hover:text-red-500">
                                    <Trash2 size={14} onClick={() => setRows(rows.filter(r => r.id !== row.id))} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addRow} className="mt-4 w-full border-2 border-dashed border-gray-300 text-gray-500 py-2 rounded hover:border-blue-500 hover:text-blue-500 font-bold transition">
                    + إضافة سطر جديد
                </button>
            </div>

            {/* 4. Footer (Totals) */}
            <div className="bg-[#1e293b] text-white p-4 flex justify-between items-center">
                <div className="text-xs text-gray-400">
                    عدد الأصناف: <span className="text-white font-bold">{rows.length}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-gray-400">المجموع قبل الضريبة</div>
                        <div className="font-mono font-bold text-lg">{(grandTotal / 1.16).toFixed(2)}</div>
                    </div>
                    <div className="text-right border-r border-gray-600 pr-4">
                        <div className="text-xs text-gray-400">الضريبة (16%)</div>
                        <div className="font-mono font-bold text-lg">{(grandTotal - (grandTotal / 1.16)).toFixed(2)}</div>
                    </div>
                    <div className="text-right border-r border-gray-600 pr-4 bg-blue-600 p-2 rounded ml-4 shadow-lg">
                        <div className="text-xs text-blue-200">الصافي للدفع</div>
                        <div className="font-mono font-black text-3xl">{grandTotal.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
