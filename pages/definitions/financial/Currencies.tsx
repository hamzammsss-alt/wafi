import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Coins,
    Edit,
    Lock,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    TrendingUp,
    X,
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';
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
    if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
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

const getCurrencyState = (currency: Partial<CurrencyRow> | null | undefined) => {
    if (isBaseCurrency(currency)) return 'base';
    if (isFixedCurrency(currency)) return 'fixed';
    return 'floating';
};

const getCurrencyStateLabel = (currency: Partial<CurrencyRow> | null | undefined) => {
    const state = getCurrencyState(currency);
    if (state === 'base') return 'العملة الرئيسية';
    if (state === 'fixed') return 'سعر ثابت';
    return 'متغيرة';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'base' | 'fixed' | 'floating'>('all');

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
                if (!cancelled) setRateTimeline([]);
            } finally {
                if (!cancelled) setHistoryLoading(false);
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

    const handleDeleteRows = async (rows: CurrencyRow[]) => {
        const deletableRows = rows.filter((row) => !isBaseCurrency(row));
        if (deletableRows.length === 0) {
            alert('لا يمكن حذف العملة الرئيسية.');
            return;
        }

        const message = deletableRows.length === 1
            ? 'هل أنت متأكد من حذف هذه العملة؟'
            : `هل أنت متأكد من حذف ${deletableRows.length} عملات؟`;
        if (!confirm(message)) return;

        try {
            for (const row of deletableRows) {
                await api.deleteCurrency(row.id);
            }
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
                alert('تعذر تحديث أسعار الصرف.');
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
        const query = searchQuery.trim().toLowerCase();

        return [...currencies]
            .filter((currency) => {
                const matchesSearch =
                    !query ||
                    String(currency.code || '').toLowerCase().includes(query) ||
                    String(currency.symbol || '').toLowerCase().includes(query) ||
                    String(currency.name_ar || '').toLowerCase().includes(query) ||
                    String(currency.name_en || '').toLowerCase().includes(query);

                if (!matchesSearch) return false;

                if (statusFilter === 'base') return isBaseCurrency(currency);
                if (statusFilter === 'fixed') return !isBaseCurrency(currency) && isFixedCurrency(currency);
                if (statusFilter === 'floating') return !isBaseCurrency(currency) && !isFixedCurrency(currency);

                return true;
            })
            .sort((left, right) => {
                const leftBase = isBaseCurrency(left) ? 1 : 0;
                const rightBase = isBaseCurrency(right) ? 1 : 0;
                if (leftBase !== rightBase) return rightBase - leftBase;

                const leftFixed = isFixedCurrency(left) ? 1 : 0;
                const rightFixed = isFixedCurrency(right) ? 1 : 0;
                if (leftFixed !== rightFixed) return rightFixed - leftFixed;

                return left.code.localeCompare(right.code);
            });
    }, [currencies, searchQuery, statusFilter]);

    const columns = useMemo<DefinitionListColumn<CurrencyRow>[]>(() => [
        {
            key: 'name_ar',
            label: 'العملة',
            width: 260,
            defaultVisible: true,
            getSearchValue: (currency) => `${currency.name_ar || ''} ${currency.name_en || ''} ${currency.code || ''} ${currency.symbol || ''}`,
            renderCell: (currency) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-600">
                        {currency.symbol || '$'}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{currency.name_ar || '-'}</div>
                        <div className="truncate text-xs text-slate-400">{currency.name_en || '-'}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'الكود',
            width: 120,
            defaultVisible: true,
            getDisplayValue: (currency) => currency.code || '-',
            renderCell: (currency) => (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                    {currency.code || '-'}
                </span>
            ),
        },
        {
            key: 'symbol',
            label: 'الرمز',
            width: 100,
            defaultVisible: true,
            getDisplayValue: (currency) => currency.symbol || '-',
        },
        {
            key: 'exchange_rate',
            label: 'سعر الصرف',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            getValue: (currency) => Number(currency.exchange_rate || 0),
            getDisplayValue: (currency) => Number(currency.exchange_rate || 0).toFixed(4),
            renderCell: (currency) => (
                <span className="font-mono font-bold text-slate-900">
                    {Number(currency.exchange_rate || 0).toFixed(4)}
                </span>
            ),
        },
        {
            key: 'currency_state',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 180,
            defaultVisible: true,
            options: [
                { value: 'base', label: 'العملة الرئيسية' },
                { value: 'fixed', label: 'سعر ثابت' },
                { value: 'floating', label: 'متغيرة' },
            ],
            getValue: (currency) => getCurrencyState(currency),
            getDisplayValue: (currency) => getCurrencyStateLabel(currency),
            renderCell: (currency) => {
                if (isBaseCurrency(currency)) {
                    return (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            العملة الرئيسية
                        </span>
                    );
                }

                if (isFixedCurrency(currency)) {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                            <Lock size={12} />
                            سعر ثابت
                        </span>
                    );
                }

                return (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        متغيرة
                    </span>
                );
            },
        },
        {
            key: 'last_update',
            label: 'آخر تحديث',
            type: 'date',
            filterType: 'date',
            width: 130,
            defaultVisible: true,
            getDisplayValue: (currency) => formatShortDate(currency.last_update),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 120,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (currency) => (
                <div className="flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleEdit(currency)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title="تعديل"
                    >
                        <Edit size={18} />
                    </button>
                    {!isBaseCurrency(currency) && (
                        <button
                            type="button"
                            onClick={() => handleDelete(currency.id)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="حذف"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            ),
        },
    ], []);

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
                            {scraping ? 'جارٍ التحديث...' : 'تحديث أسعار الصرف'}
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

            <DefinitionMasterList
                screenKey="definitions.currencies"
                data={currencies}
                loading={loading}
                columns={columns}
                rowKey={(currency) => String(currency.id || currency.code)}
                searchPlaceholder="بحث باسم العملة أو الكود أو الرمز"
                emptyMessage="لا توجد عملات مطابقة للمعايير الحالية"
                createLabel="إضافة عملة"
                onCreate={openModal}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={fetchCurrencies}
                defaultSort={{ key: 'code', direction: 'asc' }}
                toolbarExtraActions={(
                    <button
                        type="button"
                        onClick={handleScrape}
                        disabled={scraping}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={16} className={scraping ? 'animate-spin' : ''} />
                        <span>{scraping ? 'جارٍ التحديث...' : 'تحديث أسعار الصرف'}</span>
                    </button>
                )}
            />

            {false && (
            <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px] flex-1">
                    <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="بحث باسم العملة أو الكود أو الرمز"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    className="h-11 min-w-[190px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                    <option value="all">كل العملات</option>
                    <option value="base">العملة الرئيسية</option>
                    <option value="fixed">الأسعار الثابتة</option>
                    <option value="floating">الأسعار المتغيرة</option>
                </select>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center text-gray-400">
                    <RefreshCw className="ml-2 animate-spin" />
                    جارٍ تحميل البيانات...
                </div>
            ) : (
                <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-gradient-to-l from-sky-50 to-blue-50 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">قائمة العملات</h2>
                        <p className="text-sm text-slate-600">
                            إجمالي العملات المعروضة: <span className="font-semibold">{displayCurrencies.length}</span>
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700">
                            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                                <tr>
                                    <th className="w-[70px] border-b border-l border-slate-200 bg-slate-50 p-3 text-center">الرقم</th>
                                    <th className="min-w-[240px] border-b border-l border-slate-200 bg-slate-50 p-3">العملة</th>
                                    <th className="min-w-[110px] border-b border-l border-slate-200 bg-slate-50 p-3">الكود</th>
                                    <th className="min-w-[100px] border-b border-l border-slate-200 bg-slate-50 p-3">الرمز</th>
                                    <th className="min-w-[140px] border-b border-l border-slate-200 bg-slate-50 p-3">سعر الصرف</th>
                                    <th className="min-w-[170px] border-b border-l border-slate-200 bg-slate-50 p-3">الحالة</th>
                                    <th className="min-w-[130px] border-b border-l border-slate-200 bg-slate-50 p-3">آخر تحديث</th>
                                    <th className="w-[120px] border-b border-slate-200 bg-slate-50 p-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayCurrencies.map((currency, index) => {
                                    const isBase = isBaseCurrency(currency);
                                    const isFixed = isFixedCurrency(currency);

                                    return (
                                        <tr key={currency.id || currency.code} className="group">
                                            <td className="border-b border-l border-slate-200 bg-white p-3 text-center font-mono font-bold text-slate-500 transition group-hover:bg-sky-50/40">
                                                {String(index + 1).padStart(2, '0')}
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-600">
                                                        {currency.symbol || '$'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-bold text-slate-800">{currency.name_ar}</div>
                                                        <div className="truncate text-xs text-slate-400">{currency.name_en || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                                                    {currency.code}
                                                </span>
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 font-semibold text-slate-600 transition group-hover:bg-sky-50/40">
                                                {currency.symbol || '-'}
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 font-mono font-bold text-slate-900 transition group-hover:bg-sky-50/40">
                                                {Number(currency.exchange_rate || 0).toFixed(4)}
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <div className="flex flex-wrap gap-2">
                                                    {isBase && (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                                            العملة الرئيسية
                                                        </span>
                                                    )}
                                                    {!isBase && isFixed && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                                                            <Lock size={12} />
                                                            سعر ثابت
                                                        </span>
                                                    )}
                                                    {!isBase && !isFixed && (
                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                            متغيرة
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 text-sm text-slate-500 transition group-hover:bg-sky-50/40">
                                                {formatShortDate(currency.last_update)}
                                            </td>
                                            <td className="border-b border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <div className="flex justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handleEdit(currency)}
                                                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                                        title="تعديل"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    {!isBase && (
                                                        <button
                                                            onClick={() => handleDelete(currency.id)}
                                                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                            title="حذف"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {displayCurrencies.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="border-b border-slate-200 bg-white py-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Search size={28} className="text-slate-300" />
                                                <p>لا توجد عملات مطابقة للفلاتر الحالية.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                <tr>
                                    <td colSpan={8} className="bg-white p-0">
                                        <button
                                            onClick={openModal}
                                            className="flex w-full items-center justify-center gap-2 border-t border-dashed border-slate-300 px-6 py-5 text-sm font-medium text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                                        >
                                            <Plus size={18} />
                                            إضافة عملة جديدة
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            </>
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
                                                <label className="mb-1 block text-sm font-medium text-gray-700">اختر عملة جاهزة اختياريًا</label>
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
                                                    className="w-full rounded-lg border border-gray-300 p-3 uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    value={currentCurrency.code}
                                                    onChange={(event) => setCurrentCurrency({ ...currentCurrency, code: normalizeCurrencyCode(event.target.value) })}
                                                    placeholder="USD"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">رمز مختصر</label>
                                                <input
                                                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    value={currentCurrency.symbol}
                                                    onChange={(event) => setCurrentCurrency({ ...currentCurrency, symbol: event.target.value })}
                                                    placeholder="$"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">اسم العملة بالعربية</label>
                                                <input
                                                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    value={currentCurrency.name_ar}
                                                    onChange={(event) => setCurrentCurrency({ ...currentCurrency, name_ar: event.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">اسم العملة بالإنجليزية</label>
                                                <input
                                                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                    dir="ltr"
                                                    value={currentCurrency.name_en}
                                                    onChange={(event) => setCurrentCurrency({ ...currentCurrency, name_en: event.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                                            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-700">
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
                                                <span className="block text-sm text-gray-500">استخدم هذه العملة كمرجع للنظام ولجميع العملات الأخرى.</span>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                                                isBaseCurrency(currentCurrency) ? 'cursor-not-allowed bg-gray-50 opacity-75' : 'cursor-pointer hover:bg-gray-50'
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
                                                    عند التفعيل لن تتغير هذه العملة أثناء التحديث اليومي.
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
                                                      : 'متغيرة'}
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
                                            </div>
                                        ) : (
                                            <div className="max-h-[420px] overflow-y-auto">
                                                {rateTimeline.map((entry) => (
                                                    <div
                                                        key={entry.id || `${entry.date}-${entry.rate}`}
                                                        className="grid grid-cols-[1.1fr_0.8fr_0.9fr] gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
                                                    >
                                                        <div>
                                                            <span className="block font-medium text-gray-800">{formatShortDate(entry.date)}</span>
                                                            <span className="block text-xs text-gray-400">{formatDateTime(entry.recordedAt)}</span>
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
