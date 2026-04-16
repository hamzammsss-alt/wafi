import React from 'react';

interface WorkspaceSectionCardProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
}

export function WorkspaceSectionCard({
    title,
    description,
    icon,
    actions,
    children,
    className = '',
    bodyClassName = '',
}: WorkspaceSectionCardProps) {
    return (
        <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm ${className}`}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-slate-800">
                        {icon && <span className="text-sky-600">{icon}</span>}
                        <h2 className="truncate text-sm font-extrabold tracking-wide">{title}</h2>
                    </div>
                    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            <div className={`p-5 ${bodyClassName}`}>{children}</div>
        </section>
    );
}
