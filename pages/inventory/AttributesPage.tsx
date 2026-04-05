import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, CheckCircle2, AlertCircle, Search, ArrowRight, ArrowLeft } from 'lucide-react';

import { Attribute, AttributeValue } from '../../types';

export const AttributesPage: React.FC = () => {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Forms State
    const [attrForm, setAttrForm] = useState<Partial<Attribute>>({ name_ar: '', type: 'TEXT' });
    const [valueForm, setValueForm] = useState<Partial<AttributeValue>>({ value: '' });
    const [isAttrEditing, setIsAttrEditing] = useState(false);
    const [isValueEditing, setIsValueEditing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const data = await window.electronAPI.inventory.getAttributes();
                setAttributes(data || []);
                if (selectedAttribute) {
                    // Update selected attribute data
                    const updated = data.find((a: Attribute) => a.id === selectedAttribute.id);
                    if (updated) setSelectedAttribute(updated);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAttribute = async () => {
        if (!attrForm.name_ar) return;
        try {
            // @ts-ignore
            await window.electronAPI.inventory.saveAttribute(attrForm);
            setFeedback({ type: 'success', message: 'تم حفظ السمة بنجاح' });
            setAttrForm({ name_ar: '', type: 'TEXT' });
            setIsAttrEditing(false);
            loadData();
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        }
    };

    const handleDeleteAttribute = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه السمة؟ سيتم حذف جميع القيم المرتبطة.')) return;
        try {
            // @ts-ignore
            await window.electronAPI.inventory.deleteAttribute(id);
            if (selectedAttribute?.id === id) setSelectedAttribute(null);
            loadData();
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        }
    };

    const handleSaveValue = async () => {
        if (!valueForm.value || !selectedAttribute) return;
        try {
            // @ts-ignore
            await window.electronAPI.inventory.saveAttributeValue({ ...valueForm, attribute_id: selectedAttribute.id });
            setFeedback({ type: 'success', message: 'تم حفظ القيمة بنجاح' });
            setValueForm({ value: '' });
            setIsValueEditing(false);
            loadData();
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        }
    };

    const handleDeleteValue = async (id: string) => {
        if (!confirm('حذف هذه القيمة؟')) return;
        try {
            // @ts-ignore
            await window.electronAPI.inventory.deleteAttributeValue(id);
            loadData();
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message });
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <Tag className="text-purple-600" />
                        تعاريف السمات (Attributes)
                    </h1>
                    <p className="text-gray-500 text-sm">إدارة أنواع السمات (مثل الألوان والمقاسات) وقيمها المتاحة.</p>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {feedback.message}
                    <button onClick={() => setFeedback(null)} className="mr-auto opacity-50 hover:opacity-100"><span className="text-xl">&times;</span></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
                {/* Left Column: Attributes List */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">أنواع السمات</h3>
                    </div>

                    {/* Add Attribute Form */}
                    <div className="p-4 border-b border-dashed bg-purple-50">
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:border-purple-500 outline-none"
                            placeholder="اسم السمة (مثلاً: اللون)"
                            value={attrForm.name_ar}
                            onChange={e => setAttrForm({ ...attrForm, name_ar: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <select
                                className="border rounded-lg px-2 py-2 text-xs flex-1 bg-white"
                                value={attrForm.type}
                                // @ts-ignore
                                onChange={e => setAttrForm({ ...attrForm, type: e.target.value })}
                            >
                                <option value="TEXT">نص (Text)</option>
                                <option value="SELECT">قائمة منسدلة (Select)</option>
                                <option value="NUMBER">رقم (Number)</option>
                            </select>
                            <button
                                onClick={handleSaveAttribute}
                                disabled={!attrForm.name_ar}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition"
                            >
                                {isAttrEditing ? 'حفظ' : 'إضافة'}
                            </button>
                            {isAttrEditing && (
                                <button onClick={() => { setIsAttrEditing(false); setAttrForm({ name_ar: '', type: 'TEXT' }); }} className="text-gray-500 hover:text-gray-700 px-2">إلغاء</button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {attributes.map(attr => (
                            <div
                                key={attr.id}
                                onClick={() => { setSelectedAttribute(attr); setIsValueEditing(false); setValueForm({ value: '' }); }}
                                className={`p-3 rounded-xl cursor-pointer border transition flex justify-between items-center group ${selectedAttribute?.id === attr.id ? 'bg-purple-50 border-purple-200 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}
                            >
                                <div>
                                    <div className="font-bold text-gray-800">{attr.name_ar}</div>
                                    <div className="text-xs text-gray-400">{attr.type}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={(e) => { e.stopPropagation(); setAttrForm(attr); setIsAttrEditing(true); }} className="p-1 hover:bg-blue-100 text-blue-600 rounded"><Edit size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAttribute(attr.id); }} className="p-1 hover:bg-red-100 text-red-600 rounded"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {attributes.length === 0 && !isLoading && (
                            <div className="text-center py-10 text-gray-400 text-sm">لا توجد سمات معرفة</div>
                        )}
                    </div>
                </div>

                {/* Right Column: Values for Selected Attribute */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                    {!selectedAttribute ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                            <Tag size={64} className="mb-4 opacity-20" />
                            <p>اختر سمة من القائمة لعرض وإدارة قيمها</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    قيم السمة: <span className="text-purple-600">{selectedAttribute.name_ar}</span>
                                </h3>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{selectedAttribute.values?.length || 0} قيمة</span>
                            </div>

                            {/* Add Value Form */}
                            <div className="p-4 border-b border-dashed bg-blue-50/50">
                                <form onSubmit={(e) => { e.preventDefault(); handleSaveValue(); }} className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        placeholder={`أضف قيمة جديدة لـ ${selectedAttribute.name_ar}...`}
                                        value={valueForm.value}
                                        onChange={e => setValueForm({ ...valueForm, value: e.target.value })}
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!valueForm.value}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
                                    >
                                        {isValueEditing ? 'حفظ التعديل' : <><Plus size={16} /> إضافة قيمة</>}
                                    </button>
                                    {isValueEditing && (
                                        <button type="button" onClick={() => { setIsValueEditing(false); setValueForm({ value: '' }); }} className="text-gray-500 hover:text-gray-700 px-2">إلغاء</button>
                                    )}
                                </form>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {selectedAttribute.values?.map(val => (
                                        <div key={val.id} className="group flex justify-between items-center p-3 rounded-lg border hover:border-blue-200 hover:shadow-sm bg-gray-50 hover:bg-white transition">
                                            <span className="font-medium text-gray-700">{val.value}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => { setValueForm(val); setIsValueEditing(true); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit size={14} /></button>
                                                <button onClick={() => handleDeleteValue(val.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {(selectedAttribute.values?.length || 0) === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-sm">لا توجد قيم مضافة لهذه السمة بعد.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
