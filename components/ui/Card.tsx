import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export const Card = ({ children, className = '', ...props }: CardProps) => (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
    <div className={`px-6 py-4 border-b border-gray-100 ${className}`} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = '', ...props }: CardProps) => (
    <h3 className={`text-lg font-semibold text-gray-800 ${className}`} {...props}>
        {children}
    </h3>
);

export const CardContent = ({ children, className = '', ...props }: CardProps) => (
    <div className={`p-6 ${className}`} {...props}>
        {children}
    </div>
);
