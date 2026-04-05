import React from 'react';
import { ArrowUpDown, Search, Download } from 'lucide-react';

export interface Column {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => React.ReactNode;
}

export interface TableWidgetProps {
    id: string;
    title: string;
    columns: Column[];
    data: any[];
    onRowClick?: (row: any) => void;
    searchable?: boolean;
    sortable?: boolean;
    maxHeight?: number | string;
    loading?: boolean;
    emptyMessage?: string;
}

export const TableWidget: React.FC<TableWidgetProps> = ({
    id,
    title,
    columns,
    data,
    onRowClick,
    searchable = false,
    sortable = false,
    maxHeight = 400,
    loading = false,
    emptyMessage = 'لا توجد بيانات'
}) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const filteredData = React.useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(row =>
            Object.values(row).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [data, searchTerm]);

    const sortedData = React.useMemo(() => {
        if (!sortConfig) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    const handleSort = (key: string) => {
        if (!sortable) return;

        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null;
            }
            return { key, direction: 'asc' };
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4 animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                {searchable && (
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-auto custom-scrollbar" style={{ maxHeight }}>
                <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr>
                            {columns.map(column => (
                                <th
                                    key={column.key}
                                    className={`px-4 py-3 text-${column.align || 'right'} text-xs font-bold text-slate-600 uppercase tracking-wider ${sortable ? 'cursor-pointer hover:bg-slate-100' : ''
                                        }`}
                                    style={{ width: column.width }}
                                    onClick={() => handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-2 justify-end">
                                        {column.label}
                                        {sortable && (
                                            <ArrowUpDown size={14} className="text-slate-400" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 text-sm">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                                        }`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map(column => (
                                        <td
                                            key={column.key}
                                            className={`px-4 py-3 text-${column.align || 'right'} text-sm text-slate-700`}
                                        >
                                            {column.render
                                                ? column.render(row[column.key], row)
                                                : row[column.key]
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {sortedData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>عرض {sortedData.length} من {data.length} سجل</span>
                </div>
            )}
        </div>
    );
};
