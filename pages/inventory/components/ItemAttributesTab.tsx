import React, { useState, useEffect } from 'react';
import { Item, ItemAttribute, Attribute, AttributeValue } from '../../../types';
import { Plus, Trash2, Check, X, Settings } from 'lucide-react';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemAttributesTab: React.FC<Props> = ({ data, onChange }) => {
    const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
    const [attributeValues, setAttributeValues] = useState<Record<string, AttributeValue[]>>({});

    // UI State for creating new attribute
    const [isCreatingAttr, setIsCreatingAttr] = useState(false);
    const [newAttrName, setNewAttrName] = useState('');

    // UI State for creating new value
    const [creatingValueFor, setCreatingValueFor] = useState<string | null>(null); // attribute_id
    const [newValueName, setNewValueName] = useState('');

    useEffect(() => {
        loadAttributes();
    }, []);

    // Load definitions
    const loadAttributes = async () => {
        try {
            const attrs = await window.electronAPI.inventory.getAttributes();
            setAvailableAttributes(attrs);

            // Should also load values for any existing attributes in data
            if (data.attributes) {
                data.attributes.forEach(a => {
                    if (a.attribute_id) loadValues(a.attribute_id);
                });
            }
        } catch (error) {
            console.error("Failed to load attributes", error);
        }
    };

    const loadValues = async (attrId: string) => {
        if (!attrId) return;
        // Always refresh or check?
        // Let's cache heavily
        if (!attributeValues[attrId]) {
            try {
                const vals = await window.electronAPI.inventory.getAttributeValues(attrId);
                setAttributeValues(prev => ({ ...prev, [attrId]: vals }));
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleAddRow = () => {
        const current = data.attributes || [];
        onChange({ ...data, attributes: [...current, { attribute_id: '', value: '' }] });
    };

    const handleRemoveRow = (index: number) => {
        const current = [...(data.attributes || [])];
        current.splice(index, 1);
        onChange({ ...data, attributes: current });
    };

    const handleChangeRow = (index: number, field: keyof ItemAttribute, val: string) => {
        const current = [...(data.attributes || [])];
        if (field === 'attribute_id') {
            current[index] = { ...current[index], attribute_id: val, value: '' }; // Reset value
            if (val) loadValues(val);
        } else {
            current[index] = { ...current[index], [field]: val };
        }
        onChange({ ...data, attributes: current });
    };

    // Create Attribute
    const handleCreateAttribute = async () => {
        if (!newAttrName.trim()) return;
        try {
            const newAttr = await window.electronAPI.inventory.createAttribute({
                name_ar: newAttrName,
                name_en: newAttrName
            });
            setAvailableAttributes([...availableAttributes, newAttr]);
            setNewAttrName('');
            setIsCreatingAttr(false);
        } catch (error) {
            console.error("Failed to create attribute", error);
        }
    };

    // Create Value
    const handleCreateValue = async () => {
        if (!newValueName.trim() || !creatingValueFor) return;
        try {
            const newVal = await window.electronAPI.inventory.createAttributeValue(creatingValueFor, newValueName);
            const existing = attributeValues[creatingValueFor] || [];
            setAttributeValues({ ...attributeValues, [creatingValueFor]: [...existing, newVal] });

            // Auto update any row that is waiting for this? 
            // Better to just let user select it from the now-updated list.
            setNewValueName('');
            setCreatingValueFor(null);
        } catch (error) {
            console.error("Failed to create value", error);
        }
    };

    const attributes = data.attributes || [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">خصائص الصنف</h3>

                {!isCreatingAttr ? (
                    <button
                        onClick={() => setIsCreatingAttr(true)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                        <Plus size={16} /> تعريف خاصية جديدة
                    </button>
                ) : (
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                        <input
                            type="text"
                            className="border p-1 rounded text-sm w-40"
                            placeholder="اسم الخاصية (مثلاً: اللون)"
                            value={newAttrName}
                            onChange={e => setNewAttrName(e.target.value)}
                        />
                        <button onClick={handleCreateAttribute} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check size={16} /></button>
                        <button onClick={() => setIsCreatingAttr(false)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16} /></button>
                    </div>
                )}
            </div>

            {attributes.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-gray-500 mb-4">لا توجد خصائص محددة لهذا الصنف.</p>
                    <button onClick={handleAddRow} className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 flex items-center gap-2 mx-auto">
                        <Plus size={16} /> إضافة خاصية
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {attributes.map((row, index) => (
                        <div key={index} className="flex gap-4 items-start bg-gray-50 p-4 rounded border">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">الخاصية</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={row.attribute_id}
                                    onChange={(e) => handleChangeRow(index, 'attribute_id', e.target.value)}
                                >
                                    <option value="">اختر الخاصية...</option>
                                    {availableAttributes.map(attr => (
                                        <option key={attr.id} value={attr.id}>{attr.name_ar}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">القيمة</label>
                                {creatingValueFor === row.attribute_id ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded"
                                            placeholder="القيمة الجديدة..."
                                            value={newValueName}
                                            onChange={e => setNewValueName(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={handleCreateValue} className="text-emerald-600 hover:bg-emerald-100 p-2 rounded"><Check size={18} /></button>
                                        <button onClick={() => setCreatingValueFor(null)} className="text-red-500 hover:bg-red-100 p-2 rounded"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            className="w-full p-2 border rounded"
                                            value={row.value || ''} // Using value (text) to match
                                            onChange={(e) => {
                                                if (e.target.value === '__NEW__') {
                                                    setCreatingValueFor(row.attribute_id);
                                                    setNewValueName('');
                                                } else {
                                                    handleChangeRow(index, 'value', e.target.value);
                                                }
                                            }}
                                            disabled={!row.attribute_id}
                                        >
                                            <option value="">اختر القيمة...</option>
                                            {(attributeValues[row.attribute_id] || []).map(val => (
                                                <option key={val.id} value={val.value}>{val.value}</option>
                                            ))}
                                            <option value="__NEW__" className="text-emerald-600 font-bold">+ إضافة قيمة جديدة</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={() => handleRemoveRow(index)}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded"
                                    title="حذف"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button onClick={handleAddRow} className="mt-2 text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-medium">
                        <Plus size={16} /> إضافة سطر آخر
                    </button>
                </div>
            )}
        </div>
    );
};

export default ItemAttributesTab;
