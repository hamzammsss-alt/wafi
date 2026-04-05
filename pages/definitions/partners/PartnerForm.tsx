import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Phone, Mail, MapPin, CreditCard, Edit, Trash2, X,
    CheckCircle2, AlertCircle, Building, Globe, Save, User, FileText, Briefcase,
    Briefcase as WorkIcon, DollarSign
} from 'lucide-react';
import { BusinessPartner, Account } from '../../../types';
import { AccountPicker } from '../../../components/AccountPicker';

export const PartnerForm: React.FC = () => {
    // --- State ---
    // Single list for all "Partners" (Partners + Employees)
    const [partners, setPartners] = useState<BusinessPartner[]>([]);

    // Master Lists 
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [reps, setReps] = useState<any[]>([]);
    const [priceLists, setPriceLists] = useState<any[]>([]);

    // HR Master Lists
    const [jobTitles, setJobTitles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL'); // ALL, CUSTOMER, SUPPLIER, EMPLOYEE
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'financial' | 'hr'>('general');
    const [accountPickerOpen, setAccountPickerOpen] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Form State
    const initialFormState: Partial<BusinessPartner> = {
        name_ar: '',
        name_en: '',
        code: '',
        type: 'CUSTOMER', // Default
        is_active: 1,
        phone: '',
        mobile: '',
        email: '',
        website: '',
        address: '',
        city: '',
        region_id: '',
        group_id: '',
        sales_rep_id: '',
        linked_account_id: '',
        credit_limit: 0,
        payment_term_days: 0,
        tax_number: '',
        price_list_id: '',
        // HR Specific
        job_title_id: '',
        department_id: '',
        basic_salary: 0
    };
    const [formData, setFormData] = useState<Partial<BusinessPartner>>(initialFormState);

    // --- Effects ---
    useEffect(() => {
        loadData();
    }, []);

    // Auto-Set Default Parent Account based on Type
    useEffect(() => {
        if (!formData.id && !formData.linked_account_id) {
            // Only auto-set if creating new and field is empty
            const autoSelectCode =
                formData.type === 'CUSTOMER' ? '1131' :
                    formData.type === 'SUPPLIER' ? '2111' :
                        formData.type === 'EMPLOYEE' ? '1133' : null;

            if (autoSelectCode) {
                // We need to find the account by code
                // we have 'accounts' list (filtered to transactional?).
                // Wait, the picker filters transactional only? 
                // If 1131 is a Header, it might NOT be in 'accounts' state if we filtered it!
                // In loadData: setAccounts(fetchedAccounts?.filter((a: Account) => a.is_transactional === 1) || []);
                // ISSUE: We need headers too if we want to allow selecting them as parents.
                // Fix: We should probably load ALL accounts in state, and filter in Picker.

                // For now, let's assume we can fetch it or find it.
                // Since we filtered 'accounts' list in loadData, we might miss it.
                // Let's rely on an async fetch or check 'partners' logic? No.

                // Quick fix: Update loadData to NOT filter strictly? 
                // Or fetch specifically.

                const findAndSet = async () => {
                    // @ts-ignore
                    if (window.electronAPI) {
                        // @ts-ignore
                        // We can assume we have full tree or can fetch.
                        // Let's use the fetched/state accounts IF we update loadData.
                        // Or just fetch specific.
                        const accountsList = await window.electronAPI.getAccounts(); // This usually returns all
                        const target = accountsList.find((a: any) => a.account_code === autoSelectCode);
                        if (target) {
                            setFormData(prev => ({ ...prev, linked_account_id: target.id }));
                        }
                    }
                };
                findAndSet();
            }
        }
    }, [formData.type, formData.id]); // trigger on type change

    // --- Actions ---
    const loadData = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                const api = (window.electronAPI as any);
                // We fetch specific lists + HR lists
                const [
                    fetchedPartners,
                    fetchedAccounts,
                    fetchedRegions,
                    fetchedGroups,
                    fetchedReps,
                    fetchedPriceLists,
                    fetchedJobTitles,
                    fetchedDepartments
                ] = await Promise.all([
                    api.partner.getPartners(), // Fetch ALL types (Customer/Supplier/Employee)
                    api.getAccounts(),
                    api.partner.getRegions(),
                    api.partner.getGroups(),
                    api.partner.getSalesReps(),
                    api.partner.getPriceLists(),
                    api.hr.getTitles(),      // HR Service
                    api.hr.getDepartments()  // HR Service
                ]);

                setPartners(fetchedPartners || []);
                // Store ALL accounts to allow selecting Headers (Parents) for auto-creation
                // The Picker handles filtering transactional-only if needed, but here we need headers too.
                setAccounts(fetchedAccounts || []);
                setRegions(fetchedRegions || []);
                setGroups(fetchedGroups || []);
                setReps(fetchedReps || []);
                setPriceLists(fetchedPriceLists || []);
                setJobTitles(fetchedJobTitles || []);
                setDepartments(fetchedDepartments || []);
            }
        } catch (error) {
            console.error("Failed to load partner data", error);
            setFeedback({ type: 'error', message: 'فشل تحميل البيانات' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name_ar) {
            setFeedback({ type: 'error', message: 'الاسم العربي مطلوب' });
            return;
        }
        if (formData.type === 'EMPLOYEE' && !formData.mobile) {
            // Example validation for employee
            // setFeedback({ type: 'error', message: 'رقم الجوال مطلوب للموظف' });
            // return;
        }

        try {
            const api = (window as any).electronAPI?.partner;
            await api.savePartner(formData);

            setFeedback({ type: 'success', message: 'تم الحفظ بنجاح' });
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
        if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        try {
            await (window as any).electronAPI.partner.deletePartner(id);
            setFeedback({ type: 'success', message: 'تم الحذف بنجاح' });
            loadData();
            setTimeout(() => setFeedback(null), 3000);
        } catch (e: any) {
            alert('لا يمكن الحذف: ' + e.message);
        }
    };

    const handleEdit = (partner: BusinessPartner) => {
        setFormData({ ...partner });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setActiveTab('general');
    };

    // --- Filtering ---
    const filteredPartners = partners.filter(p => {
        const matchesSearch =
            p.name_ar.includes(searchTerm) ||
            (p.name_en && p.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
            p.code?.includes(searchTerm) ||
            p.phone?.includes(searchTerm) ||
            p.mobile?.includes(searchTerm);

        const matchesType = filterType === 'ALL' || p.type === filterType || (filterType !== 'EMPLOYEE' && p.type === 'BOTH');

        return matchesSearch && matchesType;
    });

    // --- Render Helpers ---
    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all duration-200 border-b-2 ${activeTab === id
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50 font-bold'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    const TypeBadge = ({ type }: { type: string }) => {
        const styles: Record<string, string> = {
            'CUSTOMER': 'bg-blue-100 text-blue-700',
            'SUPPLIER': 'bg-orange-100 text-orange-700',
            'EMPLOYEE': 'bg-purple-100 text-purple-700',
            'BOTH': 'bg-teal-100 text-teal-700'
        };
        const labels: Record<string, string> = {
            'CUSTOMER': 'زبون',
            'SUPPLIER': 'مورد',
            'EMPLOYEE': 'موظف',
            'BOTH': 'زبون ومورد'
        };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type] || 'bg-gray-100'}`}>{labels[type] || type}</span>;
    };

    return (
        <div className="h-full bg-gray-50 p-6 flex flex-col gap-6" dir="rtl">

            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100">
                        <Users size={28} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">العملاء</h1>
                        <p className="text-sm text-gray-500 mt-1">إدارة الزبائن، الموردين، والموظفين في مكان واحد</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg">
                    {['ALL', 'CUSTOMER', 'SUPPLIER', 'EMPLOYEE'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t === 'ALL' ? 'الكل' : t === 'CUSTOMER' ? 'زبائن' : t === 'SUPPLIER' ? 'موردين' : 'موظفين'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث شامل..."
                            className="w-full md:w-56 pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-emerald-200"
                    >
                        <Plus size={20} />
                        إضافة جديد
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white h-48 rounded-xl shadow-sm animate-pulse border border-gray-100 p-6">
                            {/* Skeleton */}
                        </div>
                    ))
                ) : (
                    filteredPartners.map(partner => (
                        <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col group">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center font-bold text-lg border border-gray-100">
                                        {partner.name_ar.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <TypeBadge type={partner.type} />
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${partner.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {partner.is_active ? 'نشط' : 'موقف'}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-1" title={partner.name_ar}>{partner.name_ar}</h3>
                                <p className="text-sm text-gray-500 mb-4 font-mono">{partner.code || '#'}</p>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{partner.phone || partner.mobile || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="truncate">{partner.city || '-'}</span>
                                    </div>
                                    {partner.type === 'EMPLOYEE' && (
                                        <div className="flex items-center gap-2 text-purple-600">
                                            <Briefcase size={14} />
                                            <span className="truncate">{partner.job_title_name || 'بدون مسمى'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 flex justify-end gap-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(partner)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(partner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {formData.id ? <Edit size={24} className="text-blue-500" /> : <Plus size={24} className="text-emerald-500" />}
                                {formData.id ? 'تعديل البطاقة' : 'إضافة بطاقة جديدة'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
                            <TabButton id="general" label="بيانات أساسية" icon={User} />
                            <TabButton id="contact" label="الاتصال" icon={MapPin} />

                            {formData.type !== 'EMPLOYEE' && (
                                <TabButton id="financial" label="بيانات تجارية" icon={CreditCard} />
                            )}

                            {formData.type === 'EMPLOYEE' && (
                                <TabButton id="hr" label="بيانات وظيفية" icon={Briefcase} />
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            {feedback && (
                                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    <span className="font-medium">{feedback.message}</span>
                                </div>
                            )}

                            {/* TAB: GENERAL */}
                            {activeTab === 'general' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">

                                    {/* Type Selector */}
                                    <div className="col-span-2 bg-white p-4 rounded-xl border border-gray-200 mb-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">نوع الحساب (Partner Type)</label>
                                        <div className="flex gap-4">
                                            {[
                                                { id: 'CUSTOMER', label: 'زبون (Customer)' },
                                                { id: 'SUPPLIER', label: 'مورد (Supplier)' },
                                                { id: 'EMPLOYEE', label: 'موظف (Employee)' },
                                                { id: 'BOTH', label: 'زبون ومورد' }
                                            ].map(opt => (
                                                <label key={opt.id} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.type === opt.id
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm'
                                                    : 'border-gray-100 bg-gray-50 hover:bg-white text-gray-500'
                                                    }`}>
                                                    <input
                                                        type="radio"
                                                        name="type"
                                                        className="hidden"
                                                        checked={formData.type === opt.id}
                                                        onChange={() => setFormData({ ...formData, type: opt.id as any })}
                                                        disabled={!!formData.id} // Lock type on edit to avoid data mess
                                                    />
                                                    {opt.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم العربي <span className="text-red-500">*</span></label>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                                            value={formData.name_ar}
                                            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                            placeholder="الاسم الكامل"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الإنجليزي</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-left"
                                            dir="ltr"
                                            value={formData.name_en || ''}
                                            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                            placeholder="English Name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الرمز (Code)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-mono"
                                            value={formData.code || ''}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            placeholder="تلقائي"
                                        />
                                    </div>

                                    {formData.type !== 'EMPLOYEE' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">المجموعة (Group)</label>
                                            <select
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all bg-white"
                                                value={formData.group_id || ''}
                                                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                            >
                                                <option value="">-- اختر مجموعة --</option>
                                                {groups.map(g => <option key={g.id} value={g.id}>{g.name_ar}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="col-span-2 bg-white p-4 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                                                checked={formData.is_active === 1}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                            />
                                            <label htmlFor="isActive" className="text-gray-800 font-medium cursor-pointer select-none">
                                                نشط (Active)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: CONTACT */}
                            {activeTab === 'contact' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                                    {/* Same as before... reusing Phone/Mobile/Address */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الهاتف</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الجوال</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none"
                                            value={formData.mobile || ''}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">العنوان</label>
                                        <textarea
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none"
                                            value={formData.address || ''}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB: FINANCIAL (Customers/Suppliers ONLY) */}
                            {activeTab === 'financial' && formData.type !== 'EMPLOYEE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2">
                                        <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                                            <Building size={16} />
                                            الحساب المحاسبي المرتبط
                                        </label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                className="w-full px-4 py-2.5 rounded-lg border border-blue-200 outline-none bg-white cursor-pointer hover:bg-blue-50 transition-colors"
                                                value={partners.find(p => p.id === formData.id)?.linked_account_id ? (accounts.find(a => a.id === formData.linked_account_id)?.name_ar || 'تم الاختيار') : (accounts.find(a => a.id === formData.linked_account_id)?.name_ar || '')}
                                                // Actually better to just show the name if we can find it
                                                // Current issue: we only have 'accounts' list which might be filtered.
                                                // Let's use a function to get name or just show 'Click to select'
                                                placeholder="اضغط لاختيار الحساب..."
                                                onClick={() => setAccountPickerOpen(true)}
                                            />
                                            {formData.linked_account_id && (
                                                <button onClick={() => setFormData({ ...formData, linked_account_id: '' })} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                        {/* Helper Text */}
                                        <p className="text-xs text-blue-400 mt-1">يترك فارغاً إذا كنت تريد استخدام الحساب الافتراضي</p>
                                    </div>

                                    <AccountPicker
                                        isOpen={accountPickerOpen}
                                        onClose={() => setAccountPickerOpen(false)}
                                        onSelect={(acc) => {
                                            setFormData({ ...formData, linked_account_id: acc.id });
                                            setAccountPickerOpen(false);
                                        }}
                                        showTransactionalOnly={false}
                                        allowedPrefixes={
                                            formData.type === 'CUSTOMER' ? ['1'] :
                                                formData.type === 'SUPPLIER' ? ['2'] :
                                                    (formData.type as string) === 'EMPLOYEE' ? ['1', '2'] :
                                                        undefined
                                        }
                                    />
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">سقف الدين</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none"
                                            value={formData.credit_limit || 0}
                                            onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                                        />
                                    </div>
                                    {/* Other financial fields (Terms, Tax, etc.) */}
                                </div>
                            )}

                            {/* TAB: HR (Employees ONLY) */}
                            {activeTab === 'hr' && formData.type === 'EMPLOYEE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">المسمى الوظيفي</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none bg-white"
                                            value={formData.job_title_id || ''}
                                            onChange={(e) => setFormData({ ...formData, job_title_id: e.target.value })}
                                        >
                                            <option value="">-- اختر مسمى --</option>
                                            {jobTitles.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">القسم</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none bg-white"
                                            value={formData.department_id || ''}
                                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                        >
                                            <option value="">-- اختر قسم --</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">الراتب الأساسي</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none"
                                            value={formData.basic_salary || 0}
                                            onChange={(e) => setFormData({ ...formData, basic_salary: Number(e.target.value) })}
                                        />
                                    </div>
                                    {/* Linked Account for Payroll logic if needed */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">حساب السلف/العهد</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none bg-white"
                                            value={formData.linked_account_id || ''}
                                            onChange={(e) => setFormData({ ...formData, linked_account_id: e.target.value })}
                                        >
                                            <option value="">-- اختر حساب --</option>
                                            {accounts.map(a => (
                                                <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium">إلغاء</button>
                            <button onClick={handleSave} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-lg flex items-center gap-2">
                                <Save size={18} />
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
