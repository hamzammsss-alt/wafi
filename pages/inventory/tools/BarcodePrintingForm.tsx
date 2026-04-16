import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Barcode from 'react-barcode';
import { Printer, Search, Settings, Trash2, Plus } from 'lucide-react';
import { Item } from '../../../types';

const BarcodePrintingForm = () => {
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ item: Item; quantity: number }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);

    // Form Settings
    const [labelName, setLabelName] = useState('');
    const [labelSettings, setLabelSettings] = useState({
        // Display Options
        showCode: true,
        showNameAr: true,
        showNameEn: false,
        showPrice: true,
        showWarehouse: false,
        showCurrency: true,

        // Layout & Design
        pageSize: 'A4', // A4, A5, Label
        orientation: 'portrait', // portrait, landscape
        labelsPerRow: 3,
        labelsPerColumn: 5,
        labelWidth: 65, // mm
        labelHeight: 40, // mm

        // Barcode Settings
        barcodeType: 'code128',
        barcodeWidth: 1.2,
        barcodeHeight: 50,
        fontSize: 11,
        showBarcodeValue: true,

        // Borders & Design
        showBorder: true,
        borderWidth: 1,
        borderColor: '#000000',
    });

    useEffect(() => {
        loadItems();
    }, []);

    // Auto-load item if itemId in query params
    useEffect(() => {
        const itemId = searchParams.get('itemId');
        if (itemId && items.length > 0) {
            const item = items.find(i => i.id === itemId);
            if (item) {
                const exists = selectedItems.find(s => s.item.id === item.id);
                if (!exists) {
                    setSelectedItems(prev => [...prev, { item, quantity: 1 }]);
                }
            }
        }
    }, [searchParams, items]);

    useEffect(() => {
        if (searchTerm.trim()) {
            setFilteredItems(
                items
                    .filter(
                        (i) =>
                            i.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            i.code?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 15)
            );
        } else {
            setFilteredItems([]);
        }
    }, [searchTerm, items]);

    const loadItems = async () => {
        try {
            const data = await window.electronAPI.inventory.getItems();
            setItems(data || []);
        } catch (error) {
            console.error('Failed to load items', error);
        }
    };

    const handleAddItem = (item: Item) => {
        const exists = selectedItems.find((s) => s.item.id === item.id);
        if (exists) {
            setSelectedItems((prev) =>
                prev.map((s) => (s.item.id === item.id ? { ...s, quantity: s.quantity + 1 } : s))
            );
        } else {
            setSelectedItems((prev) => [...prev, { item, quantity: 1 }]);
        }
        setSearchTerm('');
    };

    const handleRemoveItem = (itemId: string) => {
        setSelectedItems((prev) => prev.filter((s) => s.item.id !== itemId));
    };

    const handleQuantityChange = (itemId: string, qty: number) => {
        if (qty > 0) {
            setSelectedItems((prev) =>
                prev.map((s) => (s.item.id === itemId ? { ...s, quantity: qty } : s))
            );
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const totalLabels = selectedItems.reduce((sum, s) => sum + s.quantity, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #print-area, #print-area * { visibility: visible; }
                        #print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                        }
                        .no-print { display: none !important; }
                    }
                `}
            </style>

            {/* Header */}
            <div className="mb-6 no-print">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3 mb-2">
                    <Printer className="text-emerald-600" size={32} />
                    نموذج طباعة البركود
                </h1>
                <p className="text-slate-600">قم بتصميم وطباعة ملصقات الباركود حسب احتياجاتك</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-1 no-print">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
                        {/* Tab Navigation */}
                        <div className="bg-slate-50 border-b border-slate-200 p-3 flex gap-2">
                            <button className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold">
                                الإعدادات
                            </button>
                            <button className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition">
                                الأصناف
                            </button>
                        </div>

                        {/* Settings Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Label Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الملصق</label>
                                <input
                                    type="text"
                                    value={labelName}
                                    onChange={(e) => setLabelName(e.target.value)}
                                    placeholder="مثال: ملصقات البيع"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            {/* Display Options */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                    <Settings size={16} /> خيارات العرض
                                </h3>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelSettings.showCode}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, showCode: e.target.checked })
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700">إظهار الرمز</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelSettings.showNameAr}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, showNameAr: e.target.checked })
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700">إظهار الاسم العربي</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelSettings.showNameEn}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, showNameEn: e.target.checked })
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700">إظهار الاسم الإنجليزي</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelSettings.showPrice}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, showPrice: e.target.checked })
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700">إظهار السعر</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelSettings.showWarehouse}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, showWarehouse: e.target.checked })
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700">إظهار المستودع</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelSettings.showBarcodeValue}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, showBarcodeValue: e.target.checked })
                                            }
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700">إظهار قيمة الكود</span>
                                    </label>
                                </div>
                            </div>

                            {/* Layout Settings */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-slate-700 text-sm mb-3">تخطيط الصفحة</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">حجم الصفحة</label>
                                        <select
                                            value={labelSettings.pageSize}
                                            onChange={(e) =>
                                                setLabelSettings({ ...labelSettings, pageSize: e.target.value })
                                            }
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="A4">A4</option>
                                            <option value="A5">A5</option>
                                            <option value="A6">A6</option>
                                            <option value="Label">ملصق</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">الاتجاه</label>
                                        <select
                                            value={labelSettings.orientation}
                                            onChange={(e) =>
                                                setLabelSettings({
                                                    ...labelSettings,
                                                    orientation: e.target.value,
                                                })
                                            }
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="portrait">رأسي</option>
                                            <option value="landscape">أفقي</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                عدد الأعمدة
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={labelSettings.labelsPerRow}
                                                onChange={(e) =>
                                                    setLabelSettings({
                                                        ...labelSettings,
                                                        labelsPerRow: parseInt(e.target.value),
                                                    })
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                عدد الصفوف
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={labelSettings.labelsPerColumn}
                                                onChange={(e) =>
                                                    setLabelSettings({
                                                        ...labelSettings,
                                                        labelsPerColumn: parseInt(e.target.value),
                                                    })
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Barcode Settings */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-slate-700 text-sm mb-3">إعدادات الباركود</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">حجم الخط</label>
                                        <input
                                            type="number"
                                            min="8"
                                            max="16"
                                            value={labelSettings.fontSize}
                                            onChange={(e) =>
                                                setLabelSettings({
                                                    ...labelSettings,
                                                    fontSize: parseInt(e.target.value),
                                                })
                                            }
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                عرض الباركود
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.5"
                                                max="3"
                                                value={labelSettings.barcodeWidth}
                                                onChange={(e) =>
                                                    setLabelSettings({
                                                        ...labelSettings,
                                                        barcodeWidth: parseFloat(e.target.value),
                                                    })
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                ارتفاع الباركود
                                            </label>
                                            <input
                                                type="number"
                                                min="20"
                                                max="100"
                                                value={labelSettings.barcodeHeight}
                                                onChange={(e) =>
                                                    setLabelSettings({
                                                        ...labelSettings,
                                                        barcodeHeight: parseInt(e.target.value),
                                                    })
                                                }
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print Button */}
                        <div className="border-t bg-slate-50 p-4 flex gap-2">
                            <button
                                onClick={handlePrint}
                                disabled={selectedItems.length === 0}
                                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Printer size={18} />
                                طباعة ({totalLabels} ملصق)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Middle Panel: Item Selection */}
                <div className="lg:col-span-1 no-print">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div className="bg-slate-50 border-b border-slate-200 p-4">
                            <h3 className="font-semibold text-slate-700 mb-3">البحث عن الأصناف</h3>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="ابحث عن صنف..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredItems.length > 0 ? (
                                <div className="divide-y">
                                    {filteredItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleAddItem(item)}
                                            className="w-full p-3 text-right hover:bg-emerald-50 transition flex items-center justify-between group"
                                        >
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm">{item.name_ar}</div>
                                                <div className="text-xs text-slate-500">{item.code}</div>
                                            </div>
                                            <Plus
                                                size={18}
                                                className="text-slate-400 group-hover:text-emerald-600 transition"
                                            />
                                        </button>
                                    ))}
                                </div>
                            ) : searchTerm ? (
                                <div className="p-6 text-center text-slate-500 text-sm">لا توجد نتائج</div>
                            ) : (
                                <div className="p-6 text-center text-slate-500 text-sm">ابدأ البحث للعثور على الأصناف</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Selected Items */}
                <div className="lg:col-span-1 no-print">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div className="bg-slate-50 border-b border-slate-200 p-4">
                            <h3 className="font-semibold text-slate-700">الأصناف المختارة</h3>
                            <p className="text-xs text-slate-500 mt-1">{selectedItems.length} أصناف</p>
                        </div>

                        {/* Selected Items List */}
                        <div className="flex-1 overflow-y-auto divide-y">
                            {selectedItems.length > 0 ? (
                                selectedItems.map((row) => (
                                    <div key={row.item.id} className="p-3 flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-800 text-sm truncate">
                                                {row.item.name_ar}
                                            </div>
                                            <div className="text-xs text-slate-500">{row.item.code}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.quantity}
                                                onChange={(e) =>
                                                    handleQuantityChange(row.item.id, parseInt(e.target.value) || 1)
                                                }
                                                className="w-12 px-2 py-1 border border-slate-300 rounded text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleRemoveItem(row.item.id)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-slate-500 text-sm">لم تختر أصناف بعد</div>
                            )}
                        </div>

                        {/* Summary */}
                        {selectedItems.length > 0 && (
                            <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">إجمالي الملصقات:</span>
                                    <span className="font-semibold text-emerald-600">{totalLabels}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedItems([])}
                                    className="w-full py-2 text-slate-700 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition"
                                >
                                    مسح الكل
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-b from-slate-100 to-slate-50 rounded-2xl p-4 border border-slate-200 h-full overflow-y-auto">
                        <div className="text-xs font-semibold text-slate-600 mb-3 no-print">معاينة الملصق</div>
                        <div id="print-area" className="space-y-2">
                            {selectedItems.slice(0, 3).map((row) => (
                                <div
                                    key={row.item.id}
                                    className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-3 text-center text-xs"
                                    style={{
                                        width: `${labelSettings.labelWidth}mm`,
                                        minHeight: `${labelSettings.labelHeight}mm`,
                                    }}
                                >
                                    {labelSettings.showNameAr && (
                                        <div className="font-semibold text-slate-800 mb-1 line-clamp-2">
                                            {row.item.name_ar}
                                        </div>
                                    )}
                                    {labelSettings.showCode && (
                                        <div className="text-slate-600 mb-1">{row.item.code}</div>
                                    )}
                                    {labelSettings.showPrice && (
                                        <div className="font-bold text-emerald-600">
                                            {Number(row.item.sale_price).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {selectedItems.length === 0 && (
                                <div className="text-center text-slate-500 py-8 text-xs">معاينة فارغة</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodePrintingForm;
