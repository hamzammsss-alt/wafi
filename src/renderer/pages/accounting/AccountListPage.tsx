import React, { useEffect, useState } from 'react';

// Assuming useDocumentKeyboardPro exists in the project
// import { useDocumentKeyboardPro } from '../../hooks/useDocumentKeyboardPro';

export function AccountListPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const loadAccounts = async () => {
        if (!(window as any).electronAPI?.accounts) return;
        const res = await (window as any).electronAPI.accounts.list();
        if (res.ok) setAccounts(res.data);
    };

    useEffect(() => { loadAccounts(); }, []);

    // Placeholder until the real hook is imported properly
    const useDocumentKeyboardProFallback = ({ onUp, onDown, onEnter, onRefresh, onEscape }: any) => {
        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'ArrowUp') onUp();
                if (e.key === 'ArrowDown') onDown();
                if (e.key === 'Enter') onEnter();
                if (e.key === 'F5') onRefresh();
                if (e.key === 'Escape') onEscape();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [onUp, onDown, onEnter, onRefresh, onEscape]);
    };

    useDocumentKeyboardProFallback({
        onUp: () => setSelectedIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setSelectedIndex(prev => Math.min(accounts.length - 1, prev + 1)),
        onEnter: () => console.log('Open account', accounts[selectedIndex]),
        onRefresh: loadAccounts,
        onEscape: () => console.log('Go back')
    });

    return (
        <div className="flex flex-col h-full bg-gray-50 focus:outline-none" tabIndex={-1}>
            <div className="bg-gray-800 text-white p-2 font-bold">Chart of Accounts - Besan Pro</div>
            <div className="flex-1 p-4 overflow-auto">
                <table className="w-full border-collapse bg-white shadow-sm text-sm">
                    <thead>
                        <tr className="bg-gray-200 text-left">
                            <th className="p-2 border">Number</th>
                            <th className="p-2 border">Name</th>
                            <th className="p-2 border">Type</th>
                            <th className="p-2 border">Nature</th>
                            <th className="p-2 border">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map((acc, idx) => (
                            <tr key={acc.id} className={`border ${idx === selectedIndex ? 'bg-blue-100 font-semibold' : ''}`}>
                                <td className="p-2 border">{acc.number}</td>
                                <td className="p-2 border">{acc.name}</td>
                                <td className="p-2 border">{acc.type}</td>
                                <td className="p-2 border">{acc.nature}</td>
                                <td className="p-2 border">{acc.isActive ? 'Active' : 'Inactive'}</td>
                            </tr>
                        ))}
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-gray-500">No accounts found. Press F3 to create one.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-200 p-2 text-xs flex gap-4 text-gray-700">
                <span>[↑/↓] Navigate</span>
                <span>[Enter] Open</span>
                <span>[F3] New</span>
                <span>[F5] Refresh</span>
                <span>[Esc] Back</span>
            </div>
        </div>
    );
}
