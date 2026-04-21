import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Edit, Lock, Plus, RefreshCw, Save, Trash2, TrendingUp, X } from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { commonCurrencies } from '../../../src/lib/currency-data';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';

type CurrencyRow = {
    id?: string;
    code: string;
    name_ar: string;
    name_en: string;
    exchange_rate: number;
    symbol: string;
    is_base: number | boolean;
    is_base_currency?: number | boolean;
    isBaseCurrency?: boolean;
    is_fixed?: number | boolean;
    isFixedRate?: boolean;
    last_update?: string | null;
};

type CurrencyRateEntry = {
    id?: string;
    code: string;
    date: string;
    rate: number;
    source?: string;
    recordedAt?: string | null;
    is_fixed?: number | boolean;
};

const initialCurrencyState: CurrencyRow = {
    code: '',
    name_ar: '',
    name_en: '',
    exchange_rate: 1,
    symbol: '',
    is_base: 0,
    is_fixed: 0,
};

const normalizeCurrencyCode = (value: unknown) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return '';
    return normalized === 'NIS' ? 'ILS' : normalized;
};

const isBaseCurrency = (currency: Partial<CurrencyRow> | null | undefined) =>
    currency?.is_base === 1 ||
    currency?.is_base === true ||
    currency?.is_base_currency === 1 ||
    currency?.is_base_currency === true ||
    currency?.isBaseCurrency === true;

const isFixedCurrency = (currency: Partial<CurrencyRow> | null | undefined) =>
    isBaseCurrency(currency) ||
    currency?.is_fixed === 1 ||
    currency?.is_fixed === true ||
    currency?.isFixedRate === true;

const normalizeCurrencyRow = (currency: any): CurrencyRow => ({
    ...currency,
    code: normalizeCurrencyCode(currency?.code),
    name_ar: String(currency?.name_ar || currency?.nameAr || ''),
    name_en: String(currency?.name_en || currency?.nameEn || ''),
    exchange_rate: Number(currency?.exchange_rate ?? currency?.exchangeRate ?? 1),
    symbol: String(currency?.symbol || ''),
    is_base: isBaseCurrency(currency) ? 1 : 0,
    is_fixed: isFixedCurrency(currency) ? 1 : 0,
    last_update: typeof currency?.last_update === 'string' ? currency.last_update : null,
});

const normalizeHistoryEntry = (entry: any): CurrencyRateEntry => ({
    id: String(entry?.id || ''),
    code: normalizeCurrencyCode(entry?.code),
    date: String(entry?.date || ''),
    rate: Number(entry?.rate ?? 1),
    source: String(entry?.source || ''),
    recordedAt: typeof entry?.recordedAt === 'string' ? entry.recordedAt : null,
    is_fixed: entry?.is_fixed === 1 || entry?.is_fixed === true ? 1 : 0,
});

const formatShortDate = (value?: string | null) => {
    if (!value) return '---';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 10);
    }
    return parsed.toLocaleDateString('en-GB');
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '---';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getSourceLabel = (source?: string) => {
    const normalized = String(source || '').trim().toUpperCase();
    if (normalized === 'SCRAPER') return 'تحديث يومي';
    if (normalized === 'MANUAL') return 'إدخال يدوي';
    if (normalized === 'SYSTEM') return 'النظام';
    return normalized || 'غير محدد';
};

export const Currencies = () => {
    const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCurrency, setCurrentCurrency] = useState<CurrencyRow>(initialCurrencyState);
    const [rateTimeline, setRateTimeline] = useState<CurrencyRateEntry[]>([]);

    const api = (window as any).electronAPI?.currency;

    const fetchCurrencies = async () => {
        if (!api?.getCurrencies) return;
        setLoading(true);
        try {
            const data = await api.getCurrencies();
            const filteredData = (Array.isArray(data) ? data : [])
                .map(normalizeCurrencyRow)
                .filter((currency) => currency.name_ar.trim() !== '');
            setCurrencies(filteredData);
        } catch (error) {
            console.error('Failed to fetch currencies', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchCurrencies();
    }, []);

    useEffect(() => {
        if (!isModalOpen) return;

        const code = normalizeCurrencyCode(currentCurrency.code);
        if (!code || code.length < 3) {
            setRateTimeline([]);
            return;
        }

        let cancelled = false;

        const fetchTimeline = async () => {
            if (!api?.getCurrencyTimeline && !api?.getCurrencyHistory) {
                setRateTimeline([]);
                return;
            }

            setHistoryLoading(true);
            try {
                const data = api?.getCurrencyTimeline
                    ? await api.getCurrencyTimeline(code, 24)
                    : await api.getCurrencyHistory(code, 30);

                if (!cancelled) {
                    setRateTimeline((Array.isArray(data) ? data : []).map(normalizeHistoryEntry));
                }
            } catch (error) {
                console.error(`Failed to fetch currency timeline for ${code}`, error);
                if (!cancelled) {
                    setRateTimeline([]);
                }
            } finally {
                if (!cancelled) {
                    setHistoryLoading(false);
                }
            }
        };

        void fetchTimeline();

        return () => {
            cancelled = true;
        };
    }, [api, currentCurrency.code, isModalOpen]);

    const handleSave = async () => {
        const normalizedCode = normalizeCurrencyCode(currentCurrency.code);
        if (!normalizedCode || !currentCurrency.name_ar.trim()) {
            alert('يرجى تعبئة الحقول الإلزامية: رمز العملة والاسم بالعربية.');
            return;
        }

        try {
            await api.saveCurrency({
                ...currentCurrency,
                code: normalizedCode,
                exchange_rate: isBaseCurrency(currentCurrency) ? 1 : Number(currentCurrency.exchange_rate || 1),
                is_base: isBaseCurrency(currentCurrency) ? 1 : 0,
                is_fixed: isBaseCurrency(currentCurrency) ? 1 : (isFixedCurrency(currentCurrency) ? 1 : 0),
            });
            await fetchCurrencies();
            closeModal();
        } catch (err: any) {
            alert(`فشل الحفظ: ${err.message}`);
        }
    };

    const handleEdit = (currency: CurrencyRow) => {
        setCurrentCurrency({
            ...normalizeCurrencyRow(currency),
            exchange_rate: isBaseCurrency(currency) ? 1 : Number(currency.exchange_rate || 1),
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('هل أنت متأكد من حذف هذه العملة؟')) return;

        try {
            await api.deleteCurrency(id);
            await fetchCurrencies();
        } catch (err: any) {
            alert(`فشل الحذف: ${err.message}`);
        }
    };

    const handleScrape = async () => {
        setScraping(true);
        try {
            const success = await api.updateRates();
            if (success) {
                alert('تم تحديث أسعار الصرف بنجاح.');
                await fetchCurrencies();
            } else {
                alert('تعذر تحديث أسعار الصرف. تحقق من الاتصال بالإنترنت أو من العملات المثبتة.');
            }
        } catch (err: any) {
            alert(`خطأ أثناء تحديث الأسعار: ${err.message}`);
        } finally {
            setScraping(false);
        }
    };

    const openModal = () => {
        setIsEditing(false);
        setCurrentCurrency(initialCurrencyState);
        setRateTimeline([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
        setCurrentCurrency(initialCurrencyState);
        setRateTimeline([]);
    };

    const handlePresetSelect = (code: string) => {
        const normalizedCode = normalizeCurrencyCode(code);
        if (!normalizedCode) return;

        const selected = commonCurrencies.find((currency) => normalizeCurrencyCode(currency.code) === normalizedCode);
        if (!selected) return;

        setCurrentCurrency((prev) => ({
            ...prev,
            code: normalizedCode,
            name_ar: selected.name_ar,
            name_en: selected.name_en,
            symbol: selected.symbol,
        }));
    };

    useCreateIntent(openModal);

    const baseCurrency = useMemo(
        () => currencies.find((currency) => isBaseCurrency(currency)) || null,
        [currencies],
    );

    const fixedCurrenciesCount = useMemo(
        () => currencies.filter((currency) => !isBaseCurrency(currency) && isFixedCurrency(currency)).length,
        [currencies],
    );

    const displayCurrencies = useMemo(() => {
        return [...currencies].sort((left, right) => {
            const leftBase = isBaseCurrency(left) ? 1 : 0;
            const rightBase = isBaseCurrency(right) ? 1 : 0;
            if (leftBase !== rightBase) return rightBase - leftBase;

            const leftFixed = isFixedCurrency(left) ? 1 : 0;
            const rightFixed = isFixedCurrency(right) ? 1 : 0;
            if (leftFixed !== rightFixed) return rightFixed - leftFixed;

            return left.code.localeCompare(right.code);
        });
    }, [currencies]);

    return (
        <div className="h-full bg-gray-50 p-4 md:p-6" dir="rtl">
            <WorkspaceHeader
                icon={<Coins size={24} />}
                title="إدارة العملات وأسعار الصرف"
                subtitle={`تحديث ومتابعة أسعار العملات مقابل العملة الرئيسية${baseCurrency?.name_ar ? ` (${baseCurrency.name_ar})` : ''}`}
                badges={[
                    { label: `العملات ${currencies.length}`, tone: 'warning' },
                    ...(baseCurrency
                        ? [{ label: `العملة الرئيسية ${baseCurrency.name_ar || baseCurrency.code}`, tone: 'info' as const }]
                        : []),
                    ...(fixedCurrenciesCount > 0
                        ? [{ label: `الأسعار الثابتة ${fixedCurrenciesCount}`, tone: 'success' as const }]
                        : []),
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleScrape}
                            disabled={scraping}
                            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-blue-600 disabled:opacity-70"
                        >
                            <RefreshCw size={18} className={scraping ? 'animate-spin text-blue-600' : ''} />
                            {scraping ? 'جارٍ التحديث...' : 'تحديث الأسعار'}
                        </button>

                        <button
                            onClick={openModal}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"
                        >
                            <Plus size={20} />
                            إضافة عملة
                        </button>
                    </div>
                }
                className="mb-6"
            />

            {loading ? (
                <div className="flex h-64 items-center justify-center text-gray-400">
                    <RefreshCw className="ml-2 animate-spin" />
                    جارٍ تحميل البيانات...
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                    {displayCurrencies.map((currency) => (
                        <CurrencyCard
                            key={currency.id || currency.code}
                            currency={currency}
                            onEdit={() => handleEdit(currency)}
                            onDelete={() => handleDelete(currency.id)}
                            isBase={isBaseCurrency(currency)}
                            isFixed={isFixedCurrency(currency)}
                        />
                    ))}

                    <button
                        onClick={openModal}
                        className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                        <Plus size={40} className="mb-2 opacity-50" />
                        <span className="font-medium">إضافة عملة جديدة</span>
                    </button>
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 pt-6 backdrop-blur-sm md:p-4 md:pt-10"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {isEditing ? 'تعديل بيانات العملة' : 'إضافة عملة جديدة'}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        يتم حفظ السعر الحالي في السجل تلقائيًا عند كل تعديل أو تحديث يومي.
                                    </p>
                                </div>
                                <button onClick={closeModal} className="text-gray-400 transition hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid max-h-[calc(100vh-7rem)] gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                <div className="border-l border-gray-100 p-6">
                                    <div className="space-y-4">
                                        {!isEditing && (
                                            <div className="pb-2">
                                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                                    اختر عملة جاهزة اختياريًا
                                                </label>
                                                <select
                                                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    onChange={(event) => handlePresetSelect(event.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>
                                                        -- اختر لتعبئة الحقول تلقائيًا --
                                                    </option>
                                                    {commonCurrencies.map((currency) => (
                                                        <option key={currency.code} value={currency.code}>
                                                            {currency.name_ar} ({normalizeCurrencyCode(currency.code)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">رمز العملة (Code)</label>
                                                <input
                                                    className="w-full rounded-lg border border-gray-300 p-2.5 font-mono uppercase tracking-wider outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Ex: USD"
                                                    value={currentCurrency.code}
                                                    onChange={(event) =>
                                                        setCurrentCurrency({ ...currentCurrency, code: normalizeCurrencyCode(event.target.value) })
                                                    }
                                                    autoFocus
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">الرمز</label>
                                                <input
                                                    className="w-full rounded-lg border border-gray-300 p-2.5 text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="$"
                                                    value={currentCurrency.symbol}
                                                    onChange={(event) =>
                                                        setCurrentCurrency({ ...currentCurrency, symbol: event.target.value })
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">الاسم بالعربية</label>
                                            <input
                                                className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                placeholder="مثال: دولار أمريكي"
                                                value={currentCurrency.name_ar}
                                                onChange={(event) =>
                                                    setCurrentCurrency({ ...currentCurrency, name_ar: event.target.value })
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">الاسم بالإنجليزية</label>
                                            <input
                                                className="w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Ex: US Dollar"
                                                value={currentCurrency.name_en}
                                                onChange={(event) =>
                                                    setCurrentCurrency({ ...currentCurrency, name_en: event.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                                                <TrendingUp size={16} />
                                                سعر الصرف
                                            </label>

                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    className="w-full rounded-lg border border-amber-200 p-3 pl-20 text-right font-mono text-lg font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500 disabled:bg-amber-100/60 disabled:text-gray-500"
                                                    value={currentCurrency.exchange_rate}
                                                    disabled={isBaseCurrency(currentCurrency)}
                                                    onChange={(event) => {
                                                        const parsed = Number(event.target.value);
                                                        setCurrentCurrency({
                                                            ...currentCurrency,
                                                            exchange_rate: Number.isFinite(parsed) ? parsed : 0,
                                                        });
                                                    }}
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                                    مقابل الرئيسية
                                                </span>
                                            </div>

                                            <p className="mt-2 text-xs text-amber-600">
                                                يتم اعتماد هذا السعر في النظام، كما يُحفَظ تلقائيًا في سجل الأسعار عند الحفظ.
                                            </p>
                                            {isBaseCurrency(currentCurrency) && (
                                                <p className="mt-2 text-xs font-medium text-emerald-600">
                                                    العملة الرئيسية سعرها ثابت دائمًا 1.0000
                                                </p>
                                            )}
                                        </div>

                                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={isBaseCurrency(currentCurrency)}
                                                onChange={(event) =>
                                                    setCurrentCurrency((prev) => ({
                                                        ...prev,
                                                        is_base: event.target.checked ? 1 : 0,
                                                        is_fixed: event.target.checked ? 1 : prev.is_fixed,
                                                        exchange_rate: event.target.checked ? 1 : prev.exchange_rate,
                                                    }))
                                                }
                                                className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <span className="block font-medium text-gray-900">العملة الرئيسية</span>
                                                <span className="block text-sm text-gray-500">
                                                    استخدم هذه العملة كمرجع للنظام ولجميع العملات الأخرى.
                                                </span>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                                                isBaseCurrency(currentCurrency)
                                                    ? 'cursor-not-allowed bg-gray-50 opacity-75'
                                                    : 'cursor-pointer hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isFixedCurrency(currentCurrency)}
                                                disabled={isBaseCurrency(currentCurrency)}
                                                onChange={(event) =>
                                                    setCurrentCurrency((prev) => ({
                                                        ...prev,
                                                        is_fixed: event.target.checked ? 1 : 0,
                                                    }))
                                                }
                                                className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <span className="flex items-center gap-2 font-medium text-gray-900">
                                                    <Lock size={16} className="text-amber-600" />
                                                    سعر ثابت
                                                </span>
                                                <span className="block text-sm text-gray-500">
                                                    عند التفعيل لن تتغير هذه العملة أثناء التحديث اليومي، وسيبقى السعر على القيمة التي تحفظها يدويًا.
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-gray-50/60 p-6">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800">سجل أسعار العملة</h4>
                                            <p className="mt-1 text-sm text-gray-500">
                                                آخر الأسعار المحفوظة لعملة {currentCurrency.name_ar || currentCurrency.code || '...'}
                                            </p>
                                        </div>
                                        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm">
                                            {normalizeCurrencyCode(currentCurrency.code) || '---'}
                                        </div>
                                    </div>

                                    <div className="mb-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                            <span className="block text-xs text-gray-400">السعر الحالي</span>
                                            <span className="mt-1 block font-mono text-2xl font-bold text-gray-900">
                                                {Number(currentCurrency.exchange_rate || 0).toFixed(4)}
                                            </span>
                                        </div>
                                        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                            <span className="block text-xs text-gray-400">الحالة</span>
                                            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                {isBaseCurrency(currentCurrency)
                                                    ? 'العملة الرئيسية'
                                                    : isFixedCurrency(currentCurrency)
                                                      ? 'سعر ثابت'
                                                      : 'متغير'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                        <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr] gap-3 border-b bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500">
                                            <span>التاريخ</span>
                                            <span className="text-center">السعر</span>
                                            <span className="text-left">المصدر</span>
                                        </div>

                                        {historyLoading ? (
                                            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                                                <RefreshCw size={16} className="ml-2 animate-spin" />
                                                جارٍ تحميل سجل الأسعار...
                                            </div>
                                        ) : rateTimeline.length === 0 ? (
                                            <div className="flex h-64 flex-col items-center justify-center px-6 text-center text-sm text-gray-400">
                                                <TrendingUp size={28} className="mb-3 opacity-40" />
                                                لا يوجد سجل أسعار محفوظ لهذه العملة بعد.
                                                <span className="mt-2 text-xs text-gray-400">
                                                    سيظهر السجل بعد أول حفظ يدوي أو أول تحديث يومي.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="max-h-[420px] overflow-y-auto">
                                                {rateTimeline.map((entry) => (
                                                    <div
                                                        key={entry.id || `${entry.date}-${entry.rate}`}
                                                        className="grid grid-cols-[1.1fr_0.8fr_0.9fr] gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
                                                    >
                                                        <div>
                                                            <span className="block font-medium text-gray-800">
                                                                {formatShortDate(entry.date)}
                                                            </span>
                                                            <span className="block text-xs text-gray-400">
                                                                {formatDateTime(entry.recordedAt)}
                                                            </span>
                                                        </div>
                                                        <div className="text-center font-mono font-bold text-gray-900">
                                                            {Number(entry.rate || 0).toFixed(4)}
                                                        </div>
                                                        <div className="flex items-center justify-start gap-2">
                                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                                {getSourceLabel(entry.source)}
                                                            </span>
                                                            {entry.is_fixed === 1 && (
                                                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                                    ثابت
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 border-t bg-gray-50 p-6">
                                <button
                                    onClick={handleSave}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-bold text-white shadow transition hover:bg-emerald-700"
                                >
                                    <Save size={18} />
                                    حفظ التغييرات
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 transition hover:bg-gray-100"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CurrencyCard = ({
    currency,
    onEdit,
    onDelete,
    isBase,
    isFixed,
}: {
    currency: CurrencyRow;
    onEdit: () => void;
    onDelete: () => void;
    isBase: boolean;
    isFixed: boolean;
}) => {
    const lastUpdate = formatShortDate(currency.last_update);

    return (
        <div
            className={`
                rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md
                ${isBase ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}
            `}
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {isBase && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                            العملة الرئيسية
                        </span>
                    )}
                    {!isBase && isFixed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm">
                            <Lock size={12} />
                            سعر ثابت
                        </span>
                    )}
                </div>
                <span className="text-xs font-mono text-gray-400">Last Update: {lastUpdate}</span>
            </div>

            <div className="mb-6 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600 shadow-inner">
                    {currency.symbol || '$'}
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={onEdit}
                        className="rounded-full p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="تعديل"
                    >
                        <Edit size={16} />
                    </button>
                    {!isBase && (
                        <button
                            onClick={onDelete}
                            className="rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            title="حذف"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2">
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                    {currency.name_ar}
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-normal uppercase tracking-wider text-gray-400">
                        {currency.code}
                    </span>
                </h3>
                <p className="text-sm font-medium text-gray-400">{currency.name_en}</p>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-gray-100 pt-4">
                <div>
                    <span className="mb-1 block text-xs text-gray-400">سعر الصرف</span>
                    <span className="font-mono text-2xl font-bold tracking-tight text-gray-900">
                        {Number(currency.exchange_rate || 0).toFixed(4)}
                    </span>
                </div>
            </div>
        </div>
    );
};
