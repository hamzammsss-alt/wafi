import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { findItemByCode, searchItemsByInput } from '../../utils/itemLookup';

type LookupItem = {
    id: string;
    code?: string;
    barcode?: string;
    name_ar?: string;
    name?: string;
    name_en?: string;
    description?: string;
    type?: string;
    base_unit_name?: string;
    costing_method?: string;
    inventory_account_name?: string;
    sales_account_name?: string;
    cogs_account_name?: string;
};

const TYPE_LABEL: Record<string, string> = {
    Goods: 'بضاعة وخدمات',
    Service: 'خدمي',
    'Raw Material': 'مواد أولية',
    'Finished Good': 'منتج تام',
    Asset: 'موجودات ثابتة',
};

const COSTING_LABEL: Record<string, string> = {
    WEIGHTED_AVG: 'متوسط مرجح',
    FIFO: 'FIFO',
    STANDARD: 'معيارية',
};

interface ItemCodeInputProps {
    items: LookupItem[];
    value: string;
    onChange: (value: string) => void;
    onEnter?: () => void;
    onInputFocus?: () => void;
    onOpenPicker?: () => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    maxResults?: number;
    autoSelectUnique?: boolean;
    showOnEmpty?: boolean;
    emptyMessage?: string;
    inputId?: string;

    // NEW (Bisan-Pro)
    forceOpen?: boolean;
    onRequestClose?: () => void;
}

const toLatinDigits = (value: string): string =>
    value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const normalizeInput = (value: unknown): string => toLatinDigits(String(value ?? '')).trim().toLowerCase();

const getItemName = (item: LookupItem): string =>
    item.name_ar || item.name || item.name_en || '';

export const ItemCodeInput: React.FC<ItemCodeInputProps> = ({
    items,
    value,
    onChange,
    onEnter,
    onInputFocus,
    onOpenPicker,
    placeholder = 'Item code',
    disabled = false,
    className = '',
    maxResults = 12,
    autoSelectUnique = true,
    showOnEmpty = false,
    emptyMessage = 'No matching items',
    inputId,

    // NEW
    forceOpen,
    onRequestClose
}) => {
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [menuRect, setMenuRect] = useState({
        top: 0,
        left: 0,
        width: 0,
        maxHeight: 260
    });

    const suggestions = useMemo(() => {
        const normalizedValue = normalizeInput(value);
        const queryResults = normalizedValue
            ? searchItemsByInput(items, value, maxResults)
            : showOnEmpty
                ? [...items]
                    .sort((a, b) => {
                        const codeCmp = normalizeInput(a.code).localeCompare(normalizeInput(b.code));
                        if (codeCmp !== 0) return codeCmp;
                        return getItemName(a).localeCompare(getItemName(b), 'ar');
                    })
                    .slice(0, maxResults)
                : [];
        return queryResults.map((item) => ({
            item,
            code: String(item.code || ''),
            barcode: String(item.barcode || ''),
            name: getItemName(item)
        }));
    }, [items, value, maxResults, showOnEmpty]);

    const maybeApplyUnique = (): boolean => {
        if (!autoSelectUnique) return false;
        const resolved = findItemByCode(items, value);
        if (!resolved) return false;

        const canonicalCode = String(resolved.code || value || '');
        if (canonicalCode && normalizeInput(canonicalCode) !== normalizeInput(value)) {
            onChange(canonicalCode);
        }
        return true;
    };

    const selectSuggestion = (code: string) => {
        onChange(code);
        setOpen(false);
        setHighlighted(0);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            setHighlighted(0);
            onOpenPicker?.();
            return;
        }

        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            if (!open || suggestions.length === 0) return;
            e.preventDefault();
            e.stopPropagation();
            setHighlighted((prev) => (prev + 1) % suggestions.length);
            return;
        }

        if (e.key === 'ArrowUp') {
            if (!open || suggestions.length === 0) return;
            e.preventDefault();
            e.stopPropagation();
            setHighlighted((prev) => (prev - 1 + suggestions.length) % suggestions.length);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (open && suggestions.length > 0) {
                const selected = suggestions[highlighted] || suggestions[0];
                if (selected) {
                    selectSuggestion(selected.code);
                }
            } else {
                maybeApplyUnique();
            }
            setOpen(false);
            setHighlighted(0);
            onEnter?.();
            return;
        }

        if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
            onRequestClose?.();
        }
    };

    const shouldRenderDropdown = open && !disabled && (suggestions.length > 0 || showOnEmpty || normalizeInput(value).length > 0);

    // Bisan-Pro: external control via forceOpen
    useLayoutEffect(() => {
        if (disabled) return;
        if (forceOpen === undefined) return;

        if (forceOpen) {
            setOpen(true);
            setHighlighted(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setOpen(false);
            setHighlighted(0);
        }
    }, [forceOpen, disabled]);

    useLayoutEffect(() => {
        if (!shouldRenderDropdown) return;
        const updateRect = () => {
            if (!inputRef.current) return;
            const rect = inputRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const horizontalPadding = 8;
            const verticalPadding = 8;
            const preferredWidth = Math.max(rect.width, 360);
            const width = Math.min(preferredWidth, Math.max(220, viewportWidth - horizontalPadding * 2));
            const alignedRightLeft = rect.right - width;
            const left = Math.max(horizontalPadding, Math.min(alignedRightLeft, viewportWidth - width - horizontalPadding));
            const spaceBelow = viewportHeight - rect.bottom - verticalPadding;
            const spaceAbove = rect.top - verticalPadding;
            const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(120, Math.min(320, openUpward ? spaceAbove - 6 : spaceBelow - 6));
            const top = openUpward
                ? Math.max(verticalPadding, rect.top - maxHeight - 4)
                : Math.max(verticalPadding, Math.min(rect.bottom + 4, viewportHeight - verticalPadding - maxHeight));
            setMenuRect({
                top,
                left,
                width,
                maxHeight
            });
        };

        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [shouldRenderDropdown, value, suggestions.length]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                id={inputId}
                data-cell-id={inputId}
                type="text"
                value={value || ''}
                onChange={(e) => {
                    const nextValue = e.target.value;
                    onChange(nextValue);
                    if (autoSelectUnique) {
                        const matched = findItemByCode(items, nextValue);
                        if (matched) {
                            const canonicalCode = String(matched.code || nextValue);
                            if (canonicalCode && normalizeInput(canonicalCode) !== normalizeInput(nextValue)) {
                                onChange(canonicalCode);
                            }
                        }
                    }
                    setOpen(true);
                    setHighlighted(0);
                }}
                onFocus={() => {
                    setOpen(true);
                    setHighlighted(0);
                    onInputFocus?.();
                }}
                onMouseDown={() => {
                    if (disabled) return;
                    setOpen(true);
                    setHighlighted(0);
                    onInputFocus?.();
                }}
                onDoubleClick={() => {
                    if (disabled) return;
                    setOpen(false);
                    setHighlighted(0);
                    onOpenPicker?.();
                }}
                onBlur={() => setTimeout(() => {
                    setOpen(false);
                    onRequestClose?.();
                }, 120)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={className}
                placeholder={placeholder}
                autoComplete="off"
            />

            {shouldRenderDropdown &&
                ReactDOM.createPortal(
                    <div
                        style={{ position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width, maxHeight: menuRect.maxHeight }}
                        className="z-[13000] overflow-hidden rounded-[18px] border border-sky-100/80 bg-white/97 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.16)]"
                    >
                        {suggestions.length > 0 ? (
                            suggestions.map((s, index) => (
                                <button
                                    key={s.item.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectSuggestion(s.code);
                                    }}
                                    className={`w-full px-3 py-2 text-right flex items-center justify-between text-sm border-b border-slate-100 last:border-b-0 ${index === highlighted ? 'bg-sky-50 text-sky-700' : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{s.name || '-'}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                                {TYPE_LABEL[String(s.item.type || '')] || String(s.item.type || 'غير محدد')}
                                            </span>
                                            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700">
                                                وحدة: {s.item.base_unit_name || '-'}
                                            </span>
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                                تكلفة: {COSTING_LABEL[String(s.item.costing_method || '')] || String(s.item.costing_method || '-')}
                                            </span>
                                        </div>
                                        {(s.item.inventory_account_name || s.item.sales_account_name || s.item.cogs_account_name) && (
                                            <div className="mt-1 truncate text-[10px] text-slate-500">
                                                مخزون: {s.item.inventory_account_name || '-'} | إيراد: {s.item.sales_account_name || '-'} | تكلفة: {s.item.cogs_account_name || '-'}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-mono text-xs text-slate-500 mr-3 shrink-0">{s.barcode ? `${s.code} | ${s.barcode}` : s.code}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-right text-xs text-slate-500">{emptyMessage}</div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};
