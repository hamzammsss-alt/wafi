import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, RefreshCw, Trash2, Edit, Database } from 'lucide-react';
import { Account } from '../../../types';

const TreeNode: React.FC<{
  node: Account,
  level: number,
  expanded: Record<string, boolean>,
  toggleExpand: (id: string) => void,
  onAddChild: (node: Account) => void,
  onEdit: (node: Account) => void,
  onDelete: (id: string) => void
}> = ({ node, level, expanded, toggleExpand, onAddChild, onEdit, onDelete }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.account_code] || false; // Use account_code for unique key in map if 'code' was inconsistent

  // Indentation based on level
  const paddingRight = level * 24 + 8; // RTL padding

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-2 hover:bg-indigo-50 transition border-b border-gray-100 group
          ${level === 0 ? 'bg-gray-50/50 font-semibold' : ''}
        `}
        style={{ paddingRight: `${paddingRight}px` }}
      >
        {/* Expand/Collapse Toggle */}
        <div
          className="w-6 h-6 flex items-center justify-center cursor-pointer text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-200 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(node.account_code);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />
          ) : (
            <span className="w-4 block"></span>
          )}
        </div>

        {/* Icon */}
        <span className={`${hasChildren ? 'text-indigo-600' : 'text-gray-400'}`}>
          {hasChildren ? (isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />) : <FileText size={16} />}
        </span>

        {/* Code & Name */}
        <div className="flex-1 flex items-center gap-3">
          <span className="font-mono text-gray-500 text-xs bg-white border border-gray-200 px-1.5 py-0.5 roundedshadow-sm">{node.account_code}</span>
          <span className={`text-gray-800 ${level === 0 ? 'text-base' : 'text-sm'}`}>
            {node.name_ar}
            {node.name_en && <span className="text-xs text-gray-400 mr-2">({node.name_en})</span>}
          </span>
          {!hasChildren && node.is_transactional === 1 && (
            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">فرعي</span>
          )}
          {node.system_type && (
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-semibold">{node.system_type}</span>
          )}
        </div>

        {/* Balance */}
        <div className="w-32 text-left font-mono text-sm px-4">
          <span className={`${(node.balance || 0) < 0 ? 'text-red-500' : 'text-emerald-600'} font-medium`}>
            {(node.balance || 0) !== 0 ? (node.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
          </span>
        </div>

        {/* Actions (Hidden by default, shown on hover) */}
        <div className="w-20 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Allow adding child only if not Level 4? Since our seeding goes up to level 4 or so. */}
          {/* Or simply: if it's not transactional and we allow depth */}
          {(!node.is_transactional) && (
            <button
              onClick={() => onAddChild(node)}
              title="إضافة حساب فرعي"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Plus size={15} />
            </button>
          )}
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="تعديل"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="حذف"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="border-r-2 border-indigo-50 mr-6"> {/* Visual guide line RTL */}
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Modal Component
const AccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  mode: 'add' | 'edit';
  parentAccount?: Account;
  account?: Account;
  suggestedCode?: string;
}> = ({ isOpen, onClose, onSave, mode, parentAccount, account, suggestedCode }) => {
  const [name_ar, setNameAr] = useState('');
  const [name_en, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [isTransactional, setIsTransactional] = useState(false);
  const [systemType, setSystemType] = useState('NONE');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && account) {
        setNameAr(account.name_ar);
        setNameEn(account.name_en || '');
        setCode(account.account_code);
        setIsTransactional(account.is_transactional === 1);
        setSystemType(account.system_type || 'NONE');
      } else {
        setNameAr('');
        setNameEn('');
        setCode(suggestedCode || '');
        setIsTransactional(false);
        setSystemType('NONE');
      }
    }
  }, [isOpen, mode, account, parentAccount, suggestedCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden zoom-in-95 duration-200 border border-gray-100">
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-lg">
            {mode === 'add' ? 'إضافة حساب جديد' : 'تعديل بيانات حساب'}
          </h3>
          <button onClick={onClose} className="hover:bg-gray-200 text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"><Plus className="rotate-45" size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {mode === 'add' && parentAccount && (
            <div className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center gap-2">
              <FolderOpen size={16} />
              <span>يتم الإضافة تحت: <span className="font-bold">{parentAccount.name_ar}</span> <span className="font-mono text-xs opacity-75">({parentAccount.account_code})</span></span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">رمز الحساب (الكود)</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={mode === 'edit'} // Usually code is immutable
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم الحساب (عربي)</label>
            <input
              type="text"
              value={name_ar}
              onChange={e => setNameAr(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-gray-400"
              placeholder="مثال: ذمم موظفين xy"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم الحساب (إنجليزي)</label>
            <input
              type="text"
              value={name_en}
              onChange={e => setNameEn(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-gray-400"
              placeholder="Example: Employee AR"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">الربط بالنظام (System Function)</label>
            <select
              value={systemType}
              onChange={e => setSystemType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="NONE">بدون ربط</option>
              <option value="BANK">حساب بنكي (Bank)</option>
              <option value="CASH">صندوق نقدية (Cash Box)</option>
              <option value="CUSTOMER">العملاء (Customers)</option>
              <option value="VENDOR">الموردين (Vendors)</option>
              <option value="EMPLOYEE">الموظفين (Employees)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">يحدد وظيفة هذا الحساب لغايات الربط الآلي مع الموديولات الأخرى.</p>
          </div>

          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setIsTransactional(!isTransactional)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isTransactional ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
              {isTransactional && <ChevronDown className="text-white" size={14} strokeWidth={4} />}
            </div>
            {/* Native checkbox hidden but state managed above for custom UI */}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">حساب نهائي (فرعي)</p>
              <p className="text-xs text-gray-500">الحسابات النهائية هي التي تقبل حركات اليومية، ولا يمكن إضافة أبناء لها.</p>
            </div>
          </div>

        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-lg transition-all">إلغاء</button>
          <button
            onClick={() => onSave({ name_ar, name_en, code, is_transactional: isTransactional, system_type: systemType === 'NONE' ? null : systemType })}
            disabled={!name_ar || !code}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-sm shadow-indigo-200 transition-all font-medium"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};


export const ChartOfAccounts = () => {
  const [treeData, setTreeData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedParent, setSelectedParent] = useState<Account | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [suggestedCode, setSuggestedCode] = useState('');

  const api = (window as any).electronAPI?.account;

  useEffect(() => {
    loadAccountTree();
  }, []);

  const loadAccountTree = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const tree = await api.getTree();
      setTreeData(tree);
      const initialExpanded: Record<string, boolean> = {};

      // Helper to auto-expand first few levels or just roots
      const expandAll = (nodes: any[]) => {
        nodes.forEach(n => {
          if (n.account_code.length <= 2) { // Expand only top levels by default
            initialExpanded[n.account_code] = true;
            if (n.children) expandAll(n.children);
          }
        });
      };
      expandAll(tree);

      setExpanded(prev => ({ ...prev, ...initialExpanded }));
    } catch (err) {
      console.error("Failed to load account tree", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (code: string) => {
    setExpanded(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Generate next code based on parent children
  const getNextCode = (parent: Account) => {
    if (!parent) return '1';

    // Logic: 
    // If parent is "11", children should be "1101", "1102"... (Standard 2 digits suffix?)
    // OR "111", "112" (1 digit suffix)
    // Seeding uses mixed length. "1" -> "11" -> "1101" -> "110101"

    // Let's assume consistent suffix length based on parent level?
    // Level 1 (Code 1): Children 11, 12... (Suffix length 1)
    // Level 2 (Code 11): Children 1101, 1102... (Suffix length 2)
    // Level 3 (Code 1101): Children 110101... (Suffix length 2)

    // Auto-detect max child code
    if (!parent.children || parent.children.length === 0) {
      // First child
      // If parent len is 1 (e.g., "1"), child is "11"
      if (parent.account_code.length === 1) return parent.account_code + '1';
      // If parent len is 2 (e.g., "11"), child is "1101"
      if (parent.account_code.length === 2) return parent.account_code + '01';
      // Else add 01
      return parent.account_code + '01';
    }

    let max = 0;
    parent.children.forEach(child => {
      // Suffix is the part AFTER parent code
      const suffix = child.account_code.substring(parent.account_code.length);
      const num = parseInt(suffix);
      if (!isNaN(num) && num > max) max = num;
    });

    // Pad if needed (if length 2 was used before)
    const nextNum = max + 1;
    // Check existing child suffix length to decide padding
    const firstChild = parent.children[0];
    const siblingSuffixLen = firstChild.account_code.length - parent.account_code.length;

    return parent.account_code + String(nextNum).padStart(siblingSuffixLen, '0');
  };

  const handleAddChild = (parentNode: Account) => {
    setModalMode('add');
    setSelectedParent(parentNode);
    setEditingAccount(undefined);
    setSuggestedCode(getNextCode(parentNode));
    setIsModalOpen(true);
  };

  const handleEdit = (node: Account) => {
    setModalMode('edit');
    setEditingAccount(node);
    setSelectedParent(undefined); // Not needed for edit
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.deleteAccount(id);
      loadAccountTree();
    } catch (e: any) {
      alert("فشل الحذف: " + e.message);
    }
  };

  const handleAddRoot = () => {
    // Logic for new root (Level 1)
    setModalMode('add');
    setSelectedParent(undefined);

    // Find max root code
    let max = 0;
    treeData.forEach(node => {
      const num = parseInt(node.account_code);
      if (!isNaN(num) && num > max) max = num;
    });
    setSuggestedCode((max + 1).toString());
    setIsModalOpen(true);
  };

  const onSaveAccount = async (data: any) => {
    try {
      if (modalMode === 'add') {
        const newAccount = {
          account_code: data.code,
          name_ar: data.name_ar,
          name_en: data.name_en,
          account_type: selectedParent ? selectedParent.account_type : 'ASSET', // Default or inherit
          parent_id: selectedParent ? selectedParent.id : null,
          is_transactional: data.is_transactional,
          currency_id: null,
          requires_cost_center: 0,
          system_type: data.system_type
        };
        await api.saveAccount(newAccount);
      } else {
        // Edit
        const updatedAccount = {
          ...editingAccount,
          name_ar: data.name_ar,
          name_en: data.name_en,
          is_transactional: data.is_transactional,
          system_type: data.system_type
        };
        await api.saveAccount(updatedAccount);
      }

      setIsModalOpen(false);
      loadAccountTree(); // Refresh
    } catch (e: any) {
      alert('حدث خطأ أثناء الحفظ: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] p-6 gap-6" dir="rtl">

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveAccount}
        mode={modalMode}
        parentAccount={selectedParent}
        account={editingAccount}
        suggestedCode={suggestedCode}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-indigo-600 shadow-sm">
              <FolderOpen size={24} />
            </div>
            دليل الحسابات
          </h1>
          <p className="text-gray-500 text-sm mt-1 mr-14">إدارة الهيكل الشجري للحسابات المالية</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadAccountTree} className="btn-icon bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm" title="تحديث">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleAddRoot} className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]">
            <Plus size={18} />
            <span>حساب رئيسي جديد</span>
          </button>
        </div>
      </div>

      {/* Tree View Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        {/* Table Header */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider backdrop-blur-sm">
          <span className="flex-1 mr-8">اسم الحساب</span>
          <span className="w-32 text-left pl-4">الرصيد الحالي</span>
          <span className="w-20 text-center">الإجراءات</span>
        </div>

        {/* Tree Content */}
        <div className="overflow-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
              <RefreshCw className="animate-spin" size={20} />
              <span>جاري التحميل...</span>
            </div>
          ) : (
            treeData.length > 0 ? (
              <div className="pb-4">
                {treeData.map(node => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                <div className="p-4 bg-gray-50 rounded-full">
                  <FolderOpen size={48} className="text-gray-300" />
                </div>
                <p>لا توجد حسابات مضافة بعد</p>
                <button onClick={loadAccountTree} className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline text-sm">إعادة تحميل</button>
              </div>
            )
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-400 flex justify-between font-mono">
          <span>Total Accounts: {treeData.length} (Roots)</span>
          <span>Last Sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
