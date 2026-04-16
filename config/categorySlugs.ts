
// Map Arabic Category Titles to English Slugs for URLs
export const CATEGORY_SLUGS: Record<string, string> = {
    'ملف وإدارة النظام': 'system',
    'التعاريف والبطاقات': 'definitions',
    'المخزون والأصناف': 'inventory',
    'الاستيراد والتصدير': 'import-export',
    'المشتريات والاستيراد': 'purchasing', // Legacy or potential mix-up to be safe, but we'll add new ones below
    'المشتريات': 'purchasing',
    'المبيعات': 'sales',
    'المستودعات': 'warehouses',
    'السندات': 'vouchers',
    'البنوك': 'banking',
    // 'المبيعات والعملاء': 'sales', // Legacy

    'المحاسبة العامة': 'gl',
    'السندات والبنوك': 'treasury',
    'التصنيع': 'manufacturing',
    'الموارد البشرية': 'hr',
    'التقارير والتحليلات': 'reports',
    'أدوات ومساعدة': 'tools',
};

// Reverse map for lookup
export const SLUG_TO_CATEGORY: Record<string, string> = Object.entries(CATEGORY_SLUGS).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);

export const getSlug = (title: string) => CATEGORY_SLUGS[title] || 'unknown';
export const getTitle = (slug: string) => SLUG_TO_CATEGORY[slug] || '';
