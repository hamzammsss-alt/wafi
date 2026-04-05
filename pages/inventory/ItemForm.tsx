import React, { useState, useEffect } from 'react';
import { Item, Unit, Brand } from '../../types';
import ItemGeneralTab from './components/ItemGeneralTab';
import ItemUnitsTab from './components/ItemUnitsTab';
import ItemPricingTab from './components/ItemPricingTab';
import ItemSettingsTab from './components/ItemSettingsTab';
import ItemAttributesTab from './components/ItemAttributesTab';
import ItemBatchSerialTab from './components/ItemBatchSerialTab';
import ItemAlternativesTab from './components/ItemAlternativesTab';
import ItemKitTab from './components/ItemKitTab';

interface ItemFormProps {
    item?: Partial<Item>;
    onSave: (item: Partial<Item>) => Promise<void>;
    onCancel: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState<Partial<Item>>(item || {
        is_active: 1,
        type: 'Goods',
        cost_price: 0,
        sale_price: 0,
        tax_included: 0,
        has_expiry: 0,
        has_serial: 0,
        additional_units: [],
        prices: [],
        kit_items: []
    });

    const [loading, setLoading] = useState(false);

    // Fetch Kit Items if editing (since they might not be loaded initially in item prop if we didn't update getItemDetails)
    useEffect(() => {
        const fetchKits = async () => {
            if (item && item.id) {
                // If item passed doesn't have kit_items loaded (depends on getItemDetails), fetch them specific call?
                // Actually getItemDetails implementation didn't include kits query yet.
                // Assuming we update InventoryService.getItemDetails too if we want them to show up on edit load.
                // For now, let's assume they are passed if we did our backend job right. 
                // Wait, I didn't update getItemDetails in backend. I should do that or fetch here.
                const kits = await window.electronAPI.inventory.getKit(item.id);
                if (kits && kits.length > 0) {
                    setFormData(prev => ({ ...prev, kit_items: kits }));
                }
            }
        };
        fetchKits();
    }, [item]);

    const checkRequiredFields = () => {
        if (!formData.code) return "رمز الصنف مطلوب";
        if (!formData.name_ar) return "اسم الصنف عربي مطلوب";
        if (!formData.base_unit_id) return "الوحدة الأساسية مطلوبة";
        return null;
    };

    const handleSave = async () => {
        const error = checkRequiredFields();
        if (error) {
            alert(error);
            return;
        }
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error(error);
            alert("فشل الحفظ: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return <ItemGeneralTab data={formData} onChange={setFormData} />;
            case 'units':
                return <ItemUnitsTab data={formData} onChange={setFormData} />;
            case 'pricing':
                return <ItemPricingTab data={formData} onChange={setFormData} />;
            case 'settings':
                return <ItemSettingsTab data={formData} onChange={setFormData} />;
            case 'attributes':
                return <ItemAttributesTab data={formData} onChange={setFormData} />;
            case 'batch_serial':
                return <ItemBatchSerialTab data={formData} onChange={setFormData} />;
            case 'alternatives':
                return <ItemAlternativesTab data={formData} onChange={setFormData} />;
            case 'components':
                return <ItemKitTab data={formData} onChange={setFormData} />;
            default:
                return null;
        }
    };

    const tabs = [
        { id: 'general', label: 'البيانات العامة' },
        { id: 'units', label: 'الوحدات والباركود' },
        { id: 'pricing', label: 'الأسعار' },
        { id: 'settings', label: 'إعدادات المخزون' },
        { id: 'attributes', label: 'الخصائص' },
        { id: 'batch_serial', label: 'الصلاحية والتسلسل' },
        { id: 'alternatives', label: 'البدائل' },
    ];

    // Conditionally add Kit tab
    if (formData.type !== 'Service') { // Allow for goods or if we have 'Manufactured' type
        tabs.push({ id: 'components', label: 'المكونات (Kit)' });
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col" dir="rtl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">{item ? 'تعديل صنف' : 'إضافة صنف جديد'}</h2>
                <div className="space-x-2 space-x-reverse">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {loading ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                    >
                        إلغاء
                    </button>
                </div>
            </div>

            {/* Tabs Header */}
            <div className="flex space-x-1 space-x-reverse border-b mb-6 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 font-medium transition-colors duration-200 whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-1">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default ItemForm;
