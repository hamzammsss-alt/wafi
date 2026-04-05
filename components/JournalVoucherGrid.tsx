import React, { useState, useEffect, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    RowData,
} from '@tanstack/react-table';
import { Trash2, Search, PlusCircle } from 'lucide-react';
import { AccountPicker } from './AccountPicker'; // Assuming this exists from original file import
import Decimal from 'decimal.js';

// --- Types ---
declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
        updateData: (rowIndex: number, columnId: string, value: unknown) => void;
        removeRow: (rowIndex: number) => void;
        addNewRow: () => void;
        focusCell: (rowIndex: number, columnId: string) => void;
        onFinish?: () => void;
        showForeign?: boolean;
    }
}

export interface JournalLine {
    id?: string;
    accountId: string | null;
    accountCode?: string;
    accountName?: string;
    debitLocal: number;
    creditLocal: number;
    debitForeign: number;
    creditForeign: number;
    currency?: string;
    rate?: number;
    description: string;
    costCenter?: string;
    // Extra fields to satisfy Typescript if strictly passed, though we only use above in grid
    [key: string]: any;
}

interface JournalVoucherGridProps {
    data: JournalLine[];
    onUpdateRow: (rowIndex: number, columnId: string, value: any) => void;
    onRemoveRow: (rowIndex: number) => void;
    onAddRow: () => void;
    onFinish?: () => void;
    showForeignCurrency?: boolean;
}

// --- Cell Components ---
const EditableCell = ({
    getValue,
    row: { index },
    column: { id },
    table,
}: any) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
    const showForeign = table.options.meta?.showForeign;

    // Sync with external data updates
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const onBlur = () => {
        table.options.meta?.updateData(index, id, value);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Ctrl + Delete : Delete Row
        if (e.ctrlKey && e.key === 'Delete') {
            e.preventDefault();
            table.options.meta?.removeRow(index);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            // Handle '=' for balancing
            if ((id === 'debitLocal' || id === 'creditLocal') && e.currentTarget.value === '=') {
                // Balanced handled in parent updateData logic or internal wrapper
                // For now, we commit value '=' and let internal wrapper handle it
            }

            // Navigate Next
            moveFocus(e, index, id, table, 'next');
        } else if (e.key === 'Tab') {
            e.preventDefault();
            moveFocus(e, index, id, table, e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveFocus(e, index, id, table, 'up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveFocus(e, index, id, table, 'down');
        } else if (e.key === '+') {
            // Handle '+' : Copy logic
            if (['debitLocal', 'creditLocal', 'debitForeign', 'creditForeign'].includes(id)) {
                e.preventDefault();
                // Copy from previous row if exists
                if (index > 0) {
                    const prevRow = table.options.data[index - 1];
                    if (prevRow) {
                        const val = prevRow[id];
                        setValue(val);
                        table.options.meta?.updateData(index, id, val);
                    }
                }
            }
        }
    };

    const moveFocus = (e: any, rowIndex: number, colId: string, table: any, dir: 'next' | 'prev' | 'up' | 'down') => {
        // Define Column Order for Navigation
        let colOrder = ['accountId', 'debitLocal', 'creditLocal', 'description'];
        if (showForeign) {
            colOrder = ['accountId', 'debitForeign', 'creditForeign', 'debitLocal', 'creditLocal', 'description'];
        }

        const currentColIdx = colOrder.indexOf(colId);

        if (dir === 'next') {
            if (currentColIdx < colOrder.length - 1) {
                table.options.meta?.focusCell(rowIndex, colOrder[currentColIdx + 1]);
            } else {
                // End of Row -> Next Row or New Row
                table.options.meta?.focusCell(rowIndex + 1, colOrder[0]); // focusCell logic handles OOB by creating row
            }
        } else if (dir === 'prev') {
            if (currentColIdx > 0) {
                table.options.meta?.focusCell(rowIndex, colOrder[currentColIdx - 1]);
            } else {
                if (rowIndex > 0) {
                    table.options.meta?.focusCell(rowIndex - 1, colOrder[colOrder.length - 1]);
                }
            }
        } else if (dir === 'up') {
            if (rowIndex > 0) table.options.meta?.focusCell(rowIndex - 1, colId);
        } else if (dir === 'down') {
            table.options.meta?.focusCell(rowIndex + 1, colId);
        }
    };

    return (
        <input
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className="w-full h-full p-2 bg-transparent outline-none focus:bg-blue-50/50"
            placeholder={id === 'description' ? '---' : '0.00'}
            type={id === 'description' ? 'text' : 'text'}
            data-row-index={index}
            data-col-id={id}
            onFocus={(e) => e.target.select()}
        />
    );
};

// --- Main Grid Component ---
export const JournalVoucherGrid: React.FC<JournalVoucherGridProps> = ({ data, onUpdateRow, onRemoveRow, onAddRow, onFinish, showForeignCurrency = false }) => {
    const [isPickerOpen, setPickerOpen] = useState(false);
    const [pickerRowIndex, setPickerRowIndex] = useState<number | null>(null);
    const [pendingFocus, setPendingFocus] = useState<{ rowIndex: number, colId: string } | null>(null);

    // Focus Effect
    useEffect(() => {
        if (pendingFocus) {
            const { rowIndex, colId } = pendingFocus;
            if (rowIndex < data.length) {
                // Small timeout to ensure DOM is fully painted
                setTimeout(() => {
                    const el = document.querySelector(`[data-row-index="${rowIndex}"][data-col-id="${colId}"]`) as HTMLElement;
                    if (el) {
                        el.focus();
                        setPendingFocus(null);
                    }
                }, 0);
            }
        }
    }, [data, pendingFocus]);

    // Focus Helper
    const focusCell = useCallback((rowIndex: number, colId: string) => {
        // Check if we need to add a row
        if (rowIndex >= data.length) {
            onAddRow();
            setPendingFocus({ rowIndex, colId });
            return;
        }

        // Immediate focus if row exists
        const el = document.querySelector(`[data-row-index="${rowIndex}"][data-col-id="${colId}"]`) as HTMLElement;
        if (el) {
            el.focus();
        }
    }, [data.length, onAddRow]);

    const updateData = (rowIndex: number, columnId: string, value: unknown) => {
        // Handle Balancing logic '='
        if ((columnId === 'debitLocal' || columnId === 'creditLocal') && value === '=') {
            // Calculate balance from OTHER rows
            // We need access to data here. 'data' prop is available.
            if (columnId === 'debitLocal') {
                const otherDebits = data.reduce((sum, r, i) => i === rowIndex ? sum : sum.plus(new Decimal(r.debitLocal || 0)), new Decimal(0));
                const totalCredits = data.reduce((sum, r) => sum.plus(new Decimal(r.creditLocal || 0)), new Decimal(0));
                const needed = totalCredits.minus(otherDebits);
                onUpdateRow(rowIndex, columnId, needed.greaterThan(0) ? needed.toNumber() : 0);
            } else {
                const totalDebits = data.reduce((sum, r) => sum.plus(new Decimal(r.debitLocal || 0)), new Decimal(0));
                const otherCredits = data.reduce((sum, r, i) => i === rowIndex ? sum : sum.plus(new Decimal(r.creditLocal || 0)), new Decimal(0));
                const needed = totalDebits.minus(otherCredits);
                onUpdateRow(rowIndex, columnId, needed.greaterThan(0) ? needed.toNumber() : 0);
            }
            return;
        }

        onUpdateRow(rowIndex, columnId, value);
    };

    // Custom Account Cell
    const AccountCell = ({ row, getValue, table }: any) => {
        const { index } = row;
        const accountId = getValue(); // this is accessorKey 'accountId'
        const accountDisplay = row.original.accountName || '---';

        const handleKeyDown = (e: React.KeyboardEvent) => {
            // Ctrl + Delete : Delete Row
            if (e.ctrlKey && e.key === 'Delete') {
                e.preventDefault();
                table.options.meta?.removeRow(index);
                return;
            }

            if (e.key === 'F3' || e.key === 'ArrowDown') {
                e.preventDefault();
                setPickerRowIndex(index);
                setPickerOpen(true);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                // Check if accountId is truly empty (allow 0 or '0')
                if (!accountId && accountId !== 0 && accountId !== '0') {
                    // Start of done logic
                    const isLastRow = index === table.options.data.length - 1;
                    const hasPrevRows = index > 0;
                    if (isLastRow && hasPrevRows) {
                        table.options.meta?.onFinish?.();
                        return;
                    }
                    setPickerRowIndex(index);
                    setPickerOpen(true);
                } else {
                    // Jump to correct Debit based on Foreign Flag
                    const firstDebit = table.options.meta?.showForeign ? 'debitForeign' : 'debitLocal';
                    focusCell(index, firstDebit);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const firstDebit = table.options.meta?.showForeign ? 'debitForeign' : 'debitLocal';
                focusCell(index, e.shiftKey ? 'accountId' : firstDebit);
            }
        };

        return (
            <div
                className="flex items-center gap-2 p-2 w-full h-full cursor-pointer hover:bg-gray-50 outline-none focus:ring-2 ring-inset ring-blue-500 rounded-md"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={() => { setPickerRowIndex(index); setPickerOpen(true); }}
                data-row-index={index}
                data-col-id="accountId"
            >
                <Search size={14} className="text-gray-400 shrink-0" />
                <div className="flex flex-col overflow-hidden">
                    {accountId ? (
                        <>
                            <span className="text-xs font-bold truncate">{accountDisplay}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{row.original.accountCode || ''}</span>
                        </>
                    ) : (
                        <span className="text-sm text-gray-400">اختر الحساب... (F3)</span>
                    )}
                </div>
            </div>
        );
    };

    const columns = [
        {
            accessorKey: '#',
            header: '#',
            cell: (info: any) => <span className="text-gray-400 text-xs">{info.row.index + 1}</span>,
            size: 40,
        },
        {
            accessorKey: 'accountId',
            header: 'رقم الحساب',
            cell: AccountCell,
            size: 250,
        },
        ...(showForeignCurrency ? [
            {
                accessorKey: 'debitForeign',
                header: 'مدين (أجنبي)',
                cell: EditableCell,
                size: 100,
            },
            {
                accessorKey: 'creditForeign',
                header: 'دائن (أجنبي)',
                cell: EditableCell,
                size: 100,
            }
        ] : []),
        {
            accessorKey: 'debitLocal',
            header: 'مدين',
            cell: EditableCell,
            size: 120,
        },
        {
            accessorKey: 'creditLocal',
            header: 'دائن',
            cell: EditableCell,
            size: 120,
        },
        {
            accessorKey: 'description',
            header: 'البيان',
            cell: EditableCell,
        },
        {
            id: 'actions',
            header: '',
            cell: (info: any) => (
                <button onClick={() => onRemoveRow(info.row.index)} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={16} />
                </button>
            ),
            size: 40,
        }
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            updateData,
            removeRow: onRemoveRow,
            addNewRow: onAddRow,
            focusCell,
            onFinish,
            showForeign: showForeignCurrency
        },
    });

    const handleAccountSelect = (account: any) => {
        if (pickerRowIndex !== null) {
            // Call onUpdateRow multiple times? Or assume parent handles bulk?
            // Since we defined onUpdateRow as single field, we might need a bulk update prop?
            // Or we just call it 3 times.
            onUpdateRow(pickerRowIndex, 'accountCode', account.account_code); // Parent logic likely updates ID and Name based on Code?
            // Actually, existing logic in JournalVoucher uses 'accountCode' to drive everything.
            // So we update 'accountCode'.
            // But we also need to be sure.
            // Let's passed keys that trigger updates.

            setPickerOpen(false);
            const firstDebit = showForeignCurrency ? 'debitForeign' : 'debitLocal';
            setTimeout(() => focusCell(pickerRowIndex, firstDebit), 50);
            setPickerRowIndex(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <AccountPicker
                isOpen={isPickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleAccountSelect}
            />

            <div className="overflow-auto flex-1">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-bold sticky top-0 z-10 border-b border-gray-200">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="p-3 whitespace-nowrap" style={{ width: header.getSize() }}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-blue-50/20 group">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="p-0 h-10 relative border-r border-transparent hover:border-gray-100">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={onAddRow}
                className="p-3 border-t border-gray-100 text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition flex items-center justify-center gap-2"
            >
                <PlusCircle size={16} />
                إضافة سطر جديد (Enter في آخر خلية)
            </button>
        </div>
    );
};
