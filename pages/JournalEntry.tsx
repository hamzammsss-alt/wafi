import React, { useState, useEffect } from 'react';
import { Save, Printer, ArrowLeftRight, CheckCircle2, AlertCircle, XCircle, PlusCircle, Sparkles, Loader2 } from 'lucide-react';
import { getJournalFromAI } from '../services/aiService';
import { useGlobalShortcuts } from '../src/hooks/useGlobalShortcuts';
import { JournalVoucherGrid, JournalLine } from '../components/JournalVoucherGrid';
import Decimal from 'decimal.js';


export const JournalEntry = () => {
  // --- State ---
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: null, debitLocal: 0, creditLocal: 0, debitForeign: 0, creditForeign: 0, description: '' },
    { accountId: null, debitLocal: 0, creditLocal: 0, debitForeign: 0, creditForeign: 0, description: '' },
  ]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [refNo, setRefNo] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Calculations ---
  const totalDebit = lines.reduce((sum, line) => sum.plus(new Decimal(line.debitLocal || 0)), new Decimal(0));
  const totalCredit = lines.reduce((sum, line) => sum.plus(new Decimal(line.creditLocal || 0)), new Decimal(0));
  const diff = totalDebit.minus(totalCredit);

  // --- Actions ---
  const fetchNextNo = async () => {
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      const no = await window.electronAPI.getNextVoucherNo('JV');
      setRefNo(no);
    } else {
      setRefNo(`JV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
    }
  };

  const clearForm = () => {
    setLines([
      { accountId: null, debitLocal: 0, creditLocal: 0, debitForeign: 0, creditForeign: 0, description: '' },
      { accountId: null, debitLocal: 0, creditLocal: 0, debitForeign: 0, creditForeign: 0, description: '' }
    ]);
    setDescription('');
    setCostCenter('');
    setFeedback(null);
    // Refresh RefNo
    fetchNextNo();
  };

  useEffect(() => {
    fetchNextNo();
  }, [feedback]); // Refresh on save success

  const validate = () => {
    if (!diff.equals(0)) {
      setFeedback({ type: 'error', message: `القيد غير متوازن. الفرق: ${diff.toString()}` });
      return false;
    }
    if (totalDebit.equals(0)) {
      setFeedback({ type: 'error', message: 'لا يمكن حفظ قيد صفري.' });
      return false;
    }
    if (lines.some(l => !l.accountId)) {
      setFeedback({ type: 'error', message: 'يجب تحديد الحساب لجميع الأسطر.' });
      return false;
    }
    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'يرجى إدخال بيان عام للقيد.' });
      return false;
    }
    return true;
  };

  const handleSave = async (status: 'Draft' | 'Posted') => {
    setFeedback(null);
    if (status === 'Posted' && !validate()) return;

    setIsSaving(true);
    try {
      const transaction = {
        type: 'JV',
        ref_no: refNo,
        date: date,
        description: description,
        lines: lines.map(l => ({
          account_id: l.accountId,
          debit: l.debitLocal,
          credit: l.creditLocal,
          description: l.description || description,
          cost_center: costCenter
        })),
        status: status
      };

      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.saveTransaction(transaction);
        setFeedback({
          type: 'success',
          message: status === 'Posted' ? 'تم ترحيل القيد بنجاح (F2)' : 'تم حفظ المسودة بنجاح (F10)'
        });

        if (status === 'Posted') {
          setTimeout(() => clearForm(), 1500);
        }
      } else {
        console.warn('Electron API not available');
        setFeedback({ type: 'success', message: `تم الحفظ (${status}) - محاكاة` });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setFeedback(null);
    try {
      const generatedLines = await getJournalFromAI(aiPrompt);
      if (generatedLines.length > 0) {
        const mappedLines = generatedLines.map(gl => ({
          accountId: null, // AI returns account_name which picker needs to resolve, or we map if we have ID
          accountName: gl.account_name, // Mapping expected by Grid if ID is null? 
          accountCode: '',
          debitLocal: gl.debit || 0,
          creditLocal: gl.credit || 0,
          debitForeign: 0,
          creditForeign: 0,
          description: gl.description || aiPrompt
        }));
        setLines(mappedLines as JournalLine[]);
        setDescription(aiPrompt);
      }
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'فشل توليد القيد بواسطة الذكاء الاصطناعي' });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Navigation Helpers ---
  const handleHeaderEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextId) {
        const el = document.getElementById(nextId);
        el?.focus();
      } else {
        // Go to Grid First Cell
        const gridCell = document.querySelector('[data-row-index="0"][data-col-id="accountId"]') as HTMLElement;
        if (gridCell) {
          gridCell.focus();
          gridCell.click();
        }
      }
    }
  };

  const handleGridFinish = () => {
    const btn = document.getElementById('btn-post');
    btn?.focus();
  };

  // --- Global Shortcuts ---
  useGlobalShortcuts({
    onSave: () => handleSave('Posted'),    // F2
    onDraft: () => handleSave('Draft'),   // F10
    onNew: () => {                        // F4
      if (confirm('هل تريد مسح النموذج وبدء قيد جديد؟')) clearForm();
    },
    onPrint: () => alert('Print functionality coming soon...'), // F9
    onPost: () => handleSave('Posted') // F12
  });

  return (
    <div className="flex flex-col h-full gap-4 relative">

      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">قيد يومية جديد</h1>
            <p className="text-gray-400 text-sm font-mono">{refNo}</p>
          </div>
        </div>
        <div className="flex gap-2">

          {/* AI Assistant */}
          <div className={`hidden md:flex items-center bg-purple-50 rounded-xl px-2 transition-all ${aiPrompt || isGenerating ? 'w-96' : 'w-10 overflow-hidden hover:w-96'}`}>
            <div className="p-2 text-purple-600 cursor-pointer"><Sparkles size={18} /></div>
            <input
              className="bg-transparent border-none outline-none text-sm p-2 w-full text-purple-800 placeholder-purple-300"
              placeholder="مساعد الذكاء الاصطناعي: (مثال: اشترين قرطاسية ب 500 نقد)"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAIGenerate()}
              disabled={isGenerating}
            />
            {isGenerating && <Loader2 size={16} className="text-purple-600 animate-spin mr-2" />}
          </div>

          <button className="bg-gray-100 text-gray-600 p-2.5 rounded-xl hover:bg-gray-200 transition" title="طباعة (F9)"><Printer size={20} /></button>
          <button
            className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-100 transition"
            title="جديد (F4)"
            onClick={() => { if (confirm('هل أنت متأكد من مسح النموذج؟')) clearForm(); }}
          >
            <PlusCircle size={20} />
          </button>

          <button
            onClick={() => handleSave('Draft')}
            disabled={isSaving}
            className="bg-white border-2 border-blue-100 text-blue-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition disabled:opacity-70 disabled:cursor-not-allowed"
            title="حفظ مسودة (F10)"
          >
            <Save size={20} />
            <span>حفظ مسودة</span>
          </button>

          <button
            id="btn-post"
            onClick={() => handleSave('Posted')}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed focus:ring-4 focus:ring-blue-300 outline-none"
            title="حفظ وترحيل (F2/F12)"
          >
            <CheckCircle2 size={20} />
            <span>حفظ وترحيل</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="mr-auto opacity-50 hover:opacity-100"><XCircle size={18} /></button>
        </div>
      )}

      {/* Meta Data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 pr-1">تاريخ القيد</label>
          <input
            id="input-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            onKeyDown={e => handleHeaderEnter(e, 'input-desc')}
            className="bg-white border-2 border-transparent focus:border-blue-500 rounded-lg p-2 text-sm outline-none transition"
            // Tab Index 1
            tabIndex={1}
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-bold text-gray-500 pr-1">البيان العام <span className="text-red-500">*</span></label>
          <input
            id="input-desc"
            type="text"
            placeholder="اكتب وصفاً مختصراً للعملية..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => handleHeaderEnter(e, 'input-cost')}
            className="bg-white border-2 border-transparent focus:border-blue-500 rounded-lg p-2 text-sm outline-none transition"
            // Tab Index 2
            tabIndex={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 pr-1">مركز التكلفة</label>
          <select
            id="input-cost"
            value={costCenter}
            onChange={e => setCostCenter(e.target.value)}
            onKeyDown={e => handleHeaderEnter(e)} // No next ID -> Goes to Grid
            className="bg-white border-2 border-transparent focus:border-blue-500 rounded-lg p-2 text-sm outline-none appearance-none transition"
            // Tab Index 3
            tabIndex={3}
          >
            <option value="">غير محدد</option>
            <option value="ADMIN">قسم الإدارة</option>
            <option value="MFG">قسم التصنيع</option>
            <option value="SALES">قسم المبيعات</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden" tabIndex={4}>
        <JournalVoucherGrid
          data={lines}
          onUpdateRow={(rowIdx, colId, val) => {
            setLines(prev => {
              const newLines = [...prev];
              newLines[rowIdx] = { ...newLines[rowIdx], [colId]: val };
              return newLines;
            });
          }}
          onRemoveRow={(rowIdx) => {
            setLines(prev => prev.filter((_, i) => i !== rowIdx));
          }}
          onAddRow={() => {
            setLines(prev => [...prev, { accountId: null, debitLocal: 0, creditLocal: 0, debitForeign: 0, creditForeign: 0, description: '' }]);
          }}
          onFinish={handleGridFinish}
        />
      </div>

      {/* Footer / Totals */}
      <div className={`text-white p-5 rounded-2xl flex justify-between items-center shadow-lg transition-colors duration-300 ${diff.equals(0) ? 'bg-[#1e293b]' : 'bg-[#334155]'}`}>
        <div className="flex gap-12">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">إجمالي المدين</span>
            <span className="text-3xl font-mono font-bold text-blue-400">₪ {totalDebit.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">إجمالي الدائن</span>
            <span className="text-3xl font-mono font-bold text-red-400">₪ {totalCredit.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="h-10 w-px bg-gray-700 mx-4"></div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            {diff.abs().lt(0.01) ? (
              <span className="flex items-center gap-1 text-emerald-400 text-sm font-bold animate-pulse">
                <CheckCircle2 size={16} /> القيد متوازن
              </span>
            ) : (
              <span className="text-red-400 text-sm font-bold flex items-center gap-1">
                <AlertCircle size={16} />
                غير متوازن: {diff.abs().toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

