import React, { useState, useEffect } from 'react';
import { User, Plus, Search, Filter, Edit, Eye, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../src/contexts/TabsContext';

const EmployeeListPage = () => {
    const navigate = useNavigate();
    const { openTab, navigateInTab } = useTabs();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.getEmployees();
            setEmployees(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.first_name?.includes(search) ||
        e.last_name?.includes(search) ||
        e.employee_code?.includes(search)
    );

    return (
        <div className="app-page" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">إدارة الموظفين</h1>
                    <p className="text-sm text-gray-500 mt-1">قائمة بجميع موظفين الشركة ({filteredEmployees.length} موظف)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            navigateInTab('/hr/employees/new', 'موظف جديد');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-all"
                    >
                        <Plus className="ml-2 w-4 h-4" />
                        موظف جديد
                    </button>
                    <button className="bg-white border text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث عن موظف (الاسم، الرقم الوظيفي)..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-20 text-gray-400">جاري التحميل...</div>
            ) : filteredEmployees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredEmployees.map((emp) => (
                        <EmployeeCard
                            key={emp.id}
                            employee={emp}
                            onClick={() => {
                                navigateInTab(`/hr/employees/${emp.id}`, `${emp.first_name} ${emp.last_name}`);
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا يوجد موظفين مطابقين للبحث</p>
                </div>
            )}
        </div>
    );
};

const EmployeeCard = ({ employee, onClick }: any) => {
    const { navigateInTab } = useTabs();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
            // TODO: Implement delete logic
            alert('سيتم حذف الموظف قريباً - الوظيفة قيد التنفيذ');
        }
        setShowMenu(false);
    };

    return (
        <div onClick={onClick} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group relative">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                    {employee.photo_url ? (
                        <img src={employee.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-6 h-6" />
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-gray-800">{employee.first_name} {employee.last_name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{employee.job_title_name || 'بدون مسمى'}</p>
                </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 border-t pt-3">
                <div className="flex justify-between">
                    <span className="text-gray-400">الرقم الوظيفي:</span>
                    <span className="font-mono bg-gray-50 px-2 rounded">{employee.employee_code}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">القسم:</span>
                    <span>{employee.department_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">الحالة:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${employee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {employee.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                    </span>
                </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute top-4 left-4" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className={`p-1 rounded-full transition-colors ${showMenu ? 'bg-gray-100 text-gray-600' : 'text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100'}`}
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMenu && (
                    <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateInTab(`/hr/employees/${employee.id}`, `${employee.first_name} ${employee.last_name}`);
                                setShowMenu(false);
                            }}
                            className="w-full text-right px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            <span>تعديل الملف</span>
                        </button>
                        <div className="border-t border-gray-100"></div>
                        <button
                            onClick={handleDelete}
                            className="w-full text-right px-4 py-2.5 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>حذف الموظف</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EmployeeListPage;
