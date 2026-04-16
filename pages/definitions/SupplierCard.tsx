import React, { useState, useEffect } from 'react';
import {
    Truck, Plus, Search, Phone, Mail, MapPin, CreditCard, Edit, Trash2, X,
    CheckCircle2, AlertCircle, Building, Globe, Save, User, FileText, Briefcase, Boxes
} from 'lucide-react';
import { BusinessPartner, Account } from '../../types';
import { WorkspaceHeader } from '../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../src/hooks/useCreateIntent';

export const SupplierCard: React.FC = () => {
    // --- State ---
    const [suppliers, setSuppliers] = useState<BusinessPartner[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'financial'>('general');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<BusinessPartner>>({
        name_ar: '',
        name_en: '',
        code: '',
        type: 'SUPPLIER',
        is_active: 1,
        phone: '',
        mobile: '',
        email: '',
        website: '',
        address: '',
        city: '',
        region_id: '',
        group_id: '',
        linked_account_id: '',
        credit_limit: 0,
        payment_term_days: 0,
        tax_number: '',
    });

    // --- Effects ---
    useEffect(() => {
        loadData();
    }, []);

    // --- Actions ---
    const loadData = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                const api = (window.electronAPI as any);
                const [fetchedSuppliers, fetchedAccounts, fetchedRegions, fetchedGroups] = await Promise.all([
                    api.partner.getPartners('SUPPLIER'),
                    api.getAccounts(),
                    api.partner.getRegions(),
                    api.partner.getGroups()
                ]);

                setSuppliers(fetchedSuppliers || []);
                // Filter transactional Liability accounts (Payables)
                setAccounts(fetchedAccounts?.filter((a: Account) => (a.account_type === 'LIABILITY' || a.account_type === 'Payable') && a.is_transactional === 1) || []);
                setRegions(fetchedRegions || []);
                setGroups(fetchedGroups || []);
            }
        } catch (error) {
            console.error("Failed to load supplier data", error);
            setFeedback({ type: 'error', message: 'فشل تحميل البيانات' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name_ar) {
            setFeedback({ type: 'error', message: 'اسم المورد مطلوب' });
            return;
        }

        try {
            const api = (window as any).electronAPI?.partner;
            await api.savePartner(formData);

            setFeedback({ type: 'success', message: 'تم حفظ بيانات المورد بنجاح' });
            loadData();

            setTimeout(() => {
                setIsModalOpen(false);
                resetForm();
                setFeedback(null);
            }, 1000);
        } catch (e: any) {
            console.error(e);
            setFeedback({ type: 'error', message: e.message || 'حدث خطأ أثناء الحفظ' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        try {
            await (window as any).electronAPI.partner.deletePartner(id);
            setFeedback({ type: 'success', message: 'تم حذف المورد بنجاح' });
            loadData();
            setTimeout(() => setFeedback(null), 3000);
        } catch (e: any) {
            alert('لا يمكن حذف المورد: ' + e.message);
        }
    };

    const handleEdit = (supplier: BusinessPartner) => {
        setFormData({ ...supplier });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name_ar: '',
            name_en: '',
            code: '',
            type: 'SUPPLIER',
            is_active: 1,
            phone: '',
            mobile: '',
            email: '',
            website: '',
            address: '',
            city: '',
            region_id: '',
            group_id: '',
            linked_account_id: '',
            credit_limit: 0,
            payment_term_days: 0,
            tax_number: '',
        });
        setActiveTab('general');
    };

    const openCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    useCreateIntent(openCreate);

    // --- Filtering ---
    const filteredSuppliers = suppliers.filter(s =>
        s.name_ar.includes(searchTerm) ||
        (s.name_en && s.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.code?.includes(searchTerm) ||
        s.phone?.includes(searchTerm) ||
        s.mobile?.includes(searchTerm)
    );

    // --- Render Helpers ---
    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all duration-200 border-b-2 ${activeTab === id
                ? 'border-indigo-500 text-indigo-700 bg-indigo-50 font-bold'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="app-page h-full flex flex-col gap-4" dir="rtl">
            <WorkspaceHeader
                icon={<Truck size={24} />}
                title="بطاقة مورد"
                subtitle="إدارة بيانات الموردين والذمم الدائنة"
                badges={[
                    { label: `الإجمالي ${suppliers.length}`, tone: 'warning' },
                    { label: `المعروض ${filteredSuppliers.length}`, tone: 'success' },
                    { label: `الحسابات ${accounts.length}`, tone: 'info' },
                ]}
                actions={
                    <>
                        <div className="relative group">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="بحث (اسم، رقم، هاتف)..."
                                className="w-full md:w-64 pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={openCreate}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-indigo-200"
                        >
                            <Plus size={20} />
                            مورد جديد
                        </button>
                    </>
                }
            />

            {/* Header Section */}
            <div className="hidden card p-6 flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100">
                        <Truck size={28} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">بطاقة مــورد</h1>
                        <p className="text-sm text-gray-500 mt-1">إدارة بيانات الموردين والذمم الدائنة</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث (اسم، رقم، هاتف)..."
                            className="w-full md:w-64 pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} />
                        مورد جديد
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white h-48 rounded-xl shadow-sm animate-pulse border border-gray-100 p-6">
                            <div className="flex gap-4 mb-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="space-y-2 mt-6">
                                <div className="h-3 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    filteredSuppliers.map(supplier => (
                        <div key={supplier.id} className="card hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col group">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                                        {supplier.name_ar.charAt(0)}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${supplier.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {supplier.is_active ? 'نشط' : 'موقف'}
                                    </span>
                                </div>

                                <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-1" title={supplier.name_ar}>{supplier.name_ar}</h3>
                                <p className="text-sm text-gray-500 mb-4">{supplier.code || 'بدون كود'}</p>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{supplier.phone || supplier.mobile || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="truncate">{supplier.city || '-'} - {supplier.address || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={14} className="text-gray-400" />
                                        <span className={supplier.credit_limit ? 'text-gray-700' : 'text-gray-400'}>
                                            {supplier.credit_limit ? `سقف: ${supplier.credit_limit.toLocaleString()}` : 'لا يوجد سقف دين'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 flex justify-end gap-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(supplier)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(supplier.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Empty State */}
            {!isLoading && filteredSuppliers.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <Search size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">لا توجد نتائج مطابقة</p>
                    <p className="text-sm">جرب البحث بكلمات مختلفة أو أضف مورد جديد</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {formData.id ? <Edit className="text-blue-500" size={24} /> : <Plus className="text-indigo-500" size={24} />}
                                {formData.id ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
                            <TabButton id="general" label="بيانات أساسية" icon={User} />
                            <TabButton id="contact" label="العنوان والاتصال" icon={MapPin} />
                            <TabButton id="financial" label="بيانات مالية" icon={CreditCard} />
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            {feedback && (
                                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    <span className="font-medium">{feedback.message}</span>
                                </div>
                            )}

                            {/* TAB: GENERAL */}
                            {activeTab === 'general' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم العربي <span className="text-red-500">*</span></label>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.name_ar}
                                            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                            placeholder="اسم المورد بالعربية"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الإنجليزي</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-left"
                                            dir="ltr"
                                            value={formData.name_en || ''}
                                            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                            placeholder="Supplier Name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">رمز المورد (Code)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-mono"
                                            value={formData.code || ''}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            placeholder="تلقائي إذا ترك فارغاً"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">المجموعة (Group)</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white"
                                            value={formData.group_id || ''}
                                            onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                        >
                                            <option value="">-- اختر مجموعة --</option>
                                            {groups.map(g => <option key={g.id} value={g.id}>{g.name_ar}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-span-2 bg-white p-4 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                checked={formData.is_active === 1}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                            />
                                            <label htmlFor="isActive" className="text-gray-800 font-medium cursor-pointer select-none">
                                                حساب نشط (Active)
                                                <p className="text-xs text-gray-500 font-normal mt-0.5">إلغاء التفعيل يمنع إنشاء فواتير جديدة لهذا المورد</p>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: CONTACT */}
                            {activeTab === 'contact' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الهاتف</label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                value={formData.phone || ''}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الجوال</label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                value={formData.mobile || ''}
                                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-left"
                                                dir="ltr"
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">المدينة</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.city || ''}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">المنطقة</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white"
                                            value={formData.region_id || ''}
                                            onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                                        >
                                            <option value="">-- اختر منطقة --</option>
                                            {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">العنوان التفصيلي</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none"
                                            value={formData.address || ''}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="اسم الشارع، رقم المبنى، علامة مميزة..."
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الموقع الإلكتروني</label>
                                        <div className="relative">
                                            <Globe className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-left"
                                                dir="ltr"
                                                value={formData.website || ''}
                                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="www.example.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: FINANCIAL */}
                            {activeTab === 'financial' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2">
                                        <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                                            <Building size={16} />
                                            الحساب المرتبط (Linked Account)
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white"
                                            value={formData.linked_account_id || ''}
                                            onChange={(e) => setFormData({ ...formData, linked_account_id: e.target.value })}
                                        >
                                            <option value="">-- اختر حساب ذمم (Liabilities/Payables) --</option>
                                            {accounts.map(a => (
                                                <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-blue-600 mt-2">
                                            يتم ترحيل الفواتير والسندات إلى هذا الحساب في المحاسبة العامة تلقائياً.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">سقف الدين (Credit Limit)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.credit_limit || 0}
                                            onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">فترة الاستحقاق (أيام)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.payment_term_days || 0}
                                            onChange={(e) => setFormData({ ...formData, payment_term_days: Number(e.target.value) })}
                                            placeholder="30"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الرقم الضريبي</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.tax_number || ''}
                                            onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                <Save size={18} />
                                حفظ البيانات
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

