import React from 'react';
import { Sparkles, Calendar, Layout, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types ---
export interface BentoBoxProps {
    className?: string;
    children: React.ReactNode;
    title?: string;
    action?: React.ReactNode;
    transparent?: boolean;
    onClick?: () => void;
}

export interface BentoActionProps {
    label: string;
    icon: any;
    color?: string;
    onClick?: () => void;
    className?: string;
    subtitle?: string; // e.g. path or description
}

export interface BentoHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumb?: string;
    user?: any; // Context if needed, or simple props
    activeTab?: string;
}

// --- Components ---

// 1. Bento Box Container
export const BentoBox: React.FC<BentoBoxProps> = ({ className = '', children, title, action, transparent = false, onClick }) => (
    <motion.div
        whileHover={onClick ? { y: -4, transition: { duration: 0.2 } } : undefined}
        onClick={onClick}
        className={`
        ${transparent ? '' : 'bg-white shadow-sm hover:shadow-md border border-slate-200/60 transition-shadow'}
        rounded-3xl p-6 flex flex-col transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
    `}>
        {title && (
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {/* Optional Accent */}
                    <span className="w-1.5 h-5 bg-indigo-600 rounded-full inline-block"></span>
                    {title}
                </h3>
                {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
            </div>
        )}
        {children}
    </motion.div>
);

// --- Minimalist SaaS Components (Iteration 5) ---

// 2. Minimal Card (SaaS Style)
export const BentoAction: React.FC<BentoActionProps> = ({ label, icon: Icon, color = 'indigo', onClick, className = '', subtitle }) => {
    // Elegant accent colors (Stroke only)
    const colorStyles: any = {
        indigo: 'group-hover:border-l-indigo-500',
        emerald: 'group-hover:border-l-emerald-500',
        rose: 'group-hover:border-l-rose-500',
        blue: 'group-hover:border-l-blue-500',
        amber: 'group-hover:border-l-amber-500',
        purple: 'group-hover:border-l-purple-500',
        slate: 'group-hover:border-l-slate-500',
    };

    const activeAccent = colorStyles[color] || colorStyles.indigo;

    return (
        <button
            onClick={onClick}
            className={`
            group relative flex flex-col justify-center items-start p-6
            bg-white border border-slate-200 rounded-lg
            hover:shadow-md hover:border-slate-300 hover:border-l-4 ${activeAccent}
            transition-all duration-200 w-full min-h-[120px]
            ${className}
        `}
        >
            <div className="flex items-center gap-4 w-full">
                {/* Icon: Simple, clean, slate-500 by default, colored on hover */}
                <div className="text-slate-400 group-hover:text-slate-700 transition-colors">
                    {Icon ? <Icon size={24} strokeWidth={1.5} /> : <Settings size={24} />}
                </div>

                {/* Text: Bold, Dark, Simple */}
                <div className="text-right">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-black transition-colors">
                        {label}
                    </h3>

                    {/* HIDDEN SUBTITLE to comply with "No English Paths" request */}
                    {/* 
                    {subtitle && !subtitle.startsWith('/') && (
                        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                    )} 
                    */}
                </div>
            </div>

            {/* Subtle Chevron for affordance */}
            <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </div>
        </button>
    );
};

// ... BentoHeader Cleaned Up ...
export const BentoHeader: React.FC<BentoHeaderProps> = ({ title, subtitle, breadcrumb, activeTab }) => {
    return (
        <div className="flex flex-col gap-2 mb-10 border-b border-slate-200 pb-6">
            {/* Breadcrumb: Plain Text */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                {breadcrumb && <span>{breadcrumb}</span>}
                <span>/</span>
                <span className="text-slate-800">{title}</span>
            </div>

            {/* Title: Clean Sans Serif */}
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {title}
            </h1>

            {/* Description: Grey text */}
            {subtitle && (
                <p className="text-base text-slate-500 max-w-3xl">
                    {subtitle}
                </p>
            )}
        </div>
    );
};

// 4. Minimal Grid (Standard)
export const BentoGrid: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
        {children}
    </div>
);

// Helper for Section Titles (Minimal)
export const GlassSectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 mt-8 px-1">
        {title}
    </h2>
);

// 4. Bento List Group (Container)
export const BentoListGroup: React.FC<{ children: React.ReactNode, title?: string, className?: string }> = ({ children, title, className = '' }) => (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-8 ${className}`}>
        {title && (
            <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
            </div>
        )}
        <div className="divide-y divide-slate-100">
            {children}
        </div>
    </div>
);
