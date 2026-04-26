import React, { useEffect, useState, useTransition } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    Key,
    Loader2,
    Lock,
    Save,
    Search,
    Settings as SettingsIcon,
    Shield,
    SlidersHorizontal,
    Trash2,
} from 'lucide-react';

type SettingOption = {
    value: string;
    labelAr: string;
    labelEn: string;
};

type SettingDefinition = {
    key: string;
    groupCode: string;
    labelAr: string;
    labelEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    valueType: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'table';
    inputType: string;
    value: any;
    defaultValue: any;
    options?: SettingOption[];
    validation?: Record<string, any>;
    isRequired?: boolean;
    isSensitive?: boolean;
    needsReview?: boolean;
    metadata?: {
        tableColumns?: Array<{ key: string; labelAr: string; labelEn: string }>;
    };
    source?: string;
};

type SettingGroup = {
    code: string;
    nameAr: string;
    nameEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    settings: SettingDefinition[];
};

type SettingsResponse = {
    scope: {
        companyId: string;
        branchId?: string;
        userId?: string;
    };
    groups: SettingGroup[];
    flatValues: Record<string, any>;
    needsReview: Array<{ key: string; groupCode: string; labelAr: string; labelEn: string }>;
};

const SOURCE_LABEL: Record<string, string> = {
    default: 'افتراضي',
    company: 'شركة',
    branch: 'فرع',
    user: 'مستخدم',
};

const canManageSettings = (snapshot: any): boolean => {
    const permissions = new Set<string>([
        ...((snapshot?.permissions || []) as string[]),
        ...((snapshot?.capabilities || []) as string[]),
    ]);

    return (
        permissions.has('ALL') ||
        permissions.has('*.*') ||
        permissions.has('core.settings.manage') ||
        permissions.has('system.settings') ||
        permissions.has('settings.manage') ||
        permissions.has('core.security.permissions.manage')
    );
};

const normalizeErrorMessage = (error: any) => {
    if (!error) return 'حدث خطأ غير متوقع';
    if (error.messageKey?.includes('permission')) return 'لا تملك صلاحية تعديل الإعدادات';
    if (error.message) return String(error.message);
    return String(error);
};

const textValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));

const TableEditor: React.FC<{
    setting: SettingDefinition;
    value: any[];
    disabled: boolean;
    onChange: (value: any[]) => void;
}> = ({ setting, value, disabled, onChange }) => {
    const columns =
        setting.metadata?.tableColumns && setting.metadata.tableColumns.length > 0
            ? setting.metadata.tableColumns
            : Object.keys(value?.[0] || { key: '', value: '' }).map((key) => ({ key, labelAr: key, labelEn: key }));

    const rows = Array.isArray(value) ? value : [];

    const updateCell = (rowIndex: number, columnKey: string, nextValue: string) => {
        onChange(rows.map((row, index) => (index === rowIndex ? { ...row, [columnKey]: nextValue } : row)));
    };

    const addRow = () => {
        const blank = Object.fromEntries(columns.map((column) => [column.key, '']));
        onChange([...rows, blank]);
    };

    const deleteRow = (rowIndex: number) => {
        onChange(rows.filter((_, index) => index !== rowIndex));
    };

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className="text-right font-bold px-3 py-2 border-b border-slate-200">
                                    {column.labelAr}
                                    <span className="block text-[10px] font-normal text-slate-400" dir="ltr">
                                        {column.labelEn}
                                    </span>
                                </th>
                            ))}
                            <th className="w-12 border-b border-slate-200" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={`${setting.key}-${rowIndex}`} className="border-b border-slate-100 last:border-b-0">
                                {columns.map((column) => (
                                    <td key={column.key} className="p-2 align-top">
                                        <input
                                            value={textValue(row?.[column.key])}
                                            onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                                            disabled={disabled}
                                            className="w-full border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                                        />
                                    </td>
                                ))}
                                <td className="p-2 align-top">
                                    <button
                                        type="button"
                                        onClick={() => deleteRow(rowIndex)}
                                        disabled={disabled}
                                        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                type="button"
                onClick={addRow}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
                إضافة سطر
            </button>
        </div>
    );
};

const SettingField: React.FC<{
    setting: SettingDefinition;
    value: any;
    disabled: boolean;
    language: 'ar' | 'en';
    onChange: (key: string, value: any) => void;
}> = ({ setting, value, disabled, language, onChange }) => {
    const label = language === 'ar' ? setting.labelAr : setting.labelEn;
    const altLabel = language === 'ar' ? setting.labelEn : setting.labelAr;
    const description = language === 'ar' ? setting.descriptionAr : setting.descriptionEn;
    const inputBase = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';

    const renderInput = () => {
        if (setting.inputType === 'toggle') {
            const enabled = Boolean(value);
            return (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(setting.key, !enabled)}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition disabled:opacity-50 ${
                        enabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                >
                    <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                            enabled ? '-translate-x-8' : '-translate-x-1'
                        }`}
                    />
                    <span className="sr-only">{label}</span>
                </button>
            );
        }

        if (setting.inputType === 'checkbox') {
            return (
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        disabled={disabled}
                        onChange={(event) => onChange(setting.key, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{Boolean(value) ? 'مفعّل' : 'غير مفعّل'}</span>
                </label>
            );
        }

        if (setting.inputType === 'select') {
            return (
                <select
                    value={textValue(value)}
                    disabled={disabled}
                    onChange={(event) => onChange(setting.key, event.target.value)}
                    className={`${inputBase} bg-white`}
                >
                    {(setting.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                            {language === 'ar' ? option.labelAr : option.labelEn}
                        </option>
                    ))}
                </select>
            );
        }

        if (setting.inputType === 'textarea') {
            return (
                <textarea
                    value={textValue(value)}
                    disabled={disabled}
                    onChange={(event) => onChange(setting.key, event.target.value)}
                    rows={4}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    className={inputBase}
                />
            );
        }

        if (setting.inputType === 'table') {
            return (
                <TableEditor
                    setting={setting}
                    value={Array.isArray(value) ? value : []}
                    disabled={disabled}
                    onChange={(nextValue) => onChange(setting.key, nextValue)}
                />
            );
        }

        if (setting.inputType === 'json') {
            return (
                <textarea
                    value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
                    disabled={disabled}
                    onChange={(event) => onChange(setting.key, event.target.value)}
                    rows={5}
                    dir="ltr"
                    className={`${inputBase} font-mono text-left`}
                />
            );
        }

        return (
            <input
                type={setting.inputType === 'password' ? 'password' : setting.inputType === 'time' ? 'time' : setting.inputType === 'number' ? 'number' : 'text'}
                value={textValue(value)}
                disabled={disabled}
                onChange={(event) => onChange(setting.key, setting.inputType === 'number' ? event.target.value : event.target.value)}
                dir={language === 'ar' && setting.inputType !== 'password' ? 'rtl' : 'ltr'}
                className={inputBase}
            />
        );
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <label className="font-bold text-slate-800 text-sm">
                        {label}
                        {setting.isRequired && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <div className="text-[11px] text-slate-400 mt-0.5" dir="ltr">
                        {altLabel}
                    </div>
                    {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
                </div>
                <div className="flex items-center gap-1">
                    {setting.needsReview && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                            <AlertTriangle size={12} /> يحتاج مراجعة
                        </span>
                    )}
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                        {SOURCE_LABEL[setting.source || 'default'] || setting.source}
                    </span>
                </div>
            </div>
            {renderInput()}
        </div>
    );
};

export const Settings = () => {
    const [machineId, setMachineId] = useState('LOADING...');
    const [license, setLicense] = useState<any>({ status: 'checking', key: '' });
    const [inputKey, setInputKey] = useState('');
    const [catalog, setCatalog] = useState<SettingsResponse | null>(null);
    const [activeGroup, setActiveGroup] = useState('');
    const [draft, setDraft] = useState<Record<string, any>>({});
    const [search, setSearch] = useState('');
    const [language, setLanguage] = useState<'ar' | 'en'>('ar');
    const [scope, setScope] = useState({
        companyId: 'COMP_01',
        branchId: '',
        userId: '',
    });
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        void loadData();
    }, []);

    const loadData = async (nextScope = scope) => {
        setLoading(true);
        setError('');
        try {
            const api = window.electronAPI;
            if (!api?.settings) {
                throw new Error('Settings API is not available. Please run the desktop app.');
            }

            const machinePromise = api.getMachineId ? api.getMachineId().catch(() => 'UNKNOWN-ID') : Promise.resolve('UNKNOWN-ID');
            const licensePromise = api.validateLicense ? api.validateLicense().catch(() => ({ status: 'unlicensed' })) : Promise.resolve({ status: 'unlicensed' });
            const snapshotPromise = api.security?.getMySnapshot ? api.security.getMySnapshot().catch(() => null) : Promise.resolve(null);

            const [settingsData, machine, licenseInfo, snapshot, logs] = await Promise.all([
                api.settings.getAll(nextScope),
                machinePromise,
                licensePromise,
                snapshotPromise,
                api.settings.getAuditLogs(8).catch(() => []),
            ]);

            setMachineId(machine || 'UNKNOWN-ID');
            setLicense(licenseInfo || { status: 'unlicensed' });
            setCanManage(canManageSettings(snapshot));
            setAuditLogs(Array.isArray(logs) ? logs : []);
            startTransition(() => {
                setCatalog(settingsData);
                setDraft(settingsData.flatValues || {});
                setActiveGroup((previous) => previous || settingsData.groups?.[0]?.code || '');
            });
        } catch (loadError: any) {
            setError(normalizeErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    };

    const active = catalog?.groups.find((group) => group.code === activeGroup) || catalog?.groups[0];
    const normalizedSearch = search.trim().toLowerCase();
    const filteredGroups =
        catalog?.groups.filter((group) => {
            if (!normalizedSearch) return true;
            return (
                group.nameAr.toLowerCase().includes(normalizedSearch) ||
                group.nameEn.toLowerCase().includes(normalizedSearch) ||
                group.settings.some(
                    (setting) =>
                        setting.key.toLowerCase().includes(normalizedSearch) ||
                        setting.labelAr.toLowerCase().includes(normalizedSearch) ||
                        setting.labelEn.toLowerCase().includes(normalizedSearch),
                )
            );
        }) || [];

    const activeSettings =
        active?.settings.filter((setting) => {
            if (!normalizedSearch) return true;
            return (
                setting.key.toLowerCase().includes(normalizedSearch) ||
                setting.labelAr.toLowerCase().includes(normalizedSearch) ||
                setting.labelEn.toLowerCase().includes(normalizedSearch)
            );
        }) || [];

    const handleChange = (key: string, value: any) => {
        setDraft((previous) => ({ ...previous, [key]: value }));
    };

    const validateSection = () => {
        if (!active) return 'لم يتم اختيار قسم';
        for (const setting of active.settings) {
            if (!setting.isRequired) continue;
            const value = draft[setting.key];
            const missing =
                value === null ||
                value === undefined ||
                (typeof value === 'string' && !value.trim()) ||
                (Array.isArray(value) && value.length === 0);
            if (missing) return `الحقل مطلوب: ${setting.labelAr}`;
        }
        return '';
    };

    const handleSaveSection = async () => {
        if (!active || !window.electronAPI?.settings) return;
        const validationError = validateSection();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');
        try {
            const values = Object.fromEntries(active.settings.map((setting) => [setting.key, draft[setting.key]]));
            const result = await window.electronAPI.settings.putSection(active.code, values, scope);
            setMessage(`تم حفظ ${result.changedCount || 0} تعديل في قسم ${active.nameAr}`);
            await loadData(scope);
        } catch (saveError: any) {
            setError(normalizeErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async () => {
        if (!inputKey.trim()) {
            setError('أدخل مفتاح التفعيل');
            return;
        }

        try {
            await window.electronAPI.activateProduct(inputKey.trim());
            setMessage('تم التفعيل بنجاح');
            setInputKey('');
            await loadData(scope);
        } catch (activateError: any) {
            setError('فشل التفعيل: ' + normalizeErrorMessage(activateError));
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#f0f2f5]" dir="rtl">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-3 text-slate-600">
                    <Loader2 className="animate-spin text-blue-600" />
                    جاري تحميل إعدادات النظام...
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#f0f2f5] p-5 overflow-hidden font-cairo" dir="rtl">
            <div className="h-full flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                                <SettingsIcon size={23} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">الإعدادات العامة للنظام</h1>
                                <p className="text-sm text-slate-500">إعدادات قابلة للتوسعة ومحفوظة في قاعدة البيانات حسب الشركة / الفرع / المستخدم</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={language}
                                onChange={(event) => setLanguage(event.target.value as 'ar' | 'en')}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                                <option value="ar">العربية</option>
                                <option value="en">English</option>
                            </select>
                            <button
                                onClick={handleSaveSection}
                                disabled={!canManage || saving || isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                                حفظ القسم
                            </button>
                        </div>
                    </div>

                    {!canManage && (
                        <div className="mt-3 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Lock size={16} />
                            يمكنك قراءة الإعدادات فقط. التعديل يتطلب صلاحية system.settings أو core.settings.manage.
                        </div>
                    )}
                </div>

                {(message || error) && (
                    <div
                        className={`rounded-lg px-4 py-3 text-sm border flex items-center gap-2 ${
                            error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                    >
                        {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                        {error || message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 min-h-0 flex-1">
                    <aside className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="p-4 border-b border-slate-100 space-y-3">
                            <div className="relative">
                                <Search className="absolute right-3 top-2.5 text-slate-400" size={17} />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="بحث في الإعدادات..."
                                    className="w-full border border-slate-300 rounded-lg pr-9 pl-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <input
                                    value={scope.companyId}
                                    onChange={(event) => setScope((previous) => ({ ...previous, companyId: event.target.value }))}
                                    placeholder="Company ID"
                                    dir="ltr"
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-xs text-left"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        value={scope.branchId}
                                        onChange={(event) => setScope((previous) => ({ ...previous, branchId: event.target.value }))}
                                        placeholder="Branch ID"
                                        dir="ltr"
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-xs text-left"
                                    />
                                    <input
                                        value={scope.userId}
                                        onChange={(event) => setScope((previous) => ({ ...previous, userId: event.target.value }))}
                                        placeholder="User ID"
                                        dir="ltr"
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-xs text-left"
                                    />
                                </div>
                                <button
                                    onClick={() => loadData(scope)}
                                    className="text-xs bg-slate-800 text-white rounded-lg px-3 py-2 hover:bg-slate-900"
                                >
                                    تحميل حسب النطاق
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredGroups.map((group) => (
                                <button
                                    key={group.code}
                                    onClick={() => setActiveGroup(group.code)}
                                    className={`w-full text-right px-3 py-2.5 rounded-lg border transition ${
                                        active?.code === group.code
                                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                                            : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                                >
                                    <span className="block font-bold text-sm">{language === 'ar' ? group.nameAr : group.nameEn}</span>
                                    <span className="block text-[11px] text-slate-400" dir="ltr">
                                        {group.code} · {group.settings.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className="min-h-0 overflow-y-auto space-y-4 pl-1">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Key className="text-yellow-600" size={19} />
                                        الترخيص والتفعيل
                                    </h2>
                                    {license.status === 'active' ? (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <Shield size={14} /> نسخة مفعلة
                                        </span>
                                    ) : (
                                        <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <Lock size={14} /> غير مفعلة
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                        <div className="text-[11px] text-slate-500 uppercase">Machine Fingerprint</div>
                                        <div className="font-mono text-sm font-bold text-slate-800 select-all" dir="ltr">
                                            {machineId}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={inputKey}
                                            onChange={(event) => setInputKey(event.target.value)}
                                            placeholder="WAFI-XXXX"
                                            dir="ltr"
                                            className="min-w-0 flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                                        />
                                        <button onClick={handleActivate} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900">
                                            تفعيل
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <Database className="text-blue-600" size={19} />
                                    آخر تعديلات
                                </h2>
                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                    {auditLogs.length ? (
                                        auditLogs.map((log) => (
                                            <div key={log.id} className="text-xs border border-slate-100 rounded-lg p-2 bg-slate-50">
                                                <div className="font-bold text-slate-700" dir="ltr">
                                                    {log.setting_key}
                                                </div>
                                                <div className="text-slate-400">{log.created_at}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400">لا توجد تعديلات مسجلة بعد.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {catalog?.needsReview?.length ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                                    <AlertTriangle size={18} />
                                    إعدادات تحتاج مراجعة من الصور
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {catalog.needsReview.slice(0, 18).map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => setActiveGroup(item.groupCode)}
                                            className="text-xs bg-white border border-amber-200 text-amber-800 rounded-full px-3 py-1"
                                        >
                                            {item.labelAr}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <SlidersHorizontal className="text-blue-600" size={21} />
                                        {active ? (language === 'ar' ? active.nameAr : active.nameEn) : 'الإعدادات'}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1" dir="ltr">
                                        {active?.code}
                                    </p>
                                </div>
                                <span className="text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-3 py-1">
                                    {activeSettings.length} إعداد
                                </span>
                            </div>

                            <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {activeSettings.map((setting) => (
                                    <SettingField
                                        key={setting.key}
                                        setting={setting}
                                        value={draft[setting.key] ?? setting.value ?? setting.defaultValue}
                                        disabled={!canManage || saving}
                                        language={language}
                                        onChange={handleChange}
                                    />
                                ))}
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
};
