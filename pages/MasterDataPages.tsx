import React from 'react';
import { GenericMasterData } from '../components/GenericMasterData';
import { Ruler, Award, Globe, Box, Layers, Tag, Bookmark, Briefcase, Book, MapPin, CreditCard, UserCheck, BookOpen, Banknote } from 'lucide-react';

// --- Phase 1: Existing Pages ---
export const Units = () => (
    <GenericMasterData
        title="الوحدات (Units)"
        icon={<Ruler className="text-blue-600" />}
        tableName="units"
        columns={[
            { key: 'name', label: 'اسم الوحدة' },
            { key: 'symbol', label: 'الرمز' }
        ]}
    />
);

export const Brands = () => (
    <GenericMasterData
        title="العلامات التجارية (Brands)"
        icon={<Award className="text-amber-600" />}
        tableName="brands"
        columns={[
            { key: 'name', label: 'اسم العلامة التجارية' },
            { key: 'origin', label: 'بلد المنشأ' }
        ]}
    />
);

export const Countries = () => (
    <GenericMasterData
        title="الدول والمناطق"
        tableName="countries"
        icon={<Globe className="text-cyan-600" />}
        columns={[
            { key: 'name', label: 'اسم الدولة / المنطقة' },
            { key: 'code', label: 'الرمز الدولي' }
        ]}
    />
);

export const AssetFamilies = () => (
    <GenericMasterData
        title="عائلات الموجودات الثابتة"
        tableName="asset_families"
        icon={<Box className="text-purple-600" />}
        columns={[
            { key: 'name', label: 'اسم العائلة' },
            { key: 'depreciation', label: 'نسبة الاستهلاك السنوي %', type: 'number' }
        ]}
    />
);

export const ItemFamilies = () => (
    <GenericMasterData
        title="عائلات الأصناف"
        tableName="item_families"
        icon={<Layers className="text-indigo-600" />}
        columns={[
            { key: 'name', label: 'اسم العائلة' }
        ]}
    />
);

export { CategoriesPage as ItemGroups } from './definitions/inventory/CategoriesPage';

// export const ItemCategories = ... (Removed, replaced by CategoriesPage as ItemGroups)

export const CostCenters = () => (
    <GenericMasterData
        title="مراكز التكلفة"
        tableName="cost_centers"
        icon={<Briefcase className="text-orange-600" />}
        columns={[
            { key: 'code', label: 'رمز المركز' },
            { key: 'name', label: 'اسم مركز التكلفة' }
        ]}
    />
);

export const ManualBooks = () => (
    <GenericMasterData
        title="دفاتر السندات اليدوية"
        tableName="manual_books"
        icon={<Book className="text-gray-600" />}
        columns={[
            { key: 'type', label: 'نوع الدفتر' }, // SALES, RECEIPT
            { key: 'number', label: 'رقم الدفتر' }
        ]}
    />
);

// --- Phase 2: Detailed Constitution Pages ---

export const ExpenseTypes = () => (
    <GenericMasterData
        title="أنواع المصاريف (Expense Types)"
        icon={<Banknote className="text-red-600" />}
        columns={[
            { key: 'name', label: 'نوع المصروف' },
            { key: 'category', label: 'التصنيف (إداري/تشغيلي)' }
        ]}
        initialData={[
            { id: 1, name: 'كهرباء ومياه', category: 'تشغيلي' },
            { id: 2, name: 'ضيافة', category: 'إداري' }
        ]}
    />
);

export const Areas = () => (
    <GenericMasterData
        title="المناطق الجغرافية (Areas)"
        icon={<MapPin className="text-green-600" />}
        columns={[
            { key: 'city', label: 'المدينة' },
            { key: 'area', label: 'المنطقة/الشارع' },
            { key: 'rep', label: 'المندوب المسؤول' }
        ]}
        initialData={[
            { id: 1, city: 'الخليل', area: 'راس الجورة', rep: 'علي' }
        ]}
    />
);

export const PaymentTerms = () => (
    <GenericMasterData
        title="طرق الدفع (Payment Terms)"
        icon={<CreditCard className="text-purple-600" />}
        columns={[
            { key: 'name', label: 'المسمى' },
            { key: 'days', label: 'عدد الأيام', type: 'number' }
        ]}
        initialData={[
            { id: 1, name: 'نقدي (Cash)', days: 0 },
            { id: 2, name: 'شيك بعد 30 يوم', days: 30 }
        ]}
    />
);

export const Salesmen = () => (
    <GenericMasterData
        title="المندوبين (Salesmen)"
        icon={<UserCheck className="text-blue-600" />}
        columns={[
            { key: 'name', label: 'اسم المندوب' },
            { key: 'phone', label: 'الهاتف' },
            { key: 'commission', label: 'نسية العمولة %', type: 'number' }
        ]}
        initialData={[
            { id: 1, name: 'مندوب 1', phone: '0599...', commission: 2 }
        ]}
    />
);

export const CheckBooks = () => (
    <GenericMasterData
        title="دفاتر الشيكات (Check Books)"
        icon={<BookOpen className="text-gray-600" />}
        columns={[
            { key: 'bank', label: 'البنك' },
            { key: 'serial_start', label: 'بداية التسلسل' },
            { key: 'serial_end', label: 'نهاية التسلسل' },
            { key: 'status', label: 'الحالة' }
        ]}
        initialData={[
            { id: 1, bank: 'فلسطين - شيكل', serial_start: '100', serial_end: '150', status: 'نشط' }
        ]}
    />
);
