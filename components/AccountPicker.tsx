import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { Account } from '../types';
import { loadUnifiedAccountTree } from '../src/utils/unifiedAccountTree';

interface AccountPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (account: Account) => void;
    showTransactionalOnly?: boolean;
    selectableMode?: 'all' | 'posting' | 'header';
    hideNonSelectableRows?: boolean;
    allowedPrefixes?: string[];
    parentId?: string | null;
    currencyId?: string | null; // Currency Filtering
}

export const AccountPicker: React.FC<AccountPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    showTransactionalOnly = true,
    selectableMode,
    hideNonSelectableRows = false,
    allowedPrefixes,
    parentId,
    currencyId,
}) => {
    const [treeData, setTreeData] = useState<Account[]>([]);
    const [filteredData, setFilteredData] = useState<Account[]>([]);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectableAccounts, setSelectableAccounts] = useState<Account[]>([]);

    const matchesCurrency = (node: any): boolean => {
        if (!currencyId) return true;

        const target = String(currencyId).trim().toLowerCase();
        const nodeCurrencyId = String(node.currency_id || '').trim().toLowerCase();
        const nodeCurrencyCode = String(node.currency_code || '').trim().toLowerCase();

        if (!nodeCurrencyId && !nodeCurrencyCode) return true;
        if (target === nodeCurrencyId || target === nodeCurrencyCode) return true;

        const isCode = target.length <= 4 && !target.includes('-');
        if (isCode && nodeCurrencyId && nodeCurrencyId === target) return true;

        return false;
    };

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
            setSearch('');
        }
    }, [isOpen, parentId]);

    // Filter effect
    useEffect(() => {
        if (!treeData.length) return;

        const term = search.toLowerCase().trim();

        const filterNode = (node: Account): Account | null => {
            const nodeCode = node.account_code || node.code || '';
            const nodeName = (node.name || node.name_ar || '').toLowerCase();
            const nodeIsTransactional = Boolean(node.is_transactional);
            const nodeIsActive =
                String((node as any).status || '').toUpperCase() !== 'INACTIVE' &&
                Number((node as any).is_active ?? 1) !== 0;

            const effectiveMode: 'all' | 'posting' | 'header' = selectableMode || (showTransactionalOnly ? 'posting' : 'all');
            const modeMatch =
                effectiveMode === 'all'
                    ? true
                    : effectiveMode === 'posting'
                        ? nodeIsTransactional
                        : !nodeIsTransactional;

            // Currency Validation (supports both UUID and code like JOD/USD)
            const isCurrencyValid = matchesCurrency(node);

            // Prefix Validation
            let isPrefixValid = !allowedPrefixes || allowedPrefixes.length === 0;
            if (!isPrefixValid && allowedPrefixes) {
                isPrefixValid = allowedPrefixes.some(p => nodeCode.startsWith(p) || p.startsWith(nodeCode));
            }

            if (!isPrefixValid) return null;

            // Search Validation (combined with currency)
            const isMatch =
                (!term || nodeCode.includes(term) || nodeName.includes(term)) &&
                isCurrencyValid &&
                modeMatch &&
                nodeIsActive;

            // Process Children
            let filteredChildren: Account[] = [];
            if (node.children) {
                filteredChildren = node.children
                    .map(filterNode)
                    .filter(n => n !== null) as Account[];
            }

            if (isMatch || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren
                };
            }

            return null;
        };

        const filtered = treeData.map(filterNode).filter(n => n !== null) as Account[];
        setFilteredData(filtered);

        // Auto-expand when searching or filtering
        if (term || (allowedPrefixes && allowedPrefixes.length > 0)) {
            const autoExpand = (nodes: Account[], acc: Record<string, boolean>) => {
                nodes.forEach(n => {
                    const code = n.account_code || n.code;
                    if (code) acc[code] = true;
                    if (n.children) autoExpand(n.children, acc);
                });
            };
            const expandedMap: Record<string, boolean> = {};
            autoExpand(filtered, expandedMap);
            setExpanded(expandedMap);
        }
    }, [search, treeData, allowedPrefixes, currencyId, selectableMode, showTransactionalOnly]);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const fullTree = await loadUnifiedAccountTree(window.electronAPI, true);

                let targetNodes = fullTree;

                // If parentId is specified, find that node and use its children
                if (parentId) {
                    const findNode = (nodes: Account[]): Account | null => {
                        for (const node of nodes) {
                            if (node.id === parentId) return node;
                            if (node.children) {
                                const found = findNode(node.children);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    const parentNode = findNode(fullTree);
                    targetNodes = parentNode ? (parentNode.children || []) : [];

                    if (!parentNode) {
                        console.warn(`AccountPicker: Parent ID ${parentId} not found in tree.`);
                    }
                }

                setTreeData(targetNodes);
                setFilteredData(targetNodes);

                // Auto expand roots
                const initialExpanded: Record<string, boolean> = {};
                targetNodes.forEach((node: any) => {
                    const code = node.account_code || node.code;
                    if (code) initialExpanded[code] = true;
                });
                setExpanded(initialExpanded);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (code: string) => {
        setExpanded(prev => ({ ...prev, [code]: !prev[code] }));
    };

    if (!isOpen) return null;

    const renderTree = (nodes: Account[], level: number = 0) => {
        return nodes.map(node => {
            const nodeCode = node.account_code || node.code || '';
            const nodeName = node.name || node.name_ar || 'بدون اسم';
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expanded[nodeCode];
            const isActive =
                String((node as any).status || '').toUpperCase() !== 'INACTIVE' &&
                Number((node as any).is_active ?? 1) !== 0;

            // Selectable Rule:
            // 1. Must satisfy showTransactionalOnly
            // 2. Must satisfy Currency ID if provided
            const effectiveMode: 'all' | 'posting' | 'header' = selectableMode || (showTransactionalOnly ? 'posting' : 'all');
            const isTransactionalMatch =
                effectiveMode === 'all'
                    ? true
                    : effectiveMode === 'posting'
                        ? Boolean(node.is_transactional)
                        : !Boolean(node.is_transactional);
            const isCurrencyMatch = matchesCurrency(node);
            const isSelectable = isTransactionalMatch && isCurrencyMatch && isActive;
            const isSelected = selectableAccounts[selectedIndex]?.id === node.id;

            if (hideNonSelectableRows && !isSelectable && !hasChildren) {
                return null;
            }

            return (
                <div key={node.id} className="select-none">
                    <div
                        className={`flex items-center gap-2 py-1.5 px-2 hover:bg-indigo-50 cursor-pointer rounded transition-colors
              ${!isSelectable ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-sm'}
              ${isSelected && isSelectable ? 'bg-indigo-100 border border-indigo-300 shadow-sm' : ''}
            `}
                        style={{ paddingRight: `${level * 20 + 8}px` }}
                        onClick={() => {
                            if (isSelectable) onSelect(node);
                            else if (hasChildren) toggleExpand(nodeCode);
                        }}
                    >
                        <div
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(nodeCode);
                            }}
                        >
                            {hasChildren ? (
                                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />
                            ) : null}
                        </div>

                        <span className={node.is_transactional ? 'text-indigo-600' : 'text-amber-500'}>
                            {node.is_transactional ? <FileText size={16} /> : (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />)}
                        </span>

                        <span className="font-mono text-gray-500 text-xs bg-gray-50 border px-1 rounded mx-1">{nodeCode}</span>
                        <span className="flex-1 text-sm text-gray-800 font-medium">{nodeName}</span>

                        {node.is_transactional && isActive && (
                            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">اختيار</span>
                        )}
                        {!isActive && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">غير نشط</span>
                        )}
                    </div>

                    {isExpanded && hasChildren && (
                        <div className="border-r-2 border-gray-100 mr-2.5 pr-0">
                            {renderTree(node.children!, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl" style={{ zIndex: 9999999 }}>
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">اختيار حساب</h3>
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
                            placeholder="بحث برقم الحساب أو الاسم..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg pr-10 pl-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Tree List */}
                <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-white">
                    {loading ? (
                        <div className="flex justify-center p-8 text-gray-500">جاري التحميل...</div>
                    ) : (
                        filteredData.length > 0 ? (
                            <div className="space-y-0.5 pb-2">
                                {renderTree(filteredData)}
                            </div>
                        ) : (
                            <div className="text-center p-12 text-gray-400">
                                <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
                                <p>لا توجد حسابات مطابقة</p>
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium flex justify-between items-center">
                    <span>عدد الحسابات: <span className="font-bold text-gray-900">{filteredData.length}</span></span>

                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5">↑↓</kbd> للتنقل</span>
                        <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5">Enter</kbd> للاختيار</span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Use React Portal to render at document.body level
    return ReactDOM.createPortal(modalContent, document.body);
};
