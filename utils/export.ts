type CSVRow = Record<string, unknown>;

const escapeCSVValue = (value: unknown): string => {
    if (value === null || value === undefined) return '""';

    const normalizedValue = value instanceof Date ? value.toISOString() : String(value);
    return `"${normalizedValue.replace(/"/g, '""')}"`;
};

export const exportToCSV = (data: CSVRow[], fileName: string, headers?: string[]): void => {
    if (!Array.isArray(data) || data.length === 0) return;

    const columns = headers && headers.length > 0 ? headers : Object.keys(data[0]);
    const rows = data.map((row) => columns.map((column) => escapeCSVValue(row[column])).join(','));
    const csvContent = `\uFEFF${[columns.map(escapeCSVValue).join(','), ...rows].join('\n')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const file = fileName.toLowerCase().endsWith('.csv') ? fileName : `${fileName}.csv`;

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        try {
            link.setAttribute('href', url);
            link.setAttribute('download', file);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
        } finally {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
};
