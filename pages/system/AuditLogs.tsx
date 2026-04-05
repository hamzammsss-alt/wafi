import React, { useEffect, useState } from 'react';
import { FileText, Search, Clock, User, Shield } from 'lucide-react';

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState('');

    useEffect(() => {
        loadData();
    }, [filterAction, selectedUser]);

    useEffect(() => {
        // Load users for filter dropdown
        window.electronAPI.auth.getUsers().then(setUsers).catch(console.error);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.system.getAuditLogs({
                action: filterAction || undefined,
                userId: selectedUser || undefined
            });
            setLogs(data);
        } catch (err) {
            console.error("Failed to load logs", err);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action === 'LOGIN') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (action === 'DELETE') return 'bg-red-100 text-red-700 border-red-200';
        if (action === 'CREATE') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (action === 'UPDATE') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="p-6 font-cairo bg-[#f8f9fa] min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> سجل العمليات (Audit Logs)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">تتبع كافة العمليات التي تتم داخل النظام</p>
                </div>
                <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded shadow-sm border">
                    آخر 100 عملية
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 shadow-sm border-slate-200">
                <div className="p-4 flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">المستخدم</label>
                        <select
                            className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="">(الكل)</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">نوع العملية</label>
                        <select
                            className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                        >
                            <option value="">(الكل)</option>
                            <option value="LOGIN">تسجيل دخول (LOGIN)</option>
                            <option value="CREATE">إضافة (CREATE)</option>
                            <option value="UPDATE">تعديل (UPDATE)</option>
                            <option value="DELETE">حذف (DELETE)</option>
                            <option value="POST">ترحيل (POST)</option>
                        </select>
                    </div>
                    <div>
                        <button
                            onClick={loadData}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <Search size={16} /> بحث
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                        <tr>
                            <th className="px-6 py-3 w-[180px]">التوقيت</th>
                            <th className="px-6 py-3 w-[150px]">المستخدم</th>
                            <th className="px-6 py-3 w-[120px]">العملية</th>
                            <th className="px-6 py-3 w-[150px]">الجدول/المكان</th>
                            <th className="px-6 py-3">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-slate-500">جاري التحميل...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                                <Shield size={32} />
                                لا توجد سجلات مطابقة
                            </td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-slate-500 text-sm dir-ltr">
                                        <div className="flex items-center gap-2 justify-end">
                                            {new Date(log.timestamp).toLocaleString()} <Clock size={14} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-slate-400" />
                                            {log.username || 'System'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600 text-sm font-mono">
                                        {log.table_name || '-'}
                                        {log.record_id && <span className="text-slate-400 text-xs ml-1">#{log.record_id.substring(0, 5)}</span>}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600 text-sm">
                                        <div className="max-w-md truncate" title={log.new_value || log.old_value}>
                                            {log.action === 'UPDATE' ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="text-red-500 line-through text-xs opacity-70">{log.old_value}</span>
                                                    <span className="text-slate-400">→</span>
                                                    <span className="text-emerald-600">{log.new_value}</span>
                                                </span>
                                            ) : (
                                                log.new_value || log.old_value || '-'
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;
