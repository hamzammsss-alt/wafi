import React from 'react';

type WorkspaceBadge = {
    label: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning';
    mono?: boolean;
};

interface WorkspaceHeaderProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    badges?: WorkspaceBadge[];
    actions?: React.ReactNode;
    sticky?: boolean;
    className?: string;
}

const badgeToneClasses: Record<NonNullable<WorkspaceBadge['tone']>, string> = {
    neutral: 'border-slate-200 bg-white/80 text-slate-600',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
};

export function WorkspaceHeader({
    icon,
    title,
    subtitle,
    badges = [],
    actions,
    sticky = false,
    className = '',
}: WorkspaceHeaderProps) {
    return (
        <div className={`${sticky ? 'sticky top-0 z-20' : ''} ${className}`}>
            <div className="app-elevated overflow-hidden p-4 md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-lg shadow-cyan-900/20">
                                {icon}
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
                                {subtitle && <p className="mt-1 text-sm text-slate-500 md:text-base">{subtitle}</p>}
                                {badges.length > 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {badges.map((badge, index) => (
                                            <span
                                                key={`${badge.label}-${index}`}
                                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${badgeToneClasses[badge.tone || 'neutral']} ${badge.mono ? 'font-mono' : ''}`}
                                            >
                                                {badge.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {actions && (
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
