export const exportToCSV = (data: any[], fileName: string, headers?: string[]) => {
    if (!data || !data.length) return;

    const csvContent = [
        headers ? headers.join(',') : Object.keys(data[0]).join(','), // Header row
        ...data.map(row => Object.values(row).map(value => `"${value}"`).join(',')) // Data rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
