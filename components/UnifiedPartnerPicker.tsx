import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, User, Briefcase, ChevronRight, ChevronDown, Check, X, Building2 } from 'lucide-react';

export interface UnifiedPartner {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
    code: string;
    name: string;
    description?: string; // e.g. Phone, Job Title
    secondary_description?: string; // e.g. Tax No, Dept
    raw_data: any; // Keep original object for specific logic
    linked_account_id?: string;
}

interface UnifiedPartnerPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (partner: UnifiedPartner) => void;
    type?: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
}

export const UnifiedPartnerPicker: React.FC<UnifiedPartnerPickerProps> = ({ isOpen, onClose, onSelect, type }) => {
    const [partners, setPartners] = useState<UnifiedPartner[]>([]);
    const [filteredData, setFilteredData] = useState<UnifiedPartner[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            loadAllData();
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Filter effect
    useEffect(() => {
        let filtered = partners;

        // 1. Filter by Type (if prop provided)
        if (type) {
            filtered = filtered.filter(p => p.type === type);
        }

        // 2. Filter by Search
        if (search.trim()) {
            const term = search.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.code.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }

        setFilteredData(filtered);
        setSelectedIndex(0);
    }, [search, partners, type]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredData.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && filteredData[selectedIndex]) {
                e.preventDefault();
                onSelect(filteredData[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredData, onSelect, onClose]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                const combined: UnifiedPartner[] = [];

                // 1. Customers
                // @ts-ignore
                if (window.electronAPI.partner) {
                    // @ts-ignore
                    const customers = await window.electronAPI.partner.getPartners('CUSTOMER');
                    if (customers) {
                        combined.push(...customers.map((c: any) => ({
                            id: c.id,
                            type: 'CUSTOMER' as const,
                            code: c.code || '',
                            name: c.name_ar || c.name_en || 'بدون اسم',
                            description: c.phone || c.mobile || '',
                            secondary_description: c.tax_number ? `ضريبي: ${c.tax_number}` : undefined,
                            raw_data: c,
                            linked_account_id: c.linked_account_id // Pass through
                        })));
                    }

                    // 2. Suppliers
                    // @ts-ignore
                    const suppliers = await window.electronAPI.partner.getPartners('SUPPLIER');
                    if (suppliers) {
                        combined.push(...suppliers.map((s: any) => ({
                            id: s.id,
                            type: 'SUPPLIER' as const,
                            code: s.code || '',
                            name: s.name_ar || s.name_en || 'بدون اسم',
                            description: s.phone || s.mobile || '',
                            secondary_description: s.tax_number ? `ضريبي: ${s.tax_number}` : undefined,
                            raw_data: s,
                            linked_account_id: s.linked_account_id // Pass through
                        })));
                    }
                }

                // 3. Employees
                // @ts-ignore
                if (window.electronAPI.hr) {
                    // @ts-ignore
                    const employees = await window.electronAPI.hr.getEmployees();
                    if (employees) {
                        combined.push(...employees.map((e: any) => ({
                            id: e.id,
                            type: 'EMPLOYEE' as const,
                            code: e.employee_code || '',
                            name: e.full_name || 'بدون اسم',
                            description: e.job_title_name || '',
                            secondary_description: e.department_name || '',
                            raw_data: e,
                            linked_account_id: e.linked_account_id // Pass through
                        })));
                    }
                }

                setPartners(combined);
                setFilteredData(combined);
            }
        } catch (err) {
            console.error("Failed to load unified partners", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl" style={{ zIndex: 9999999 }}>
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">اختيار المستلم</h3>
                        <p className="text-xs text-gray-500 mt-1">ابحث في العملاء، الموردين، والموظفين</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-gray-100 bg-white shadow-sm z-10">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث بالاسم، الرقم، أو الهاتف..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg pr-10 pl-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-white">
                    {loading ? (
                        <div className="flex justify-center p-8 text-gray-500">جاري التحميل...</div>
                    ) : (
                        filteredData.length > 0 ? (
                            <div className="space-y-1">
                                {filteredData.map((item, index) => {
                                    const isSelected = index === selectedIndex;
                                    return (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            onClick={() => onSelect(item)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border
                                                ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}
                                            `}
                                        >
                                            {/* Icon Logic */}
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 
                                                ${item.type === 'CUSTOMER' ? 'bg-blue-100 text-blue-600' :
                                                    item.type === 'SUPPLIER' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-purple-100 text-purple-600'}`}>
                                                {item.type === 'CUSTOMER' ? <User size={18} /> :
                                                    item.type === 'SUPPLIER' ? <Building2 size={18} /> :
                                                        <Briefcase size={18} />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.type === 'CUSTOMER' ? 'bg-blue-50 text-blue-700' :
                                                            item.type === 'SUPPLIER' ? 'bg-orange-50 text-orange-700' :
                                                                'bg-purple-50 text-purple-700'
                                                            }`}>{
                                                                item.type === 'CUSTOMER' ? 'عميل' :
                                                                    item.type === 'SUPPLIER' ? 'مورد' :
                                                                        'موظف'
                                                            }</span>
                                                        <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item.code}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                                                    <span>{item.description || '---'}</span>
                                                    {item.secondary_description && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                            <span>{item.secondary_description}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {isSelected && <Check size={18} className="text-indigo-600" />}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center p-12 text-gray-400">
                                <Search size={48} className="mx-auto mb-3 opacity-20" />
                                <p>لا توجد نتائج مطابقة</p>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium flex justify-between items-center">
                    <span>العدد: <span className="font-bold text-gray-900">{filteredData.length}</span></span>

                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5">↑↓</kbd> للتنقل</span>
                        <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5">Enter</kbd> للاختيار</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};
