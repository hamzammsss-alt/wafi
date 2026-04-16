import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash, Briefcase, ChevronRight, ChevronDown, Save, X } from 'lucide-react';

const OrganizationPage = () => {
    const [activeTab, setActiveTab] = useState<'departments' | 'jobs'>('departments');

    return (
        <div className="app-page" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">الهيكل التنظيمي</h1>
                    <p className="text-gray-500">إدارة الأقسام والمسميات الوظيفية</p>
                </div>
                <div className="space-x-2 space-x-reverse">
                    <button
                        onClick={() => setActiveTab('departments')}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'departments' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >
                        <Layers className="inline-block ml-2 w-4 h-4" />
                        الأقسام
                    </button>
                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'jobs' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >
                        <Briefcase className="inline-block ml-2 w-4 h-4" />
                        المسميات الوظيفية
                    </button>
                </div>
            </div>

            <div className="card p-6 min-h-[600px]">
                {activeTab === 'departments' ? <DepartmentsTab /> : <JobTitlesTab />}
            </div>
        </div>
    );
};

// --- DEPARTMENTS TAB ---

const DepartmentsTab = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null); // null = list, {} = create, obj = edit

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getDepartments();
            setDepartments(buildTree(data));
        } catch (error) {
            console.error('Failed to load departments', error);
        } finally {
            setLoading(false);
        }
    };

    const buildTree = (data: any[], parentId: string | null = null): any[] => {
        return data
            .filter(item => {
                if (parentId === null) return !item.parent_id; // Match null or empty string if root
                return item.parent_id === parentId;
            })
            .map(item => ({ ...item, children: buildTree(data, item.id) }));
    };

    const handleSave = async (data: any) => {
        try {
            await window.electronAPI.saveDepartment(data);
            setEditing(null);
            loadData();
        } catch (error) {
            alert('Faled to save: ' + error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد؟ سيتم حذف القسم.')) return;
        try {
            await window.electronAPI.deleteDepartment(id);
            loadData();
        } catch (error) {
            alert('Faled to delete: ' + error);
        }
    };

    if (editing) return <DepartmentForm initialData={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => setEditing({})} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm">
                    <Plus className="w-5 h-5 ml-2" />
                    إضافة قسم جديد
                </button>
            </div>

            {loading ? <div className="text-center py-10 text-gray-500">جاري التحميل...</div> : (
                <div className="space-y-2">
                    {departments.length === 0 && <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">لا يوجد أقسام معرفة بعد.</div>}
                    {departments.map(dept => (
                        <DepartmentNode key={dept.id} node={dept} onEdit={(d) => setEditing(d)} onDelete={handleDelete} level={0} />
                    ))}
                </div>
            )}
        </div>
    );
};

const DepartmentNode = ({ node, onEdit, onDelete, level }: any) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="select-none transition-all duration-300">
            <div className={`flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-blue-100 transition-all mb-1 ${level > 0 ? 'mr-8' : ''}`}>
                <div className="flex items-center space-x-3 space-x-reverse">
                    <button onClick={() => setExpanded(!expanded)} className={`p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-transform ${expanded ? 'rotate-0' : 'rotate-90 rtl:-rotate-90'}`}>
                        {node.children && node.children.length > 0 ? <ChevronDown className="w-4 h-4" /> : <div className="w-4 h-4" />}
                    </button>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">{node.name}</span>
                        {node.manager_name && <span className="text-xs text-blue-500 flex items-center mt-1"><UserIcon className="w-3 h-3 ml-1" /> المدير: {node.manager_name}</span>}
                    </div>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                    <button onClick={() => onEdit(node)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-md"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(node.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-md"><Trash className="w-4 h-4" /></button>
                </div>
            </div>
            {expanded && node.children && (
                <div className="border-r-2 border-gray-100 mr-4 pr-0">
                    {node.children.map((child: any) => (
                        <DepartmentNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};
// Mini component for manager icon
const UserIcon = ({ className }: any) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;


const DepartmentForm = ({ initialData, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
        id: initialData.id || '',
        name: initialData.name || '',
        parent_id: initialData.parent_id || '',
        manager_id: initialData.manager_id || '' // TODO: Need employee selector
    });

    const [parents, setParents] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        // Fetch flat list for parent dropdown and employees for manager
        const fetchData = async () => {
            const [deptData, empData] = await Promise.all([
                window.electronAPI.getDepartments(),
                window.electronAPI.getEmployees()
            ]);
            setParents(deptData.filter((d: any) => d.id !== initialData.id)); // Avoid self-parenting
            setEmployees(empData);
        };
        fetchData();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Convert empty strings to null for optional foreign keys
        const payload = {
            ...formData,
            parent_id: formData.parent_id || null,
            manager_id: formData.manager_id || null
        };
        onSave(payload);
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800">{initialData.id ? 'تعديل قسم' : 'إضافة قسم جديد'}</h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم القسم</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="مثال: قسم المبيعات"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم الرئيسي (يتبع لـ)</label>
                    <select
                        value={formData.parent_id || ''}
                        onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- قسم رئيسي --</option>
                        {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">مدير القسم</label>
                    <select
                        value={formData.manager_id || ''}
                        onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">-- اختر مدير القسم --</option>
                        {employees.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">يتم عرض الموظفين المسجلين في النظام.</p>
                </div>

                <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                    <button type="button" onClick={onCancel} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center shadow-md">
                        <Save className="w-4 h-4 ml-2" />
                        حفظ
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- JOB TITLES TAB ---
const JobTitlesTab = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getJobTitles();
            setJobs(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSave = async (data: any) => {
        try {
            await window.electronAPI.saveJobTitle({ ...data, description: data.description || '' });
            setEditing(null);
            loadData();
        } catch (e) { alert(e); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('حذف المسمى الوظيفي؟')) return;
        await window.electronAPI.deleteJobTitle(id);
        loadData();
    }

    return (
        <div>
            {editing ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">{editing.id ? 'تعديل مسمى' : 'مسمى جديد'}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            placeholder="اسم المسمى (مثال: محاسب)"
                            className="p-2 border rounded-md"
                            value={editing.title || ''}
                            onChange={e => setEditing({ ...editing, title: e.target.value })}
                        />
                        <input
                            placeholder="الوصف (اختياري)"
                            className="p-2 border rounded-md"
                            value={editing.description || ''}
                            onChange={e => setEditing({ ...editing, description: e.target.value })}
                        />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => setEditing(null)} className="px-4 py-1 text-gray-500">إلغاء</button>
                        <button onClick={() => handleSave(editing)} className="px-4 py-1 bg-blue-600 text-white rounded-md">حفظ</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end mb-4">
                    <button onClick={() => setEditing({ title: '' })} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-green-700">
                        <Plus className="w-5 h-5 ml-2" />
                        إضافة مسمى وظيفي
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white border hover:border-blue-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg ml-3">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{job.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description || 'لا يوجد وصف'}</p>
                                </div>
                            </div>
                            <div className="flex space-x-2 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditing(job)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(job.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default OrganizationPage;

