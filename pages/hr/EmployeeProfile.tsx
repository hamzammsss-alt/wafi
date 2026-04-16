
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, ArrowRight, User, Briefcase, FileText, DollarSign, Users, Trash2, Plus } from 'lucide-react';
import { useTabs } from '../../src/contexts/TabsContext';

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { closeTab, navigateInTab } = useTabs();
    const [activeTab, setActiveTab] = useState('personal');
    const [loading, setLoading] = useState(false);

    // Dropdowns data
    const [departments, setDepartments] = useState<any[]>([]);
    const [jobTitles, setJobTitles] = useState<any[]>([]);

    const [form, setForm] = useState({
        personal: {
            first_name: '', father_name: '', grandfather_name: '', last_name: '',
            employee_code: '', national_id: '', date_of_birth: '', gender: 'MALE',
            marital_status: 'SINGLE', mobile_phone: '', email: '',
            address_city: '', address_street: '', status: 'ACTIVE', photo_url: ''
        },
        contract: {
            contract_type: 'LIMITED', start_date: '', end_date: '',
            department_id: '', job_title_id: '',
            basic_salary: 0, currency: 'ILS', salary_type: 'FIXED',
            commission_rate: 0, commission_target: 0, piece_rate_default: 0, hourly_rate: 0,
            transport_allowance: 0, communication_allowance: 0, cost_of_living_allowance: 0,
            bank_name: '', bank_account_number: ''
        },
        relatives: []
    });

    useEffect(() => {
        loadLookups();
        if (id && id !== 'new') {
            loadEmployee(id);
        } else if (id === 'new') {
            // Auto-generate code
            window.electronAPI.hr.getNextCode().then(code => {
                updateForm('personal', 'employee_code', code);
            });
        }
    }, [id]);

    const loadLookups = async () => {
        try {
            const deps = await window.electronAPI.hr.getDepartments();
            const titles = await window.electronAPI.hr.getTitles();
            setDepartments(deps || []);
            setJobTitles(titles || []);
        } catch (err) { console.error(err); }
    };

    const loadEmployee = async (empId: string) => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.getEmployee(empId);
            if (data) {
                setForm({
                    personal: { ...data }, // Maps ID and flat fields
                    contract: data.contract || {},
                    relatives: (data.relatives || []).map((r: any) => ({ ...r, phone: r.note }))
                });
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result) {
                    try {
                        const buffer = event.target.result as ArrayBuffer;
                        const result = await window.electronAPI.hr.savePhoto(buffer, file.name);
                        if (result.success) {
                            updateForm('personal', 'photo_url', result.path);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('فشل رفع الصورة');
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Validate
            if (!form.personal.first_name || !form.personal.employee_code) {
                alert('يرجى تعبئة البيانات الأساسية (الاسم، الرقم الوظيفي)');
                return;
            }

            const payload = {
                personal: { ...form.personal, id: id === 'new' ? undefined : id },
                contract: { ...form.contract, employee_id: id === 'new' ? undefined : id },
                relatives: form.relatives
            };

            await window.electronAPI.hr.saveEmployee(payload);
            navigate('/hr/employees');
        } catch (err: any) {
            alert('فشل الحفظ: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateForm = (section: string, field: string, value: any) => {
        setForm(prev => ({
            ...prev,
            [section]: { ...prev[section as keyof typeof prev], [field]: value }
        }));
    };

    if (loading && id !== 'new') return <div className="p-10 text-center">جاري التحميل...</div>;

    return (
        <div className="app-page" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            navigateInTab('/hr/employees', 'إدارة الموظفين');
                        }}
                        className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100"
                    >
                        <ArrowRight className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {id === 'new' ? 'موظف جديد' : `${form.personal.first_name} ${form.personal.last_name}`}
                    </h1>
                </div>
                <button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                    <Save className="w-4 h-4" />
                    <span>حفظ البيانات</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-2">
                    {[
                        { id: 'personal', label: 'البيانات الشخصية', icon: User },
                        { id: 'contract', label: 'العقد والعمل', icon: Briefcase },
                        { id: 'financial', label: 'البيانات المالية', icon: DollarSign },
                        { id: 'relatives', label: 'المرافقين والعائلة', icon: Users },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 card p-6">
                    {activeTab === 'personal' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">البيانات الأساسية</h3>

                            {/* Photo Upload */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                                        {form.personal.photo_url ? (
                                            <img src={form.personal.photo_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-gray-400" />
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white cursor-pointer hover:bg-blue-700 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="الرقم الوظيفي" required value={form.personal.employee_code} onChange={v => updateForm('personal', 'employee_code', v)} />
                                <Input label="رقم الهوية" value={form.personal.national_id} onChange={v => updateForm('personal', 'national_id', v)} />

                                <Input label="الاسم الأول" required value={form.personal.first_name} onChange={v => updateForm('personal', 'first_name', v)} />
                                <Input label="اسم الأب" required value={form.personal.father_name} onChange={v => updateForm('personal', 'father_name', v)} />
                                <Input label="اسم الجد" required value={form.personal.grandfather_name} onChange={v => updateForm('personal', 'grandfather_name', v)} />
                                <Input label="اسم العائلة" required value={form.personal.last_name} onChange={v => updateForm('personal', 'last_name', v)} />

                                <Input label="تاريخ الميلاد" type="date" value={form.personal.date_of_birth} onChange={v => updateForm('personal', 'date_of_birth', v)} />
                                <Select label="الجنس" value={form.personal.gender} onChange={v => updateForm('personal', 'gender', v)} options={[{ value: 'MALE', label: 'ذكر' }, { value: 'FEMALE', label: 'أنثى' }]} />

                                <Input label="رقم الموبايل" required value={form.personal.mobile_phone} onChange={v => updateForm('personal', 'mobile_phone', v)} />
                                <Input label="البريد الإلكتروني" value={form.personal.email} onChange={v => updateForm('personal', 'email', v)} />

                                <Input label="المدينة" value={form.personal.address_city} onChange={v => updateForm('personal', 'address_city', v)} />
                                <Input label="العنوان بالتفصيل" value={form.personal.address_street} onChange={v => updateForm('personal', 'address_street', v)} />

                                <Select label="الحالة الاجتماعية" value={form.personal.marital_status} onChange={v => updateForm('personal', 'marital_status', v)}
                                    options={[
                                        { value: 'SINGLE', label: 'أعزب/ب' }, { value: 'MARRIED', label: 'متزوج/ـة' },
                                        { value: 'DIVORCED', label: 'مطلق/ـة' }, { value: 'WIDOWED', label: 'أرمل/ـة' }
                                    ]}
                                />
                                <Select label="حالة الموظف" value={form.personal.status} onChange={v => updateForm('personal', 'status', v)}
                                    options={[{ value: 'ACTIVE', label: 'نشط' }, { value: 'TERMINATED', label: 'منهي خدماته' }, { value: 'RESIGNED', label: 'مستقيل' }]}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'contract' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">تفاصيل العقد والعمل</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="نوع العقد" value={form.contract.contract_type} onChange={v => updateForm('contract', 'contract_type', v)}
                                    options={[{ value: 'LIMITED', label: 'محدد المدة' }, { value: 'UNLIMITED', label: 'غير محدد المدة' }]}
                                />
                                <Input label="تاريخ المباشرة" type="date" value={form.contract.start_date} onChange={v => updateForm('contract', 'start_date', v)} />
                                <Input label="تاريخ الانتهاء" type="date" value={form.contract.end_date} onChange={v => updateForm('contract', 'end_date', v)} />

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">القسم</label>
                                    <select
                                        className="w-full border rounded-lg p-2 bg-white"
                                        value={form.contract.department_id}
                                        onChange={(e) => updateForm('contract', 'department_id', e.target.value)}
                                    >
                                        <option value="">اختر القسم...</option>
                                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">المسمى الوظيفي</label>
                                    <select
                                        className="w-full border rounded-lg p-2 bg-white"
                                        value={form.contract.job_title_id}
                                        onChange={(e) => updateForm('contract', 'job_title_id', e.target.value)}
                                    >
                                        <option value="">اختر المسمى...</option>
                                        {jobTitles.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">الراتب والبدلات</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="نظام الراتب" value={form.contract.salary_type} onChange={v => updateForm('contract', 'salary_type', v)}
                                    options={[
                                        { value: 'FIXED', label: 'راتب ثابت (Fixed)' },
                                        { value: 'COMMISSION', label: 'عمولة (Commission)' },
                                        { value: 'PRODUCTION', label: 'إنتاج / قطعة (Piece-Rate)' },
                                        { value: 'HOURLY', label: 'بالساعة (Hourly)' },
                                        { value: 'MIXED', label: 'مختلط (Mixed)' }
                                    ]}
                                />
                                <Select label="العملة" value={form.contract.currency} onChange={v => updateForm('contract', 'currency', v)}
                                    options={[{ value: 'ILS', label: 'شيقل' }, { value: 'USD', label: 'دولار' }, { value: 'JOD', label: 'دينار' }]}
                                />

                                {(form.contract.salary_type === 'FIXED' || form.contract.salary_type === 'MIXED') && (
                                    <Input label="الراتب الأساسي" type="number" value={form.contract.basic_salary} onChange={v => updateForm('contract', 'basic_salary', parseFloat(v))} />
                                )}

                                {(form.contract.salary_type === 'HOURLY' || form.contract.salary_type === 'MIXED') && (
                                    <Input label="أجر الساعة" type="number" value={form.contract.hourly_rate} onChange={v => updateForm('contract', 'hourly_rate', parseFloat(v))} />
                                )}

                                {(form.contract.salary_type === 'COMMISSION' || form.contract.salary_type === 'MIXED') && (
                                    <>
                                        <Input label="نسبة العمولة (%)" type="number" value={form.contract.commission_rate} onChange={v => updateForm('contract', 'commission_rate', parseFloat(v))} />
                                        <Input label="الهدف الشهري (Target)" type="number" value={form.contract.commission_target} onChange={v => updateForm('contract', 'commission_target', parseFloat(v))} />
                                    </>
                                )}

                                {(form.contract.salary_type === 'PRODUCTION' || form.contract.salary_type === 'MIXED') && (
                                    <Input label="سعر القطعة الافتراضي" type="number" value={form.contract.piece_rate_default} onChange={v => updateForm('contract', 'piece_rate_default', parseFloat(v))} />
                                )}

                                <div className="col-span-2 border-t pt-4 mt-2">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3">البدلات الشهرية الثابتة</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <Input label="بدل مواصلات" type="number" value={form.contract.transport_allowance} onChange={v => updateForm('contract', 'transport_allowance', parseFloat(v))} />
                                        <Input label="بدل اتصالات" type="number" value={form.contract.communication_allowance} onChange={v => updateForm('contract', 'communication_allowance', parseFloat(v))} />
                                        <Input label="غلاء معيشة" type="number" value={form.contract.cost_of_living_allowance} onChange={v => updateForm('contract', 'cost_of_living_allowance', parseFloat(v))} />
                                    </div>
                                </div>

                                <div className="col-span-2 border-t pt-4 mt-2">
                                    <h4 className="text-sm font-bold text-gray-700 mb-3">بيانات البنك</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="اسم البنك" value={form.contract.bank_name} onChange={v => updateForm('contract', 'bank_name', v)} />
                                        <Input label="رقم الحساب" value={form.contract.bank_account_number} onChange={v => updateForm('contract', 'bank_account_number', v)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'relatives' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800">المرافقين والعائلة</h3>
                                <button
                                    onClick={() => {
                                        setForm(prev => ({
                                            ...prev,
                                            relatives: [...prev.relatives, { id: '', name: '', relation: 'SPOUSE', phone: '' }]
                                        }));
                                    }}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>إضافة فرد جديد</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto border rounded-xl shadow-sm">
                                <table className="dense-table w-full text-right">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-semibold text-gray-600">الاسم</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-gray-600">صلة القرابة</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-gray-600">رقم الهاتف</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-gray-600 w-20">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {form.relatives.filter((r: any) => !r.deleted).length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                                    لا يوجد بيانات مضافة
                                                </td>
                                            </tr>
                                        ) : (
                                            form.relatives.map((rel: any, index: number) => {
                                                if (rel.deleted) return null;
                                                return (
                                                    <tr key={rel.id || index} className="bg-white hover:bg-gray-50 group">
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="text"
                                                                value={rel.name}
                                                                onChange={(e) => {
                                                                    const newRelatives = [...form.relatives];
                                                                    newRelatives[index].name = e.target.value;
                                                                    setForm(prev => ({ ...prev, relatives: newRelatives }));
                                                                }}
                                                                className="w-full bg-transparent border-transparent focus:border-blue-300 focus:ring-0 rounded px-2 py-1"
                                                                placeholder="الاسم"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <select
                                                                value={rel.relation}
                                                                onChange={(e) => {
                                                                    const newRelatives = [...form.relatives];
                                                                    newRelatives[index].relation = e.target.value;
                                                                    setForm(prev => ({ ...prev, relatives: newRelatives }));
                                                                }}
                                                                className="w-full bg-transparent border-transparent focus:border-blue-300 focus:ring-0 rounded px-2 py-1"
                                                            >
                                                                <option value="SPOUSE">زوج/ـة</option>
                                                                <option value="CHILD">ابن/ـة</option>
                                                                <option value="FATHER">أب</option>
                                                                <option value="MOTHER">أم</option>
                                                                <option value="SIBLING">أخ/أخت</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="text"
                                                                value={rel.phone}
                                                                onChange={(e) => {
                                                                    const newRelatives = [...form.relatives];
                                                                    newRelatives[index].phone = e.target.value;
                                                                    setForm(prev => ({ ...prev, relatives: newRelatives }));
                                                                }}
                                                                className="w-full bg-transparent border-transparent focus:border-blue-300 focus:ring-0 rounded px-2 py-1 dir-ltr text-right"
                                                                placeholder="059xxxxxxx"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    const newRelatives = [...form.relatives];
                                                                    if (rel.id) {
                                                                        newRelatives[index] = { ...rel, deleted: true };
                                                                    } else {
                                                                        newRelatives.splice(index, 1);
                                                                    }
                                                                    setForm(prev => ({ ...prev, relatives: newRelatives }));
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Input = ({ label, type = 'text', value, onChange, required = false }: any) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 block">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
        />
    </div>
);

const Select = ({ label, value, onChange, options }: any) => (
    <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 block">{label}</label>
        <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-100 outline-none"
        >
            {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export default EmployeeProfile;

