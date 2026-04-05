import React, { useState, useEffect } from 'react';
import { Item, ItemAlternative } from '../../../types';
import { Search, Plus, Trash2, Link } from 'lucide-react';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemAlternativesTab: React.FC<Props> = ({ data, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [availableItems, setAvailableItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredItems([]);
            return;
        }

        const lower = searchTerm.toLowerCase();
        const results = availableItems.filter(i =>
            i.id !== data.id && // Exclude self
            (i.name_ar.includes(lower) ||
                i.code.includes(lower) ||
                (i.name_en && i.name_en.toLowerCase().includes(lower)))
        ).slice(0, 10); // Limit results
        setFilteredItems(results);
    }, [searchTerm, availableItems, data.id]);

    const loadItems = async () => {
        try {
            const items = await window.electronAPI.inventory.getItems();
            setAvailableItems(items);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddItem = (item: Item) => {
        const current = data.alternatives || [];
        // Check duplicate
        if (current.some(a => a.alternative_item_id === item.id)) {
            alert('هذا الصنف مضاف بالفعل كبديل');
            return;
        }

        const newAlt: ItemAlternative = {
            item_id: data.id || '',
            alternative_item_id: item.id,
            item_name: item.name_ar,
            code: item.code,
            note: ''
        };

        onChange({ ...data, alternatives: [...current, newAlt] });
        setSearchTerm('');
        setShowResults(false);
    };

    const handleRemove = (index: number) => {
        const current = [...(data.alternatives || [])];
        current.splice(index, 1);
        onChange({ ...data, alternatives: current });
    };

    const handleNoteChange = (index: number, note: string) => {
        const current = [...(data.alternatives || [])];
        current[index] = { ...current[index], note };
        onChange({ ...data, alternatives: current });
    };

    return (
        <div className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Link className="text-blue-600" size={24} />
                الأصناف البديلة
            </h3>

            {/* Search Box */}
            <div className="relative mb-6">
                <div className="flex items-center border-2 border-gray-300 rounded-lg p-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <Search className="text-gray-400 ml-2" size={20} />
                    <input
                        type="text"
                        className="flex-1 outline-none text-gray-700"
                        placeholder="ابحث عن صنف لإضافته كبديل (الاسم أو الرمز)..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setShowResults(true); }}
                        onFocus={() => setShowResults(true)}
                    />
                </div>

                {/* Dropdown Results */}
                {showResults && filteredItems.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border shadow-xl rounded-lg mt-1 z-10 max-h-60 overflow-y-auto">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-0"
                                onClick={() => handleAddItem(item)}
                            >
                                <div>
                                    <div className="font-bold text-gray-800">{item.name_ar}</div>
                                    <div className="text-xs text-gray-500">{item.code} | {item.brand_name}</div>
                                </div>
                                <Plus size={16} className="text-blue-600" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-3">
                {(!data.alternatives || data.alternatives.length === 0) ? (
                    <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">
                        لا توجد أصناف بديلة مضافة.
                    </div>
                ) : (
                    data.alternatives.map((alt, index) => (
                        <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                <Link size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800">{alt.item_name || 'صنف غير معروف'}</h4>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    <span className="bg-gray-100 px-1 rounded">رمز: {alt.code || '---'}</span>
                                </div>
                            </div>
                            <div className="w-1/3">
                                <input
                                    type="text"
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder="ملاحظات (اختياري)"
                                    value={alt.note || ''}
                                    onChange={e => handleNoteChange(index, e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handleRemove(index)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ItemAlternativesTab;
