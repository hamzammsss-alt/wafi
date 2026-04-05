import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Search, Printer, FileText } from 'lucide-react';

interface GenericDocumentProps {
    title: string;
    type: 'SALES' | 'PURCHASE' | 'INVENTORY';
    documentName: string; // e.g. "فاتورة مبيعات"
    accountLabel: string; // e.g. "العميل" or "المورد"
    colorTheme: 'blue' | 'emerald' | 'orange' | 'red';
    prefix: string; // e.g. "INV", "QOT", "PO"
}

export const GenericDocument: React.FC<GenericDocumentProps> = ({
    title, type, documentName, accountLabel, colorTheme, prefix
}) => {
    const [accounts, setAccounts] = useState<any[]>([]);

    // Header
    const [header, setHeader] = useState({
        ref_no: '',
        date: new Date().toISOString().split('T')[0],
        accountId: '',
        notes: ''
    });

    // Rows
    const [rows, setRows] = useState<any[]>([
        { id: 1, barcode: '', productId: '', name: '', quantity: 1, price: 0, total: 0 }
    ]);

    // Product Search Modal
    const [showSearch, setShowSearch] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeRowId, setActiveRowId] = useState<number | null>(null);

    // Dynamic Colors
    const themeClasses = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', btn: 'text-blue-800' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', btn: 'text-emerald-800' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', btn: 'text-orange-800' },
        red: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', btn: 'text-red-800' },
    }[colorTheme];

    useEffect(() => {
        initPage();
    }, []);

    const initPage = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const allAccounts = await window.electronAPI.getAccounts();

            // Filter based on type
            let filtered = allAccounts;
            if (type === 'SALES') {
                filtered = allAccounts.filter((a: any) => a.code.startsWith('1')); // Assets -> Receivables approx
            } else if (type === 'PURCHASE') {
                filtered = allAccounts.filter((a: any) => a.code.startsWith('2')); // Liabilities -> Payables approx
            }
            setAccounts(filtered.length > 0 ? filtered : allAccounts);

            // Generate Ref No
            // @ts-ignore
            const nextNo = await window.electronAPI.getNextVoucherNo(prefix);
            setHeader(h => ({ ...h, ref_no: nextNo }));
        }
    };

    const handleProductSearch = async (query: string) => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const products = await window.electronAPI.getProducts(query);
            setSearchResults(products);
        }
    };

    const selectProduct = (product: any) => {
        if (!activeRowId) return;

        setRows(prev => prev.map(r => {
            if (r.id === activeRowId) {
                return {
                    ...r,
                    productId: product.id,
                    barcode: product.barcode,
                    name: product.name,
                    price: type === 'PURCHASE' ? product.cost_price : product.sell_price,
                    total: (type === 'PURCHASE' ? product.cost_price : product.sell_price) * r.quantity
                };
            }
            return r;
        }));
        setShowSearch(false);
        setActiveRowId(null);
    };

    const updateRow = (id: number, field: string, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                const updated = { ...r, [field]: value };
                if (field === 'quantity' || field === 'price') {
                    updated.total = Number(updated.quantity) * Number(updated.price);
                }
                return updated;
            }
            return r;
        }));
    };

    const addRow = () => {
        setRows([...rows, { id: rows.length + 1, barcode: '', productId: '', name: '', quantity: 1, price: 0, total: 0 }]);
    };

    const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

    const handleSave = async () => {
        if (!header.accountId) {
            alert(`الرجاء اختيار ${accountLabel}`);
            return;
        }

        const payload = {
            header: {
                ref_no: header.ref_no,
                date: header.date,
                description: `${documentName} ${header.notes ? '- ' + header.notes : ''}`
            },
            items: rows.filter(r => r.productId), // Only items with product ID
            customerId: header.accountId, // For Sales
            supplierId: header.accountId, // For Purchase
            totalAmount: grandTotal
        };

        try {
            // @ts-ignore
            if (window.electronAPI) {
                if (type === 'SALES') {
                    // @ts-ignore
                    await window.electronAPI.saveInvoice(payload);
                } else if (type === 'PURCHASE') {
                    // @ts-ignore
                    await window.electronAPI.savePurchase(payload);
                } else {
                    // Generic Transaction for now
                    // @ts-ignore
                    // await window.electronAPI.saveTransaction(payload);
                    alert('Inventory Transaction Not Fully Implemented yet');
                    return;
                }
                alert('تم الحفظ بنجاح!');
                // Reset
                setRows([{ id: 1, barcode: '', productId: '', name: '', quantity: 1, price: 0, total: 0 }]);
                initPage(); // Refresh Ref No
            }
        } catch (err: any) {
            alert('فشل الحفظ: ' + err.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] relative">
            {/* Product Search Modal */}
            {showSearch && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg h-[500px] flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex justify-between">
                            <h3 className="font-bold">بحث عن صنف</h3>
                            <button onClick={() => setShowSearch(false)} className="text-red-500 font-bold">X</button>
                        </div>
                        <div className="p-2 border-b bg-gray-50">
                            <input
                                autoFocus
                                className="w-full p-2 border rounded"
                                placeholder="اكتب اسم الصنف..."
                                onChange={e => handleProductSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-auto p-2">
                            {searchResults.map(p => (
                                <div key={p.id} onClick={() => selectProduct(p)} className="p-3 border-b hover:bg-blue-50 cursor-pointer flex justify-between">
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-gray-500 text-sm">{p.barcode}</span>
                                    <span className="text-green-600 font-mono">{type === 'PURCHASE' ? p.cost_price : p.sell_price}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="bg-gray-200 border-b border-gray-300 p-1 flex gap-2 shadow-sm">
                <button onClick={handleSave} className={`flex flex-col items-center px-4 py-1 hover:bg-gray-300 rounded ${themeClasses.btn}`}>
                    <Save size={18} />
                    <span className="text-xs font-bold mt-1">حفظ</span>
                </button>
                <button className={`flex flex-col items-center px-4 py-1 hover:bg-gray-300 rounded text-gray-700`}>
                    <Printer size={18} />
                    <span className="text-xs font-bold mt-1">طباعة</span>
                </button>
                <button onClick={addRow} className={`flex flex-col items-center px-4 py-1 hover:bg-gray-300 rounded text-green-700`}>
                    <Plus size={18} />
                    <span className="text-xs font-bold mt-1">سطر جديد</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {/* Header Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
                    <h1 className={`text-xl font-bold mb-4 flex items-center gap-2 ${themeClasses.text}`}>
                        <FileText /> {title}
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">رقم المستند</label>
                            <input value={header.ref_no} readOnly className="w-full bg-gray-50 border rounded p-2 font-mono text-center" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                            <input type="date" value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })} className="w-full border rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">{accountLabel}</label>
                            <select
                                value={header.accountId}
                                onChange={e => setHeader({ ...header, accountId: e.target.value })}
                                className="w-full border rounded p-2"
                            >
                                <option value="">-- اختر --</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">ملاحظات</label>
                            <input
                                value={header.notes}
                                onChange={e => setHeader({ ...header, notes: e.target.value })}
                                placeholder="ملاحظات..."
                                className="w-full border rounded p-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-right">
                        <thead className={`${themeClasses.bg} ${themeClasses.text} font-bold border-b ${themeClasses.border}`}>
                            <tr>
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3 text-right">الصنف</th>
                                <th className="p-3 w-32 text-center">الكمية</th>
                                <th className="p-3 w-32 text-center">السعر</th>
                                <th className="p-3 w-40 text-center">الإجمالي</th>
                                <th className="p-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={row.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 text-center bg-gray-50">{idx + 1}</td>
                                    <td className="p-2 relative">
                                        <div className="flex gap-2">
                                            <input
                                                value={row.name}
                                                readOnly
                                                placeholder="اضغط للبحث عن صنف..."
                                                onClick={() => { setActiveRowId(row.id); setShowSearch(true); handleProductSearch(''); }}
                                                className="w-full border rounded p-1 bg-white cursor-pointer"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={row.quantity}
                                            onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                                            className="w-full border rounded p-1 text-center font-bold"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={row.price}
                                            onChange={e => updateRow(row.id, 'price', e.target.value)}
                                            className="w-full border rounded p-1 text-center"
                                        />
                                    </td>
                                    <td className="p-2 text-center font-mono font-bold">
                                        {row.total.toFixed(2)}
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold border-t">
                            <tr>
                                <td colSpan={4} className="p-4 text-left pl-8 text-gray-500">المجموع النهائي:</td>
                                <td className="p-4 text-center text-xl text-gray-800 font-mono">{grandTotal.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};
