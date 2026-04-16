import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Briefcase, DollarSign, Users, Save, ArrowRight, Upload } from 'lucide-react';

const EmployeeProfile = () => {
    const { id } = useParams(); // 'new' or UUID
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [activeTab, setActiveTab] = useState('personal');
    const [loading, setLoading] = useState(false);

    // Form State
    const [personal, setPersonal] = useState<any>({
        status: 'ACTIVE', gender: 'MALE', marital_status: 'SINGLE',
        employee_code: '', first_name: '', last_name: ''
    });
    const [contract, setContract] = useState<any>({
        contract_type: 'PERMANENT', currency: 'ILS',
        basic_salary: 0, payment_method: 'BANK_TRANSFER'
    });
    const [relatives, setRelatives] = useState<any[]>([]);

    // Lookups
    const [depts, setDepts] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);

    useEffect(() => {
        console.log('EmployeeProfile Mounted. ID:', id, 'isNew:', isNew);

        const init = async () => {
            setLoading(true);
            try {
                // Load Lookups
                console.log('Loading Lookups...');
                const [d, j] = await Promise.all([
                    window.electronAPI.getDepartments(),
                    window.electronAPI.getJobTitles()
                ]);
                setDepts(d || []);
                setJobs(j || []);
                console.log('Lookups Loaded:', { departments: d?.length, jobs: j?.length });

                // Load Employee if editing
                if (!isNew && id) {
                    console.log('Loading Employee:', id);
                    const data = await window.electronAPI.getEmployee(id);
                    if (data) {
                        setPersonal(data);
                        if (data.contract) setContract(data.contract);
                        if (data.relatives) setRelatives(data.relatives);
                    }
                } else if (isNew) {
                    // Auto-generate employee code for new employee
                    try {
                        const nextCode = await window.electronAPI.hr.getNextCode();
                        setPersonal(prev => ({ ...prev, employee_code: nextCode }));
                        console.log('Auto-generated employee code:', nextCode);
                    } catch (error) {
                        console.error('Failed to generate employee code:', error);
                    }
                }
            } catch (error) {
                console.error('Error initializing EmployeeProfile:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [id]);

    const handleSave = async () => {
        // Validation
        if (!personal.first_name || !personal.employee_code || !personal.date_of_birth)
            return alert('يرجى تعبئة البيانات الأساسية (الاسم، الرقم الوظيفي، تاريخ الميلاد)');

        setLoading(true);
        try {
            const payload = {
                personal: { ...personal, id: isNew ? undefined : personal.id },
                contract: { ...contract, employee_id: isNew ? undefined : personal.id },
                relatives
            };

            await window.electronAPI.saveEmployee(payload);
            navigate('/hr/employees');
        } catch (e) {
            alert('Error saving: ' + e);
        } finally {
            setLoading(false);
        }
    };

    console.log('🟢 EmployeeProfile Rendering...', { id, isNew, loading, personal, depts: depts.length, jobs: jobs.length });

    return (
        <div className="app-page" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/hr/employees')} className="p-2 hover:bg-white rounded-full transition-colors">
                        <ArrowRight className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{isNew ? 'موظف جديد' : `${personal.first_name} ${personal.last_name}`}</h1>
                        <p className="text-gray-500 text-sm">ملف الموظف الكامل</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center shadow-sm disabled:opacity-50">
                    <Save className="w-4 h-4 ml-2" />
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Sidebar / Tabs */}
                <div className="col-span-12 md:col-span-3 space-y-2">
                    <TabButton id="personal" label="البيانات الشخصية" icon={User} active={activeTab} onClick={setActiveTab} />
                    <TabButton id="contract" label="العقد والعمل" icon={Briefcase} active={activeTab} onClick={setActiveTab} />
                    <TabButton id="salary" label="الراتب والبدلات" icon={DollarSign} active={activeTab} onClick={setActiveTab} />
                    <TabButton id="relatives" label="الأقارب والتابعين" icon={Users} active={activeTab} onClick={setActiveTab} />
                </div>

                {/* Content */}
                <div className="col-span-12 md:col-span-9 card p-6 min-h-[500px]">
                    {activeTab === 'personal' && <PersonalTab data={personal} onChange={setPersonal} />}
                    {activeTab === 'contract' && <ContractTab data={contract} onChange={setContract} depts={depts} jobs={jobs} />}
                    {activeTab === 'salary' && <SalaryTab data={contract} onChange={setContract} />}
                    {activeTab === 'relatives' && <RelativesTab data={relatives} onChange={setRelatives} />}
                </div>
            </div>
        </div>
    );
};

// --- SUB COMPONENTS ---

const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center p-3 rounded-lg transition-all ${active === id ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' : 'text-gray-600 hover:bg-gray-100'}`}
    >
        <Icon className={`w-5 h-5 ml-3 ${active === id ? 'text-blue-600' : 'text-gray-400'}`} />
        {label}
    </button>
);

const PersonalTab = ({ data, onChange }: any) => {
    const update = (field: string, val: any) => onChange({ ...data, [field]: val });

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        try {
            const buffer = await file.arrayBuffer();
            // @ts-ignore
            const result = await window.electronAPI.hr.savePhoto(buffer, file.name);
            if (result.success) {
                update('photo_url', result.path);
            }
        } catch (err) {
            console.error(err);
            alert('فشل حفظ الصورة');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-6 items-start">
                <div className="relative w-32 h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden hover:bg-gray-50 text-gray-400 group">
                    {data.photo_url ? (
                        <img src={data.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <>
                            <Upload className="w-8 h-8 mb-2" />
                            <span className="text-xs">صورة شخصية</span>
                        </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoUpload} accept="image/*" />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="الرقم الوظيفي" value={data.employee_code} onChange={(v: any) => update('employee_code', v)} required />
                    <Input label="الاسم الأول" value={data.first_name} onChange={(v: any) => update('first_name', v)} required />
                    <Input label="اسم الأب" value={data.father_name} onChange={(v: any) => update('father_name', v)} />
                    <Input label="اسم الجد" value={data.grandfather_name} onChange={(v: any) => update('grandfather_name', v)} />
                    <Input label="اسم العائلة" value={data.last_name} onChange={(v: any) => update('last_name', v)} required />
                </div>
            </div>

            <div className="h-px bg-gray-100 my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="رقم الهوية" value={data.national_id} onChange={(v: any) => update('national_id', v)} />
                <Input label="تاريخ الميلاد" type="date" value={data.date_of_birth} onChange={(v: any) => update('date_of_birth', v)} required />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                    <select className="w-full p-2 border rounded-lg" value={data.gender} onChange={e => update('gender', e.target.value)}>
                        <option value="MALE">ذكر</option>
                        <option value="FEMALE">أنثى</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة الاجتماعية</label>
                    <select className="w-full p-2 border rounded-lg" value={data.marital_status} onChange={e => update('marital_status', e.target.value)}>
                        <option value="SINGLE">أعزب/باء</option>
                        <option value="MARRIED">متزوج/ة</option>
                    </select>
                </div>
            </div>

            <div className="h-px bg-gray-100 my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="رقم الجوال" value={data.mobile_phone} onChange={(v: any) => update('mobile_phone', v)} />
                <Input label="هاتف الطوارئ" value={data.emergency_phone} onChange={(v: any) => update('emergency_phone', v)} /> {/* Added */}
                <Input label="البريد الإلكتروني" value={data.email} onChange={(v: any) => update('email', v)} />
                <Input label="العنوان - المدينة" value={data.address_city} onChange={(v: any) => update('address_city', v)} />
                <Input label="العنوان - الشارع" value={data.address_street} onChange={(v: any) => update('address_street', v)} />
            </div>
        </div>
    );
};

// ... ContractTab & SalaryTab (unchanged, but need to be included if I am replacing a parent block or just careful with ranges. The user file view shows distinct blocks. I will target PersonalTab and RelativesTab separately if possible, or just Replace PersonalTab completely.

const RelativesTab = ({ data, onChange }: any) => {
    // Array of relatives - simplified to only name, relation, and phone
    const addRelative = () => onChange([...data, { id: '', name: '', relation: 'SPOUSE', phone: '' }]);
    const updateRelative = (index: number, field: string, val: any) => {
        const newData = [...data];
        newData[index] = { ...newData[index], [field]: val };
        onChange(newData);
    };
    const removeRelative = (index: number) => {
        const newData = [...data];
        if (data[index].id) {
            // Mark as deleted for backend
            newData[index] = { ...newData[index], deleted: true };
        } else {
            // Remove from array if not saved yet
            newData.splice(index, 1);
        }
        onChange(newData);
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-700">المعالين والأقارب</h3>
                    <p className="text-xs text-gray-500 mt-1">الاسم، صلة القرابة، ورقم الهاتف فقط</p>
                </div>
                <button onClick={addRelative} className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 font-medium">+ إضافة قريب</button>
            </div>

            {data.filter((r: any) => !r.deleted).length === 0 && <p className="text-gray-400 text-center py-8 border-2 border-dashed rounded-lg">لا يوجد أقارب مسجلين</p>}

            {data.filter((r: any) => !r.deleted).map((r: any, i: number) => {
                const actualIndex = data.indexOf(r);
                return (
                    <div key={i} className="flex gap-3 items-end border border-gray-200 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        <Input
                            label="الاسم الكامل"
                            value={r.name}
                            onChange={(v: any) => updateRelative(actualIndex, 'name', v)}
                            containerClass="flex-1"
                            required
                        />
                        <div className="w-40">
                            <label className="block text-sm font-medium text-gray-700 mb-1">صلة القرابة</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={r.relation}
                                onChange={e => updateRelative(actualIndex, 'relation', e.target.value)}
                            >
                                <option value="SPOUSE">زوج/ة</option>
                                <option value="SON">ابن</option>
                                <option value="DAUGHTER">ابنة</option>
                                <option value="FATHER">أب</option>
                                <option value="MOTHER">أم</option>
                                <option value="BROTHER">أخ</option>
                                <option value="SISTER">أخت</option>
                            </select>
                        </div>
                        <Input
                            label="رقم الهاتف"
                            value={r.phone || r.note}
                            onChange={(v: any) => updateRelative(actualIndex, 'phone', v)}
                            containerClass="w-48"
                        />
                        <button
                            onClick={() => removeRelative(actualIndex)}
                            className="text-red-600 p-2 hover:bg-red-50 rounded-lg mb-1 transition-colors font-medium"
                        >
                            حذف
                        </button>
                    </div>
                );
            })}
        </div>
    )
}

const ContractTab = ({ data, onChange, depts, jobs }: any) => {
    const update = (field: string, val: any) => onChange({ ...data, [field]: val });
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Code is usually in Personal, but sometimes duplicated or referenced. We have it in Personal */}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع العقد</label>
                    <select className="w-full p-2 border rounded-lg" value={data.contract_type} onChange={e => update('contract_type', e.target.value)}>
                        <option value="PERMANENT">عقد دائم</option>
                        <option value="TEMPORARY">عقد مؤقت</option>
                        <option value="TRAINING">تدريب</option>
                    </select>
                </div>

                <div>
                    <div className="flex justifying-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">القسم</label>
                        <button onClick={() => navigate('/hr/org')} className="text-xs text-blue-600 hover:underline mr-auto">إدارة الأقسام</button>
                    </div>
                    <select className="w-full p-2 border rounded-lg" value={data.department_id || ''} onChange={e => update('department_id', e.target.value)}>
                        <option value="">- اختر -</option>
                        {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                <div>
                    <div className="flex justifying-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">المسمى الوظيفي</label>
                        <button onClick={() => navigate('/hr/org')} className="text-xs text-blue-600 hover:underline mr-auto">إدارة المسميات</button>
                    </div>
                    <select className="w-full p-2 border rounded-lg" value={data.job_title_id || ''} onChange={e => update('job_title_id', e.target.value)}>
                        <option value="">- اختر -</option>
                        {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                </div>

                <Input label="تاريخ البدء" type="date" value={data.start_date} onChange={(v: any) => update('start_date', v)} />
                <Input label="تاريخ الانتهاء" type="date" value={data.end_date} onChange={(v: any) => update('end_date', v)} />
            </div>
        </div>
    )
}

const SalaryTab = ({ data, onChange }: any) => {
    const update = (field: string, val: any) => onChange({ ...data, [field]: val });
    const salaryType = data.salary_type || 'FIXED';

    return (
        <div className="space-y-6 animate-in fade-in">
            <h3 className="text-lg font-bold text-gray-700">اتفاقية الراتب</h3>

            {/* 1. Salary Type Selection */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-medium text-blue-900 mb-2">نظام الراتب</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { id: 'FIXED', label: 'راتب ثابت فقط' },
                        { id: 'COMMISSION', label: 'عمولة مبيعات' },
                        { id: 'PRODUCTION', label: 'نظام القطعة/الإنتاج' },
                        { id: 'MIXED', label: 'نظام مختلط' }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => update('salary_type', type.id)}
                            className={`
                                p-3 rounded-lg border-2 text-sm font-bold transition-all
                                ${salaryType === type.id
                                    ? 'border-blue-500 bg-white text-blue-600 shadow-sm'
                                    : 'border-transparent bg-blue-100/50 text-blue-800 hover:bg-blue-100'}
                            `}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Basic Salary (Show for Fixed & Mixed) */}
            {(salaryType === 'FIXED' || salaryType === 'MIXED') && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">الراتب الأساسي</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="الراتب الأساسي" type="number" value={data.basic_salary} onChange={(v: any) => update('basic_salary', parseFloat(v))} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">العملة</label>
                            <select className="w-full p-2 border rounded-lg" value={data.currency} onChange={e => update('currency', e.target.value)}>
                                <option value="ILS">شيكل ILS</option>
                                <option value="USD">دولار USD</option>
                                <option value="JOD">دينار JOD</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                            <select className="w-full p-2 border rounded-lg" value={data.payment_method} onChange={e => update('payment_method', e.target.value)}>
                                <option value="BANK_TRANSFER">تحويل بنكي</option>
                                <option value="CASH">نقدي</option>
                                <option value="CHECK">شيك</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Commission Settings */}
            {(salaryType === 'COMMISSION' || salaryType === 'MIXED') && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                        <DollarSign size={16} />
                        إعدادات العمولة
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="نسبة العمولة (%)"
                            type="number"
                            value={data.commission_rate ? data.commission_rate * 100 : 0}
                            onChange={(v: any) => update('commission_rate', parseFloat(v) / 100)}
                        />
                        <Input
                            label="هدف المبيعات الشهري (Target)"
                            type="number"
                            value={data.commission_target}
                            onChange={(v: any) => update('commission_target', parseFloat(v))}
                        />
                        <div className="pt-7 text-xs text-emerald-600">
                            * تحتسب العمولة بناءً على شاشة "احتساب العمولات"
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Production Settings */}
            {(salaryType === 'PRODUCTION' || salaryType === 'MIXED') && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                        <Briefcase size={16} />
                        إعدادات الإنتاج (القطعة)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="سعر القطعة الافتراضي"
                            type="number"
                            value={data.piece_rate_default}
                            onChange={(v: any) => update('piece_rate_default', parseFloat(v))}
                        />
                        <div className="col-span-2 pt-7 text-xs text-amber-700">
                            * يتم تسجيل الإنتاج اليومي من شاشة "سجل الإنتاج"
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Allowances & Bank (Common) */}
            <h3 className="text-lg font-bold text-gray-700 mt-6">البدلات والبنك</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="بدل مواصلات" type="number" value={data.transport_allowance} onChange={(v: any) => update('transport_allowance', parseFloat(v))} />
                <Input label="بدل اتصالات" type="number" value={data.communication_allowance} onChange={(v: any) => update('communication_allowance', parseFloat(v))} />
                <Input label="غلاء معيشة" type="number" value={data.cost_of_living_allowance} onChange={(v: any) => update('cost_of_living_allowance', parseFloat(v))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <Input label="اسم البنك" value={data.bank_name} onChange={(v: any) => update('bank_name', v)} />
                <Input label="الفرع" value={data.bank_branch} onChange={(v: any) => update('bank_branch', v)} />
                <Input label="رقم الحساب" value={data.bank_account_number} onChange={(v: any) => update('bank_account_number', v)} />
            </div>
        </div>
    )
}




const Input = ({ label, value, onChange, type = 'text', required, containerClass = '' }: any) => (
    <div className={containerClass}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
    </div>
);

export { EmployeeProfile };
