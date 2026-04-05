import React, { useEffect, useState } from 'react';
import { Shield, Plus, Save, Trash2, CheckSquare, Square, CornerDownRight } from 'lucide-react';

// Permission Dictionary (Grouped)
const PERMISSION_GROUPS = {
    'التعاريف الأساسية': [
        { key: 'master.view', label: 'عرض التعاريف الأساسية' },
        { key: 'master.create', label: 'إضافة تعاريف' },
        { key: 'master.edit', label: 'تعديل تعاريف' },
        { key: 'master.delete', label: 'حذف تعاريف' },
    ],
    'المحاسبة العامة': [
        { key: 'gl.view', label: 'عرض الحسابات والقوائم' },
        { key: 'gl.create', label: 'إنشاء سندات قيد' },
        { key: 'gl.edit', label: 'تعديل السندات' },
        { key: 'gl.post', label: 'ترحيل السندات' },
        { key: 'gl.reports', label: 'تقارير مالية ختامية' },
        { key: 'gl.banks', label: 'إدارة البنوك والشيكات' },
        { key: 'gl.closing', label: 'إغلاق السنة المالية' },
    ],
    'الخزينة والبنوك': [
        { key: 'treasury.receipt', label: 'إنشاء سندات قبض' },
        { key: 'treasury.payment', label: 'إنشاء سندات صرف' },
        { key: 'pos.access', label: 'الدخول لنقطة البيع (POS)' },
    ],
    'المخزون والمستودعات': [
        { key: 'inventory.view', label: 'عرض الأصناف والمخزون' },
        { key: 'inventory.view_qty', label: 'عرض الكميات فقط (بدون أسعار)' },
        { key: 'inventory.trans', label: 'حركات مخزنية (إدخال/إخراج)' },
        { key: 'inventory.stocktake', label: 'إدارة الجرد المخزني' },
        { key: 'inventory.reports', label: 'تقارير المخزون' },
    ],
    'المبيعات والعملاء': [
        { key: 'sales.view', label: 'عرض المبيعات والعملاء' },
        { key: 'sales.create', label: 'إنشاء فواتير وعروض' },
        { key: 'sales.post', label: 'ترحيل المبيعات' },
        { key: 'sales.approve_discount', label: 'الموافقة على الخصومات' },
        { key: 'sales.credit_limit', label: 'تجاوز حد الائتمان' },
        { key: 'sales.price_list', label: 'تعديل قوائم الأسعار' },
    ],
    'المشتريات والموردين': [
        { key: 'purchases.view', label: 'عرض المشتريات والموردين' },
        { key: 'purchases.create', label: 'إنشاء أوامر وفواتير شراء' },
        { key: 'purchases.approve', label: 'اعتماد أوامر الشراء' },
    ],
    'الموارد البشرية': [
        { key: 'hr.view', label: 'عرض الموظفين' },
        { key: 'hr.salaries', label: 'عرض وإدارة الرواتب' },
        { key: 'hr.contracts', label: 'إدارة العقود' },
    ],
    'إعدادات النظام': [
        { key: 'system.users', label: 'إدارة المستخدمين' },
        { key: 'system.backup', label: 'النسخ الاحتياطي' },
        { key: 'system.settings', label: 'إعدادات النظام' },
        { key: 'system.logs', label: 'عرض سجلات المراقبة' },
    ]
};

const Roles: React.FC = () => {
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<any | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // For creating new role
    const [isCreating, setIsCreating] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            const data = await window.electronAPI.auth.getRoles();
            setRoles(data);
            if (data.length > 0 && !selectedRole && !isCreating) {
                handleSelectRole(data[0]);
            }
        } catch (err) {
            console.error("Failed to load roles", err);
        }
    };

    const handleSelectRole = async (role: any) => {
        setIsCreating(false);
        setSelectedRole(role);
        setLoading(true);
        try {
            const perms = await window.electronAPI.auth.getPermissions(role.id);
            setPermissions(perms);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermission = (key: string) => {
        setPermissions(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await window.electronAPI.auth.savePermissions({
                roleId: selectedRole.id,
                permissions: permissions
            });
            alert('تم حفظ الصلاحيات بنجاح');
        } catch (err: any) {
            alert('فشل الحفظ: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleName) return;
        try {
            await window.electronAPI.auth.saveRole({ name: newRoleName, description: newRoleDesc });
            setNewRoleName('');
            setNewRoleDesc('');
            setIsCreating(false);
            loadRoles(); // Reload to see new role
        } catch (err: any) {
            alert(err.message);
        }
    };

    const startCreate = () => {
        setIsCreating(true);
        setSelectedRole(null);
        setPermissions([]);
    };

    return (
        <div className="flex h-full bg-[#f0f2f5] p-6 gap-6 font-cairo">

            {/* Left Pane: Role List */}
            <div className="w-1/3 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <Shield className="text-emerald-600" size={20} /> مجموعات الصلاحيات
                    </h2>
                    <button onClick={startCreate} className="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 p-1.5 rounded-full transition-colors shadow-sm">
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {/* Create Form */}
                    {isCreating && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-2 animate-in fade-in slide-in-from-top-2">
                            <input
                                type="text"
                                placeholder="اسم الدور الجديد"
                                className="w-full text-sm p-2 rounded border border-emerald-300 mb-2 focus:ring-1 focus:ring-emerald-500"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                autoFocus
                            />
                            <input
                                type="text"
                                placeholder="الوصف (اختياري)"
                                className="w-full text-xs p-2 rounded border border-emerald-300 mb-2"
                                value={newRoleDesc}
                                onChange={e => setNewRoleDesc(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateRole} className="flex-1 bg-emerald-600 text-white text-xs py-1.5 rounded hover:bg-emerald-700">حفظ</button>
                                <button onClick={() => setIsCreating(false)} className="flex-1 bg-white text-slate-600 text-xs py-1.5 rounded border border-slate-300 hover:bg-slate-50">إلغاء</button>
                            </div>
                        </div>
                    )}

                    {roles.map(role => (
                        <div
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedRole?.id === role.id
                                ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                : 'bg-white border-slate-100 hover:border-emerald-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="font-bold text-slate-800 text-sm">{role.name}</div>
                            {role.description && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{role.description}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Pane: Permissions Matrix */}
            <div className="w-2/3 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg h-[60px]">
                    {selectedRole ? (
                        <>
                            <h2 className="font-bold text-slate-700">
                                تخصيص صلاحيات: <span className="text-emerald-700">{selectedRole.name}</span>
                            </h2>
                            <button
                                onClick={handleSavePermissions}
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded shadow-sm text-sm flex items-center gap-2 transition-transform active:scale-95"
                            >
                                <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                            </button>
                        </>
                    ) : (
                        <div className="text-slate-400 text-sm italic">اختر دوراً من القائمة لعرض الصلاحيات</div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400">جاري تحميل الصلاحيات...</div>
                    ) : selectedRole ? (
                        <div className="grid grid-cols-2 gap-6">
                            {Object.entries(PERMISSION_GROUPS).map(([group, items]) => (
                                <div key={group} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
                                        <CornerDownRight size={16} className="text-slate-400" /> {group}
                                    </h3>
                                    <div className="space-y-2">
                                        {items.map((perm: any) => (
                                            <div
                                                key={perm.key}
                                                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer group"
                                                onClick={() => handleTogglePermission(perm.key)}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${permissions.includes(perm.key) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 group-hover:border-emerald-400'}`}>
                                                    {permissions.includes(perm.key) && <CheckSquare size={14} />}
                                                </div>
                                                <span className={`text-sm select-none ${permissions.includes(perm.key) ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{perm.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                            <Shield size={64} opacity={0.2} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Roles;
