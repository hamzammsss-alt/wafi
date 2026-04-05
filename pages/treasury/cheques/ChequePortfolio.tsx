import React, { useState, useEffect } from 'react';
import {
    Filter, ArrowRight, Building, CheckCircle, XCircle,
    ArrowUpRight, RefreshCcw, Briefcase, Calendar, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ChequePortfolio = () => {
    const navigate = useNavigate();
    const [cheques, setCheques] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('INCOMING'); // Default Incoming

    // Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal States
    const [action, setAction] = useState<string | null>(null); // 'DEPOSIT', 'CLEAR', 'ENDORSE', 'BOUNCE'
    const [accounts, setAccounts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    // Action Form
    const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTargetId, setSelectedTargetId] = useState(''); // Bank Account ID or Supplier ID

    useEffect(() => {
        loadCheques();
        loadMasterData();
    }, [statusFilter, typeFilter]);

    const loadCheques = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (typeFilter !== 'ALL') filters.type = typeFilter;

            const data = await window.electronAPI.cheques.getCheques(filters);
            setCheques(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadMasterData = async () => {
        const accs = await window.electronAPI.getAccounts();
        setAccounts(accs);
        const supps = await window.electronAPI.partner.getPartners('SUPPLIER');
        setSuppliers(supps);
    };

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleActionClick = (act: string) => {
        if (selectedIds.length === 0) return;
        setAction(act);
        setSelectedTargetId('');
    };

    const executeAction = async () => {
        if (!action) return;

        // Validation
        if (action === 'DEPOSIT' || action === 'CLEAR') {
            if (!selectedTargetId) { alert("يجب اختيار الحساب البنكي"); return; }
        }
        if (action === 'ENDORSE') {
            if (!selectedTargetId) { alert("يجب اختيار المورد"); return; }
        }

        const options: any = {};
        if (action === 'DEPOSIT' || action === 'CLEAR') options.bankAccountId = selectedTargetId;
        if (action === 'ENDORSE') options.recipientId = selectedTargetId;

        // Map Action to Status
        let newStatus = '';
        if (action === 'DEPOSIT') newStatus = 'UNDER_COLLECTION';
        if (action === 'CLEAR') newStatus = 'COLLECTED';
        if (action === 'BOUNCE') newStatus = 'BOUNCED';
        if (action === 'ENDORSE') newStatus = 'ENDORSED';

        setLoading(true);
        try {
            for (const id of selectedIds) {
                await window.electronAPI.cheques.updateStatus({ id, status: newStatus, date: actionDate, options });
            }
            alert("تم تنفيذ العملية بنجاح");
            setAction(null);
            setSelectedIds([]);
            loadCheques();
        } catch (error: any) {
            alert("فشل العملية: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'ON_HAND': return 'bg-blue-100 text-blue-700';
            case 'UNDER_COLLECTION': return 'bg-yellow-100 text-yellow-700';
            case 'COLLECTED': return 'bg-green-100 text-green-700';
            case 'BOUNCED': return 'bg-red-100 text-red-700';
            case 'ENDORSED': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'ON_HAND': return 'بالصندوق';
            case 'UNDER_COLLECTION': return 'برسم التحصيل';
            case 'COLLECTED': return 'مُحصل (بالبنك)';
            case 'BOUNCED': return 'راجع';
            case 'ENDORSED': return 'مُجير';
            default: return s;
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">

            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Briefcase className="w-6 h-6 text-blue-600" />
                            حافظة الشيكات
                        </h1>
                        <span className="text-sm text-gray-500">إدارة ومتابعة الشيكات الواردة والصادرة</span>
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="bg-transparent outline-none text-sm font-medium"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">جميع الحالات</option>
                            <option value="ON_HAND">بالصندوق (On Hand)</option>
                            <option value="UNDER_COLLECTION">برسم التحصيل (Under Collection)</option>
                            <option value="COLLECTED">محصلة (Collected)</option>
                            <option value="BOUNCED">راجعة (Bounced)</option>
                            <option value="ENDORSED">مجيرة (Endorsed)</option>
                        </select>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setTypeFilter('INCOMING')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'INCOMING' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            شيكات واردة (قبض)
                        </button>
                        <button
                            onClick={() => setTypeFilter('OUTGOING')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'OUTGOING' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            شيكات صادرة (دفع)
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
                        <span className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center">
                            {selectedIds.length} محدد
                        </span>

                        {/* Actions available based on current status (simplified logic: enable all, validate later) */}
                        <button onClick={() => handleActionClick('DEPOSIT')} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium text-sm transition-colors">
                            <Building className="w-4 h-4" />
                            إيداع بالبنك
                        </button>
                        <button onClick={() => handleActionClick('CLEAR')} className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium text-sm transition-colors">
                            <CheckCircle className="w-4 h-4" />
                            تحصيل (Clear)
                        </button>
                        <button onClick={() => handleActionClick('ENDORSE')} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 font-medium text-sm transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                            تجيير (Endorse)
                        </button>
                        <button onClick={() => handleActionClick('BOUNCE')} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium text-sm transition-colors">
                            <XCircle className="w-4 h-4" />
                            إرجاع (Bounce)
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedIds(cheques.map(c => c.id));
                                        else setSelectedIds([]);
                                    }}
                                    checked={cheques.length > 0 && selectedIds.length === cheques.length}
                                />
                            </th>
                            <th className="px-6 py-3">رقم الشيك</th>
                            <th className="px-6 py-3">البنك</th>
                            <th className="px-6 py-3">العميل / المستفيد</th>
                            <th className="px-6 py-3">تاريخ الاستحقاق</th>
                            <th className="px-6 py-3">المبلغ</th>
                            <th className="px-6 py-3">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {cheques.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(item.id)}
                                        onChange={() => handleSelect(item.id)}
                                    />
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800">{item.cheque_no}</td>
                                <td className="px-6 py-4 text-gray-600">{item.bank_name}</td>
                                <td className="px-6 py-4 text-gray-600">{item.partner_name || '-'}</td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-sm">{item.due_date}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">
                                    {item.amount.toLocaleString()} <span className="text-xs text-gray-500">{item.currency_id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                                        {getStatusLabel(item.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {cheques.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>لا توجد شيكات مطابقة للفلتر</p>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {action && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-6">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-4">
                            {action === 'DEPOSIT' && 'إيداع شيكات في البنك'}
                            {action === 'CLEAR' && 'تحصيل شيكات (Clear)'}
                            {action === 'ENDORSE' && 'تجيير شيكات لمورد'}
                            {action === 'BOUNCE' && 'إرجاع شيكات (Bounced)'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ العملية</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                    value={actionDate}
                                    onChange={(e) => setActionDate(e.target.value)}
                                />
                            </div>

                            {(action === 'DEPOSIT' || action === 'CLEAR') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">اختر البنك</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                        value={selectedTargetId}
                                        onChange={(e) => setSelectedTargetId(e.target.value)}
                                    >
                                        <option value="">اختر حساب البنك...</option>
                                        {accounts
                                            .filter(a => a.name_ar.includes('بنك') || a.name_en?.toLowerCase().includes('bank'))
                                            .map(a => (
                                                <option key={a.id} value={a.id}>{a.name_ar}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            )}

                            {action === 'ENDORSE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">اختر المورد (المستفيد)</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                                        value={selectedTargetId}
                                        onChange={(e) => setSelectedTargetId(e.target.value)}
                                    >
                                        <option value="">اختر المورد...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {action === 'BOUNCE' && (
                                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg">
                                    سيتم تغيير حالة الشيكات المختارة إلى "راجعة" وسيتم إنشاء قيد محاسبي يعيد المديونية للعميل.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => setAction(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={executeAction}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-600/20"
                            >
                                تنفيذ
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export { ChequePortfolio };
