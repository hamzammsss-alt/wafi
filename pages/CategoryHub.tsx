import React from 'react';
import { useParams, useLocation, matchPath } from 'react-router-dom';
import { useTabs } from '../src/contexts/TabsContext';
import { TOP_MENU_ITEMS } from '../config/menuData';
import { getTitle } from '../config/categorySlugs';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { BentoHeader, BentoGrid, BentoAction, GlassSectionTitle } from '../components/ui/Bento';

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
                                    <BentoAction
                                        key={itemIdx}
                                        label={item.label}
                                        icon={item.icon}
                                        onClick={() => handleItemClick(item)}
                                        // Omitting subtitle props to ensure no paths are passed, 
                                        // though BentoAction handles this protection too.
                                        color={item.color || 'indigo'}
                                    />
                                ))}
                            </BentoGrid>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
