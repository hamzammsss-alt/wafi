import React from 'react';
import { tAccountingModule as t } from './accounting.i18n';
import { FlattenedAccountRow } from './accounting.types';

interface AccountTreeGridProps {
    rows: FlattenedAccountRow[];
    selectedId: string;
    onSelect: (accountId: string) => void;
    onToggleExpand: (accountId: string) => void;
    onGridKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function AccountTreeGrid(props: AccountTreeGridProps) {
    const { rows, selectedId, onSelect, onToggleExpand, onGridKeyDown } = props;

    return (
        <div
            className="border rounded overflow-auto max-h-[620px] focus:outline-none focus:ring-2 focus:ring-sky-300"
            tabIndex={0}
            onKeyDown={onGridKeyDown}
        >
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr>
                        <th className="text-left p-2">{t('coa.grid.code')}</th>
                        <th className="text-left p-2">{t('coa.grid.name')}</th>
                        <th className="text-left p-2">{t('coa.grid.kind')}</th>
                        <th className="text-left p-2">{t('coa.grid.category')}</th>
                        <th className="text-left p-2">{t('coa.grid.status')}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const isSelected = row.node.id === selectedId;
                        const isInactive = row.node.status !== 'ACTIVE';
                        return (
                            <tr
                                key={row.node.id}
                                onClick={() => onSelect(row.node.id)}
                                className={[
                                    'cursor-pointer border-b',
                                    isSelected ? 'bg-sky-100' : '',
                                    isInactive ? 'opacity-60' : '',
                                ].join(' ')}
                            >
                                <td className="p-2 font-mono whitespace-nowrap">{row.node.accountCode}</td>
                                <td className="p-2">
                                    <div className="flex items-center gap-2">
                                        <span style={{ paddingLeft: `${row.depth * 16}px` }} />
                                        {row.hasChildren ? (
                                            <button
                                                type="button"
                                                className="w-5 h-5 border rounded text-xs bg-white"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onToggleExpand(row.node.id);
                                                }}
                                                aria-label={row.isExpanded ? '-' : '+'}
                                            >
                                                {row.isExpanded ? '-' : '+'}
                                            </button>
                                        ) : (
                                            <span className="inline-block w-5" />
                                        )}
                                        <span>{row.node.name}</span>
                                    </div>
                                </td>
                                <td className="p-2">
                                    {row.node.postingAllowed ? t('coa.kind.posting') : t('coa.kind.header')}
                                </td>
                                <td className="p-2">{t(`accounting.foundation.enum.${row.node.accountCategory}`)}</td>
                                <td className="p-2">
                                    {row.node.status === 'ACTIVE' ? t('coa.status.active') : t('coa.status.inactive')}
                                </td>
                            </tr>
                        );
                    })}
                    {!rows.length ? (
                        <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-500">
                                {t('coa.grid.empty')}
                            </td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
    );
}
