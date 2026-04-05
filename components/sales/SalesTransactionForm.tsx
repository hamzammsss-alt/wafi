import React, { useState, useEffect } from 'react';
import { Save, Calculator, Plus, Trash2, Search, Calendar, User, FileText, ArrowRight, Printer } from 'lucide-react';
import { BusinessPartner, Item, Unit } from '../../types';
import { useNavigate } from 'react-router-dom';

interface SalesTransactionFormProps {
    type: 'QUOTATION' | 'ORDER' | 'INVOICE' | 'SALES_RETURN';
    initialData?: any;
    onSubmit: (data: any) => Promise<void>;
    loading?: boolean;
    title: string;
}

export const SalesTransactionForm: React.FC<SalesTransactionFormProps> = ({ type, initialData, onSubmit, loading, title }) => {
    // Header State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState<string>('');
    const [customer, setCustomer] = useState<BusinessPartner | null>(null);
    const [notes, setNotes] = useState('');
    const [currency, setCurrency] = useState('NIS'); // Default
    const [warehouseId, setWarehouseId] = useState('');
    const [branchId, setBranchId] = useState('');

    // Lines State
    const [lines, setLines] = useState<any[]>([]);

    // Master Data (fetched)
    const [customers, setCustomers] = useState<BusinessPartner[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);

    // UI State
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    const api = (window as any).electronAPI;
    const navigate = useNavigate();

    useEffect(() => {
        loadMasterData();
        if (initialData) {
            // Load initial data logic here (mapping fields)
            mapInitialData(initialData);
        }
    }, [initialData]);

    const loadMasterData = async () => {
        if (!api) return;
        try {
            const [custs, prods, whs, unitList, branchList] = await Promise.all([
                api.partner.getPartners('CUSTOMER'),
                api.inventory.getItems(),
                api.getWarehouses(),
                api.inventory.getUnits(),
                api.branch.getBranches()
            ]);
            setCustomers(custs);
            setItems(prods);
            setWarehouses(whs);
            setUnits(unitList);
            setBranches(branchList);

            // Default defaults
            if (whs.length > 0) setWarehouseId(whs[0].id);
            if (branchList && branchList.length > 0) {
                setBranchId(branchList[0].id);
            }

            // Default defaults
            if (whs.length > 0) setWarehouseId(whs[0].id);
        } catch (e) {
            console.error("Failed to load master data", e);
        }
    };

    const mapInitialData = (data: any) => {
        // ... mapping logic
        setDate(data.header?.date || new Date().toISOString().split('T')[0]);
        // ... set lines
    };

    // --- Calculations ---
    const calculateTotals = () => {
        const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
        const taxTotal = lines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
        const discountTotal = lines.reduce((sum, line) => sum + (line.discount_amount || 0), 0);
        const grandTotal = subtotal + taxTotal - discountTotal;
        return { subtotal, taxTotal, discountTotal, grandTotal };
    };

    const totals = calculateTotals();

    // --- Handlers ---
    const handleAddLine = () => {
        setLines([...lines, {
            id: Date.now(),
            item_id: '',
            description: '',
            quantity: 1,
            unit_id: '',
            unit_price: 0,
            tax_amount: 0,
            discount_amount: 0,
            net_total: 0
        }]);
    };

    const handleLineChange = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        // Auto-fill item details
        if (field === 'item_id') {
            const selectedItem = items.find(i => i.id === value);
            if (selectedItem) {
                line.description = selectedItem.name_ar;
                line.unit_price = selectedItem.sale_price;
                line.unit_id = selectedItem.base_unit_id;
                // Auto Tax?
            }
        }

        // Recalculate usage logic (basic)
        if (['quantity', 'unit_price', 'tax_amount', 'discount_amount'].includes(field) || field === 'item_id') {
            const qty = field === 'quantity' ? Number(value) : line.quantity;
            const price = field === 'unit_price' ? Number(value) : line.unit_price;
            const tax = field === 'tax_amount' ? Number(value) : line.tax_amount;
            const discount = field === 'discount_amount' ? Number(value) : line.discount_amount;

            line.net_total = (qty * price) + tax - discount;
        }

        newLines[index] = line;
        setLines(newLines);
    };

    const handleRemoveLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!customer) {
            alert("يرجى اختيار الزبون");
            return;
        }
        if (lines.length === 0) {
            alert("يرجى إضافة أصناف");
            return;
        }

        const payload = {
            header: {
                customer_id: customer.id,
                branch_id: branchId || 'MAIN', // Fallback
                warehouse_id: warehouseId,
                date,
                due_date: dueDate,
                currency_id: currency, // Map to ID
                exchange_rate: 1,
                subtotal: totals.subtotal,
                tax_total: totals.taxTotal,
                discount_total: totals.discountTotal,
                grand_total: totals.grandTotal,
                notes
            },
            lines: lines.filter(l => l.item_id) // Filter empty
        };

        await onSubmit(payload);
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-6 gap-6" dir="rtl">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} /> {new Date().toLocaleDateString('ar-PS')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {initialData && initialData.header?.id && (
                        <button
                            onClick={() => {
                                let printType = 'quotation';
                                if (type === 'INVOICE') printType = 'invoice';
                                if (type === 'ORDER') printType = 'sales-order';
                                if (type === 'SALES_RETURN') printType = 'sales-return';
                                navigate(`/print/${printType}/${initialData.header.id}`);
                            }}
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Printer size={18} />
                            <span>طباعة</span>
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                        {loading ? <span className="animate-spin">⌛</span> : <Save size={18} />}
                        <span>حفظ الوثيقة</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 overflow-hidden">
                {/* Right Side: Inputs */}
                <div className="xl:col-span-3 flex flex-col gap-6 overflow-hidden">

                    {/* Header Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Customer Selector */}
                        <div className="relative">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">الزبون</label>
                            {customer ? (
                                <div className="flex items-center justify-between p-2.5 border border-indigo-200 bg-indigo-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                            {customer.name_ar.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-indigo-900 text-sm">{customer.name_ar}</div>
                                            <div className="text-xs text-indigo-500">{customer.phone}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setCustomer(null)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="ابحث عن زبون..."
                                        className="w-full p-2.5 border border-gray-300 rounded-lg pl-10 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerSearch(true);
                                        }}
                                        onFocus={() => setShowCustomerSearch(true)}
                                    />
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />

                                    {showCustomerSearch && customerSearch && (
                                        <div className="absolute top-full right-0 w-full bg-white shadow-xl rounded-lg mt-1 border border-gray-100 z-50 max-h-60 overflow-auto">
                                            {customers
                                                .filter(c => c.name_ar.includes(customerSearch) || c.phone?.includes(customerSearch))
                                                .map(c => (
                                                    <div
                                                        key={c.id}
                                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                                        onClick={() => {
                                                            setCustomer(c);
                                                            setShowCustomerSearch(false);
                                                            setCustomerSearch('');
                                                        }}
                                                    >
                                                        <div className="font-bold text-gray-800">{c.name_ar}</div>
                                                        <div className="text-xs text-gray-500 flex gap-2">
                                                            <span>{c.phone}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span>Balance: 0.00</span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Date */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">التاريخ</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>

                        {/* Invoice/Ref No (ReadOnly usually) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">رقم الوثيقة</label>
                            <input
                                type="text"
                                disabled
                                placeholder="AUTO-GEN"
                                className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-400 font-mono text-center"
                            />
                        </div>
                    </div>

                    {/* Lines Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">

                        <div className="overflow-auto flex-1 p-1">
                            <table className="w-full text-right" style={{ minWidth: '800px' }}>
                                <thead className="bg-gray-50 text-gray-600 font-bold text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-12 text-center">#</th>
                                        <th className="p-3 w-1/4">الصنف</th>
                                        <th className="p-3 w-24">الكمية</th>
                                        <th className="p-3 w-24">الوحدة</th>
                                        <th className="p-3 w-28">السعر</th>
                                        <th className="p-3 w-24">الضرائب</th>
                                        <th className="p-3 w-32">الإجمالي</th>
                                        <th className="p-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {lines.map((line, index) => (
                                        <tr key={line.id} className="group hover:bg-indigo-50/30 transition-colors">
                                            <td className="p-3 text-center text-gray-400 text-xs index-cell">{index + 1}</td>
                                            <td className="p-2">
                                                <select
                                                    className="w-full p-1.5 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent outline-none text-sm font-medium"
                                                    value={line.item_id}
                                                    onChange={e => handleLineChange(index, 'item_id', e.target.value)}
                                                >
                                                    <option value="">اختر صنف...</option>
                                                    {items.map(item => (
                                                        <option key={item.id} value={item.id}>{item.name_ar} - {item.code}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full p-1.5 border border-gray-200 rounded text-center font-mono text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                                                    value={line.quantity}
                                                    min="1"
                                                    onChange={e => handleLineChange(index, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    className="w-full p-1.5 bg-gray-50 rounded text-xs text-gray-600 outline-none"
                                                    value={line.unit_id}
                                                    onChange={e => handleLineChange(index, 'unit_id', e.target.value)}
                                                >
                                                    {units.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full p-1.5 border border-gray-200 rounded text-center font-mono text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                                                    value={line.unit_price}
                                                    onChange={e => handleLineChange(index, 'unit_price', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 text-center text-xs text-gray-400">
                                                {/* Placeholder for Tax logic */}
                                                -
                                            </td>
                                            <td className="p-3 text-emerald-600 font-bold font-mono text-sm">
                                                {(line.quantity * line.unit_price).toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    onClick={() => handleRemoveLine(index)}
                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Empty State / Add Button */}
                                    {lines.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-3 bg-gray-50 rounded-full"><Calculator size={24} /></div>
                                                    <p>لا توجد أصناف في القائمة</p>
                                                    <button onClick={handleAddLine} className="text-indigo-600 font-bold text-sm hover:underline mt-2">
                                                        إضافة صنف جديد
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={handleAddLine}
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm px-4 py-2 hover:bg-indigo-50 rounded transition-colors"
                            >
                                <Plus size={16} /> إضافة سطر جديد
                            </button>
                        </div>
                    </div>
                </div>

                {/* Left Side: Summary & Options */}
                <div className="xl:col-span-1 flex flex-col gap-6">

                    {/* Totals Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b">ملخص الحساب</h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center text-gray-600">
                                <span>المجموع الفرعي</span>
                                <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                                <span>مجموع الخصم</span>
                                <span className="font-mono text-red-500">-{totals.discountTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                                <span>الضريبة (16%)</span>
                                <span className="font-mono text-amber-600">+{totals.taxTotal.toFixed(2)}</span>
                            </div>

                            <div className="pt-3 mt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                                <span className="font-bold text-lg text-gray-800">الصافي للدفع</span>
                                <span className="font-bold text-xl text-emerald-600 font-mono">
                                    {totals.grandTotal.toFixed(2)} <span className="text-xs text-gray-400">{currency}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Settings Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1">
                        <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b">خيارات إضافية</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">الفرع</label>
                                <select
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-indigo-400"
                                    value={branchId}
                                    onChange={e => setBranchId(e.target.value)}
                                >
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">تاريخ الاستحقاق</label>
                                <input
                                    type="date"
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-indigo-400"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">المستودع</label>
                                <select
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-indigo-400"
                                    value={warehouseId}
                                    onChange={e => setWarehouseId(e.target.value)}
                                >
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">ملاحظات</label>
                                <textarea
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm h-24 resize-none outline-none focus:border-indigo-400"
                                    placeholder="أكتب أي ملاحظات هنا..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
