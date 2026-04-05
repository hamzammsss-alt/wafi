import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { Item } from '../../../types';


// We might not have useReactToPrint installed, so we can use standard window.print with CSS
// But window.print prints the whole page. CSS @media print is the way.

const LabelPrinting = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ item: Item; quantity: number }[]>([]);

    // Picker State
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Settings
    const [settings, setSettings] = useState({
        showPrice: true,
        showName: true,
        showCurrency: true,
        width: 40, // mm
        height: 25, // mm
        barcodeWidth: 1.5,
        barcodeHeight: 30, // px
        fontSize: 12
    });

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            setFilteredItems(items.filter(i =>
                i.name_ar.includes(searchTerm) ||
                (i.code && i.code.includes(searchTerm))
            ).slice(0, 10));
        } else {
            setFilteredItems([]);
        }
    }, [searchTerm, items]);

    const loadItems = async () => {
        const data = await window.electronAPI.inventory.getItems();
        setItems(data);
    };

    const handleAddItem = (item: Item) => {
        // Check if exists
        const exists = selectedItems.find(s => s.item.id === item.id);
        if (exists) {
            setSelectedItems(prev => prev.map(s => s.item.id === item.id ? { ...s, quantity: s.quantity + 1 } : s));
        } else {
            setSelectedItems(prev => [...prev, { item, quantity: 1 }]);
        }
        setSearchTerm('');
        setIsPickerOpen(false);
    };

    const handleRemove = (id: string) => {
        setSelectedItems(prev => prev.filter(s => s.item.id !== id));
    };

    const handleQuantityChange = (id: string, qty: number) => {
        setSelectedItems(prev => prev.map(s => s.item.id === id ? { ...s, quantity: qty } : s));
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #print-area, #print-area * {
                            visibility: visible;
                        }
                        #print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>

            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-3xl font-bold">طباعة الباركود (Barcode Labels)</h1>
                <button
                    onClick={handlePrint}
                    disabled={selectedItems.length === 0}
                    className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:bg-gray-400"
                >
                    طباعة
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Controls & List (Left side) */}
                <div className="lg:col-span-1 bg-white rounded shadow p-4 flex flex-col overflow-hidden no-print">

                    {/* Item Picker */}
                    <div className="relative mb-4">
                        <label className="block text-sm font-medium mb-1">إضافة صنف</label>
                        <input
                            type="text"
                            placeholder="بحث عن صنف..."
                            className="w-full border p-2 rounded"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setIsPickerOpen(true); }}
                            onFocus={() => setIsPickerOpen(true)}
                        />
                        {isPickerOpen && searchTerm && (
                            <div className="absolute top-18 left-0 right-0 bg-white border rounded shadow-xl z-20 max-h-48 overflow-y-auto">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-2 hover:bg-blue-50 cursor-pointer border-b flex justify-between"
                                        onClick={() => handleAddItem(item)}
                                    >
                                        <div className="font-medium">{item.name_ar}</div>
                                        <div className="text-gray-500 text-sm">{item.code}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected List */}
                    <div className="flex-1 overflow-y-auto mb-4 border rounded">
                        {selectedItems.length === 0 ? (
                            <div className="p-4 text-center text-gray-400">لا توجد أصناف مختارة</div>
                        ) : (
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2">الصنف</th>
                                        <th className="p-2 w-20">العدد</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedItems.map((row) => (
                                        <tr key={row.item.id} className="border-b">
                                            <td className="p-2">
                                                <div className="font-bold">{row.item.name_ar}</div>
                                                <div className="text-xs text-gray-500">{row.item.code}</div>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={row.quantity}
                                                    onChange={e => handleQuantityChange(row.item.id, parseInt(e.target.value) || 1)}
                                                    className="w-full border rounded p-1 text-center"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    onClick={() => handleRemove(row.item.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="border-t pt-4">
                        <h4 className="font-bold mb-2 text-sm text-gray-700">إعدادات الملصق</h4>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.showName}
                                    onChange={e => setSettings({ ...settings, showName: e.target.checked })}
                                    className="accent-blue-600"
                                />
                                <span className="text-sm">إظهار الاسم</span>
                            </label>
                            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.showPrice}
                                    onChange={e => setSettings({ ...settings, showPrice: e.target.checked })}
                                    className="accent-blue-600"
                                />
                                <span className="text-sm">إظهار السعر</span>
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 block">عرض الكود</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={settings.barcodeWidth}
                                        onChange={e => setSettings({ ...settings, barcodeWidth: parseFloat(e.target.value) })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block">ارتفاع الكود</label>
                                    <input
                                        type="number"
                                        value={settings.barcodeHeight}
                                        onChange={e => setSettings({ ...settings, barcodeHeight: parseInt(e.target.value) })}
                                        className="w-full border rounded p-1 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview / Print Area (Right side) */}
                <div className="lg:col-span-2 bg-gray-100 p-8 overflow-y-auto rounded border relative">
                    <div className="absolute top-2 right-4 text-xs text-gray-400 no-print">منطقة المعاينة (Preview)</div>

                    <div id="print-area" className="flex flex-wrap gap-4 content-start">
                        {selectedItems.flatMap(row =>
                            Array.from({ length: row.quantity }).map((_, i) => (
                                <div
                                    key={`${row.item.id}-${i}`}
                                    className="bg-white border rounded flex flex-col items-center justify-center p-2 text-center break-inside-avoid"
                                    style={{
                                        // Typical Label sizing, user can adjust via CSS ideally but inline for now
                                        minWidth: '200px',
                                        minHeight: '100px',
                                        pageBreakInside: 'avoid'
                                    }}
                                >
                                    {settings.showName && (
                                        <div className="font-bold text-sm mb-1 line-clamp-2 leading-tight">
                                            {row.item.name_ar}
                                        </div>
                                    )}

                                    <Barcode
                                        value={row.item.code || '0000'}
                                        width={settings.barcodeWidth}
                                        height={settings.barcodeHeight}
                                        fontSize={settings.fontSize}
                                        margin={2}
                                    />

                                    {settings.showPrice && (
                                        <div className="font-bold text-lg mt-1">
                                            {Number(row.item.sale_price).toFixed(2)}
                                            {settings.showCurrency && <span className="text-xs mr-1 font-normal">ILS</span>}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {selectedItems.length === 0 && (
                            <div className="w-full text-center py-20 text-gray-400 no-print">
                                أضف أصناف للمعانية والطباعة
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LabelPrinting;
