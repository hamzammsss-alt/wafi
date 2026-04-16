import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export const Card = ({ children, className = '', ...props }: CardProps) => (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 shadow-sm ${className}`} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
    <div className={`border-b border-slate-100 px-6 py-4 ${className}`} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = '', ...props }: CardProps) => (
    <h3 className={`text-lg font-extrabold text-slate-800 ${className}`} {...props}>
        {children}
    </h3>
);

export const CardContent = ({ children, className = '', ...props }: CardProps) => (
    <div className={`p-6 ${className}`} {...props}>
        {children}
    </div>
);
