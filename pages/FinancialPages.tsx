
import React from 'react';
import { GenericDocument } from '../components/GenericDocument';
import { ReceiptVoucher } from './treasury/operations/ReceiptVoucher';
import { FileText, Calculator, PieChart } from 'lucide-react';

// Reusing ReceiptVoucher for Manual Receipt but conceptually it's the same
export const ManualReceipt = () => (
    <div className="h-full flex flex-col">
        <div className="bg-yellow-100 p-2 text-center text-xs font-bold text-yellow-800 border-b border-yellow-200">
            وضع الإدخال اليدوي (من الدفتر الورقي)
        </div>
        <ReceiptVoucher />
    </div>
);

// DN/CN can be treated as simplified documents or JVs
export const FinancialNotes = () => (
    <GenericDocument
        title="إشعارات مدينة / دائنة (DN/CN)"
        documentName="الإشعار"
        type="PURCHASE" // Can be either, but usually affects account balance directly
        accountLabel="الحساب"
        colorTheme="blue"
        prefix="NOTE"
    />
);

// Logic Screens
const LogicScreen = ({ title, icon, desc }: any) => (
    <div className="p-6 bg-[#f0f2f5] min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full text-center">
            <div className="flex justify-center mb-4 text-emerald-600">
                {icon}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
            <p className="text-gray-500 mb-6">{desc}</p>
            <button className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700 font-bold w-full">
                بدء المعالجة
            </button>
        </div>
    </div>
);

export const VatSettlement = () => (
    <LogicScreen
        title="تسوية ضريبة القيمة المضافة"
        icon={<FileText size={48} />}
        desc="سيقوم النظام بحساب الضريبة المحصلة والمدفوعة للمترة المحددة وإنشاء قيد تسوية تلقائي."
    />
);

export const FxValuation = () => (
    <LogicScreen
        title="احتساب فروق العملة"
        icon={<Calculator size={48} />}
        desc="إعادة تقييم الأرصدة بالعملات الأجنبية بناءً على أسعار الصرف الحالية وإنشاء قيود الفروقات."
    />
);

export const Depreciation = () => (
    <LogicScreen
        title="احتساب استهلاك الأصول"
        icon={<PieChart size={48} />}
        desc="إنشاء قيود الإهلاك الشهرية لجميع الأصول الثابتة الفعالة."
    />
);
