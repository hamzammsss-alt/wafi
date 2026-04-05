import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, User, Briefcase, ChevronRight, ChevronDown, Check, X } from 'lucide-react';

interface Employee {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    full_name: string;
    job_title_name?: string;
    department_name?: string;
    mobile_phone?: string;
}

interface EmployeePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (employee: Employee) => void;
}

export const EmployeePicker: React.FC<EmployeePickerProps> = ({ isOpen, onClose, onSelect }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredData, setFilteredData] = useState<Employee[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            loadEmployees();
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Filter effect
    useEffect(() => {
        if (!search.trim()) {
            setFilteredData(employees);
            return;
        }

        const term = search.toLowerCase();
        const filtered = employees.filter(e =>
            (e.full_name && e.full_name.toLowerCase().includes(term)) ||
            (e.employee_code && e.employee_code.toLowerCase().includes(term)) ||
            (e.first_name && e.first_name.toLowerCase().includes(term)) ||
            (e.last_name && e.last_name.toLowerCase().includes(term)) ||
            (e.mobile_phone && e.mobile_phone.includes(term))
        );
        setFilteredData(filtered);
        setSelectedIndex(0);
    }, [search, employees]);

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

    const loadEmployees = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI && window.electronAPI.hr) {
                // @ts-ignore
                const data = await window.electronAPI.hr.getEmployees();
                setEmployees(data);
                setFilteredData(data);
            }
        } catch (err) {
            console.error(err);
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
                        <h3 className="font-bold text-gray-900 text-lg">اختيار موظف</h3>
                        <p className="text-xs text-gray-500 mt-1">استخدم الأسهم للتنقل و Enter للاختيار</p>
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
                            placeholder="بحث بالاسم، الرقم الوظيفي..."
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
                                {filteredData.map((emp, index) => {
                                    const isSelected = index === selectedIndex;
                                    return (
                                        <div
                                            key={emp.id}
                                            onClick={() => onSelect(emp)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border
                                                ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}
                                            `}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                <User size={16} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className="font-bold text-gray-800 text-sm truncate">{emp.full_name}</h4>
                                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{emp.employee_code}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                                                    <span>{emp.department_name || 'بدون قسم'}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span>{emp.job_title_name || 'بدون مسمى'}</span>
                                                </div>
                                            </div>

                                            {isSelected && <Check size={16} className="text-indigo-600" />}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center p-12 text-gray-400">
                                <User size={48} className="mx-auto mb-3 opacity-20" />
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
