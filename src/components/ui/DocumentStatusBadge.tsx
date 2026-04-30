import React from 'react';
import { DocumentStatus } from '../../types/approval';
import { getDocumentStatusConfig } from '../../constants/documentStatus';

interface BadgeProps {
    status: DocumentStatus | string;
    className?: string;
}

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

export const DocumentStatusBadge: React.FC<BadgeProps> = ({ status, className = '' }) => {
    const config = getDocumentStatusConfig(status);

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.colorClass} ${className}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
            {tr(config.labelI18nKey, config.label)}
        </span>
    );
};
