import React from 'react';
import { useParams, useLocation, matchPath } from 'react-router-dom';
import { useTabs } from '../src/contexts/TabsContext';
import { TOP_MENU_ITEMS } from '../config/menuData';
import { getTitle } from '../config/categorySlugs';
import { ExternalLink, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { BentoHeader, BentoGrid, GlassSectionTitle } from '../components/ui/Bento';

const CREATE_PATHS: Record<string, string> = {
    '/master/currencies': '/master/currencies?new=1',
    '/master/expense-types': '/master/expense-types?new=1',
    '/master/cost-centers': '/master/cost-centers/new',
    '/master/taxes': '/master/taxes?new=1',
    '/master/payment-methods': '/master/payment-methods?new=1',
    '/master/banks': '/master/banks?new=1',
    '/master/units': '/master/units?new=1',
    '/master/item-categories': '/master/item-categories?new=1',
    '/master/brands': '/master/brands?new=1',
    '/items': '/items/new',
    '/items/services': '/items/services/new',
    '/master/warehouses': '/master/warehouses?new=1',
    '/master/salesmen': '/master/salesmen?new=1',
    '/master/regions': '/master/regions?new=1',
    '/master/customer-types': '/master/customer-types?new=1',
    '/master/customer-class': '/master/customer-class?new=1',
    '/master/vendor-types': '/master/vendor-types?new=1',
    '/master/vendor-class': '/master/vendor-class?new=1',
    '/master/memberships': '/master/memberships?new=1',
    '/master/sectors': '/master/sectors?new=1',
    '/master/credit-policies': '/master/credit-policies?new=1',
    '/master/price-lists': '/master/price-lists?new=1',
    '/master/partners': '/master/partners?new=1',
    '/master/customer-card': '/master/customer-card?new=1',
    '/master/supplier-card': '/master/supplier-card?new=1',
    '/master/asset-categories': '/master/asset-categories?new=1',
    '/master/vehicles': '/master/vehicles?new=1',
    '/master/drivers': '/master/drivers?new=1',
    '/definitions/analysis-codes': '/definitions/analysis-codes?new=1',
    '/banking/our-accounts': '/banking/our-accounts?new=1',
    '/banking/branches': '/banking/branches?new=1',
    '/treasury/receipt': '/treasury/receipt/new',
    '/treasury/payment': '/treasury/payment/new',
    '/gl/journal-voucher': '/gl/journal-vouchers/new',
    '/gl/journal-vouchers': '/gl/journal-vouchers/new',
    '/banking/deposit': '/banking/deposit',
    '/import/invoice': '/import/invoice/new',
    '/import/shipments': '/import/shipments/new',
    '/import/proformas': '/import/proformas/new',
};

export const CategoryHub = () => {
    const params = useParams();
    const location = useLocation();
    const { openTab } = useTabs();

    const match = matchPath('/hub/:categorySlug', location.pathname);
    const categorySlug = params.categorySlug || match?.params.categorySlug || '';
    const categoryTitle = getTitle(categorySlug);
    const items = TOP_MENU_ITEMS[categoryTitle] || [];

    if (!categoryTitle) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Sparkles size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-medium">القسم غير موجود</h2>
            </div>
        );
    }

    const handleItemClick = (item: any) => {
        if (item.path) {
            openTab({
                id: item.path,
                path: item.path,
                title: item.label,
                isClosable: true
            });
        }
    };

    const handleCreateClick = (item: any) => {
        if (!item.path) return;
        const createPath = CREATE_PATHS[item.path];
        if (!createPath) {
            handleItemClick(item);
            return;
        }

        openTab({
            id: createPath,
            path: createPath,
            title: `جديد - ${item.label}`,
            isClosable: true,
        });
    };

    // Grouping Logic
    const sections: { title: string, icon?: any, items: any[] }[] = [];
    let currentSection = { title: 'العمليات الرئيسية', icon: null, items: [] as any[] };

    items.forEach(item => {
        if (item.header) {
            if (currentSection.items.length > 0) sections.push(currentSection);
            currentSection = { title: item.label, icon: null, items: [] };
        }
        else if (item.subItems && item.subItems.length > 0) {
            if (currentSection.items.length > 0) sections.push(currentSection);

            sections.push({
                title: item.label,
                icon: item.icon,
                items: item.subItems
            });
            currentSection = { title: 'أخرى', icon: null, items: [] };
        }
        else if (!item.divider) {
            currentSection.items.push(item);
        }
    });

    if (currentSection.items.length > 0) {
        sections.push(currentSection);
    }

    const validSections = sections.filter(s => s.items.length > 0);

    return (
        // Clean Minimal SaaS Background
        <div className="min-h-full bg-white p-8 md:p-12 font-sans text-slate-900" dir="rtl">

            <div className="max-w-[1400px] mx-auto">

                {/* Bento Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <BentoHeader
                        title={categoryTitle}
                        subtitle="جميع الأدوات والعمليات الخاصة بهذا القسم"
                        breadcrumb="لوحة التحكم / الأقسام"
                    />
                </motion.div>

                {/* Content Sections */}
                <div className="space-y-12">
                    {validSections.map((section, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (idx * 0.05) }}
                        >
                            <GlassSectionTitle title={section.title} />

                            <BentoGrid>
                                {section.items.map((item, itemIdx) => (
                                    <div
                                        key={itemIdx}
                                        className="flex min-h-[148px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                                {item.icon ? React.createElement(item.icon, { size: 22, strokeWidth: 1.6 }) : <Sparkles size={22} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-bold text-slate-900">{item.label}</h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {CREATE_PATHS[item.path] ? 'فتح السجل أو بدء إدخال جديد مباشرة.' : 'فتح الشاشة ومتابعة العمل من داخلها.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleItemClick(item)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                            >
                                                <ExternalLink size={16} />
                                                فتح
                                            </button>
                                            {item.path && CREATE_PATHS[item.path] && (
                                                <button
                                                    onClick={() => handleCreateClick(item)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:brightness-105"
                                                >
                                                    <Plus size={16} />
                                                    جديد
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </BentoGrid>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
