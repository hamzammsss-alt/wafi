import React, { useEffect, useState } from 'react';
import { Item, Unit, ItemUnit } from '../../../types';
import { v4 as uuidv4 } from 'uuid'; // Assumption: uuid is available or we use simple id

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemUnitsTab: React.FC<Props> = ({ data, onChange }) => {
    const [units, setUnits] = useState<Unit[]>([]);

    useEffect(() => {
        window.electronAPI.inventory.getUnits().then(setUnits);
    }, []);

    const handleBaseUnitChange = (unitId: string) => {
        // Find unit name if needed for display
        onChange({ ...data, base_unit_id: unitId });
    };

    const addAdditionalUnit = () => {
        const newUnits = [...(data.additional_units || [])];
        newUnits.push({
            id: Date.now().toString(), // Temp ID
            item_id: data.id || '',
            unit_id: '',
            factor: 1,
            barcode: '',
            sale_price: 0
        });
        onChange({ ...data, additional_units: newUnits });
    };

    const updateUnitRow = (index: number, field: keyof ItemUnit, value: any) => {
        const newUnits = [...(data.additional_units || [])];
        newUnits[index] = { ...newUnits[index], [field]: value };
        onChange({ ...data, additional_units: newUnits });
    };

    const removeUnitRow = (index: number) => {
        const newUnits = [...(data.additional_units || [])];
        newUnits.splice(index, 1);
        onChange({ ...data, additional_units: newUnits });
    };

    return (
        <div className="p-4 space-y-6">
            {/* Base Unit Section */}
            <div className="bg-gray-50 p-4 rounded border">
                <h3 className="text-lg font-bold mb-4 text-gray-800">الوحدة الأساسية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الوحدة الأساسية (أصغر وحدة) *</label>
                        <select
                            value={data.base_unit_id || ''}
                            onChange={e => handleBaseUnitChange(e.target.value)}
                            className="w-full border rounded p-2"
                        >
                            <option value="">اختر الوحدة...</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">يتم احتساب تكلفة المخزون بناءً على هذه الوحدة</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">باركود الوحدة الأساسية</label>
                        <input
                            type="text"
                            value={data.barcode || ''}
                            onChange={e => onChange({ ...data, barcode: e.target.value })}
                            className="w-full border rounded p-2"
                            placeholder="Scan Barcode..."
                        />
                    </div>
                </div>
            </div>

            {/* Additional Units Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">وحدات القياس الإضافية</h3>
                    <button
                        onClick={addAdditionalUnit}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium border border-blue-200"
                    >
                        + إضافة وحدة
                    </button>
                </div>

                <div className="border rounded overflow-hidden">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border-b">الوحدة</th>
                                <th className="p-3 border-b">عامل التحويل (بالنسبة للأساسية)</th>
                                <th className="p-3 border-b">الباركود</th>
                                <th className="p-3 border-b">سعر البيع المقترح</th>
                                <th className="p-3 border-b w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.additional_units?.map((row, index) => (
                                <tr key={index}>
                                    <td className="p-2">
                                        <select
                                            value={row.unit_id}
                                            onChange={e => updateUnitRow(index, 'unit_id', e.target.value)}
                                            className="w-full border rounded p-1"
                                        >
                                            <option value="">اختر...</option>
                                            {units.filter(u => u.id !== data.base_unit_id).map(u => (
                                                <option key={u.id} value={u.id}>{u.name_ar}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center">
                                            <span className="ml-2 text-gray-500">=</span>
                                            <input
                                                type="number"
                                                value={row.factor}
                                                onChange={e => updateUnitRow(index, 'factor', parseFloat(e.target.value))}
                                                className="w-20 border rounded p-1 text-center"
                                                min="1"
                                            />
                                            <span className="mr-2 text-gray-500 text-xs">من الوحدة الأساسية</span>
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={row.barcode || ''}
                                            onChange={e => updateUnitRow(index, 'barcode', e.target.value)}
                                            className="w-full border rounded p-1"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={row.sale_price || 0}
                                            onChange={e => updateUnitRow(index, 'sale_price', parseFloat(e.target.value))}
                                            className="w-full border rounded p-1"
                                        />
                                    </td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => removeUnitRow(index)}
                                            className="text-red-500 hover:text-red-700 font-bold"
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!data.additional_units || data.additional_units.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-400">
                                        لا توجد وحدات إضافية.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ItemUnitsTab;
