import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight, X } from 'lucide-react';

interface PrintPreviewProps {
    title?: string;
    data?: any;
    columns?: { header: string; key: string; width?: string; format?: (val: any) => string }[];
    onClose?: () => void;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({ title, data: propData, columns, onClose }) => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!propData);
    const [settings, setSettings] = useState<any>({});
    const [data, setData] = useState<any>(propData || null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSettings();
        if (!propData && type && id) {
            loadData();
        }
    }, [type, id, propData]);

    const loadSettings = async () => {
        try {
            // @ts-ignore
            const companySettings = await window.electronAPI.system.getSettings();
            setSettings(companySettings || {});
        } catch (e) { console.error('Error loading settings', e); }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Document loading logic based on type/id...
            let doc = null;
            // @ts-ignore
            if (type === 'quotation') doc = await window.electronAPI.sales.getQuotation(id!);
            // @ts-ignore
            else if (type === 'order') doc = await window.electronAPI.sales.getOrder(id!);
            // @ts-ignore
            else if (type === 'sales-return') doc = await window.electronAPI.sales.getReturn(id!);
            // @ts-ignore
            else if (type === 'purchase-invoice') doc = await window.electronAPI.purchase.getInvoice(id!);
            // @ts-ignore
            else if (type === 'receipt') doc = await window.electronAPI.treasury.getReceipt(id!);

            if (!doc && !propData) throw new Error('Document not found');
            setData(doc);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">جاري تحميل المستند...</div>;
    if (error) return <div className="p-8 text-center text-red-600">خطأ: {error}</div>;

    const pageTitle = title || getTitleFromType(type);

    return (
        <div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white font-sans text-right" dir="rtl">
            {/* Toolbar - Hidden in Print */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
                <button
                    onClick={() => onClose ? onClose() : navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    {onClose ? <X className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                    {onClose ? 'إغلاق' : 'عودة'}
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all font-bold"
                >
                    <Printer className="w-5 h-5" />
                    طباعة المستند
                </button>
            </div>

            {/* A4 Page Container */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-[10mm] min-h-[297mm] text-black">

                {/* 1. Header */}
                <header className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-start">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-gray-900">{settings.company_name || 'اسم الشركة'}</h1>
                        <p className="text-sm text-gray-600 max-w-[300px]">{settings.address || 'العنوان غير محدد'}</p>
                        <p className="text-sm text-gray-600">هاتف: <span dir="ltr">{settings.phone || '-'}</span></p>
                    </div>

                    <div className="text-center">
                        {settings.logo && (
                            <img src={settings.logo} className="h-20 object-contain mb-2 mx-auto" alt="Logo" />
                        )}
                        <div className="inline-block bg-gray-900 text-white px-4 py-1 rounded-full text-sm font-bold">
                            {pageTitle}
                        </div>
                    </div>

                    <div className="text-left space-y-1">
                        <div className="flex gap-2 justify-end">
                            <span className="font-bold">التاريخ:</span>
                            <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </header>

                {/* 2. Dynamic Table for Reports */}
                {columns && Array.isArray(data) ? (
                    <table className="w-full text-right text-sm border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                {columns.map((col, i) => (
                                    <th key={i} className="p-2 border border-gray-200" style={{ width: col.width }}>{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row: any, idx: number) => (
                                <tr key={idx} className="even:bg-gray-50">
                                    {columns.map((col, i) => (
                                        <td key={i} className="p-2 border border-gray-200">
                                            {col.format ? col.format(row[col.key]) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <>
                        {/* Generic Lines or specialized for Receipt */}
                        {type === 'receipt' ? (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-8 border-t-2 border-gray-800 pt-6">
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 mb-1">استلمنا من السيد / السادة</p>
                                        <p className="text-xl font-bold border-b border-gray-300 pb-2">{data?.header?.customer_name || '---'}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-400 mb-1">المبلغ</p>
                                        <p className="text-2xl font-black bg-gray-100 px-4 py-2 inline-block rounded-lg">{Number(data?.header?.amount).toLocaleString()} {data?.header?.currency_id}</p>
                                    </div>
                                </div>

                                <div className="border-b border-gray-300 pb-4">
                                    <p className="text-sm font-bold text-gray-400 mb-1">وذلك عن</p>
                                    <p className="text-lg">{data?.header?.description || '---'}</p>
                                </div>

                                {/* Table of Details (Cash/Checks) */}
                                {(data?.lines?.length > 0 || data?.checks?.length > 0) && (
                                    <table className="w-full text-right border-collapse mt-4">
                                        <thead className="bg-gray-100 border-y-2 border-gray-800">
                                            <tr>
                                                <th className="p-2 text-sm font-bold">طريقة الدفع</th>
                                                <th className="p-2 text-sm font-bold">التفاصيل / البنك / رقم الشيك</th>
                                                <th className="p-2 text-sm font-bold text-center">التاريخ</th>
                                                <th className="p-2 text-sm font-bold text-left">المبلغ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data?.lines?.map((l: any, i: number) => (
                                                <tr key={`cash-${i}`}>
                                                    <td className="p-2 text-sm font-bold text-emerald-600">نقدي / تحويل</td>
                                                    <td className="p-2 text-sm">{l.account_name}</td>
                                                    <td className="p-2 text-sm text-center">---</td>
                                                    <td className="p-2 text-sm font-bold text-left">{Number(l.debit).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {data?.checks?.map((c: any, i: number) => (
                                                <tr key={`check-${i}`}>
                                                    <td className="p-2 text-sm font-bold text-purple-600">شيك وارد</td>
                                                    <td className="p-2 text-sm">{c.bank_name} - {c.cheque_no}</td>
                                                    <td className="p-2 text-sm text-center">{c.due_date}</td>
                                                    <td className="p-2 text-sm font-bold text-left">{Number(c.amount).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-gray-800 font-bold">
                                            <tr>
                                                <td colSpan={3} className="p-2 text-left">الإجمالــــي:</td>
                                                <td className="p-2 text-left">{Number(data?.header?.amount).toLocaleString()} {data?.header?.currency_id}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}

                                {/* Signature Section */}
                                <div className="grid grid-cols-3 gap-8 pt-12 text-center mt-20">
                                    <div className="space-y-12">
                                        <p className="font-bold border-b border-gray-800 pb-2 mx-8">أمين الصندوق</p>
                                    </div>
                                    <div className="space-y-12">
                                        <p className="font-bold border-b border-gray-800 pb-2 mx-8">المحاسب</p>
                                    </div>
                                    <div className="space-y-12">
                                        <p className="font-bold border-b border-gray-800 pb-2 mx-8">توقيع المستلم</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Customer Info (Example) */}
                                {data?.header && (
                                    <section className="bg-gray-50 rounded-lg p-4 mb-8 border border-gray-100 flex justify-between">
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">بيانات العميل</h3>
                                            <p className="text-lg font-bold">{data?.header?.customer_name || 'زبون نقدي'}</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold">رقم المستند: {data?.header?.quotation_no || data?.header?.id}</p>
                                        </div>
                                    </section>
                                )}

                                {/* Generic Lines */}
                                {data?.lines && (
                                    <table className="w-full text-right mb-8">
                                        <thead className="border-b-2 border-gray-800">
                                            <tr>
                                                <th className="py-2 text-sm font-bold w-12 text-center">#</th>
                                                <th className="py-2 text-sm font-bold">البيان</th>
                                                <th className="py-2 text-sm font-bold w-24 text-center">الكمية</th>
                                                <th className="py-2 text-sm font-bold w-32 text-center">السعر</th>
                                                <th className="py-2 text-sm font-bold w-32 text-center">الاجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {data.lines.map((line: any, index: number) => (
                                                <tr key={index}>
                                                    <td className="py-2 text-center text-sm">{index + 1}</td>
                                                    <td className="py-2 text-sm">{line.description || line.item_name}</td>
                                                    <td className="py-2 text-center text-sm">{line.quantity}</td>
                                                    <td className="py-2 text-center text-sm">{Number(line.unit_price).toLocaleString()}</td>
                                                    <td className="py-2 text-center text-sm font-bold">
                                                        {(Number(line.quantity) * Number(line.unit_price)).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}
                    </>
                )}

            </div>
        </div>
    );
};

const getTitleFromType = (type?: string) => {
    switch (type) {
        case 'quotation': return 'عرض أسعار';
        case 'order': return 'طلبية مبيعات';
        case 'sales-return': return 'إشعار مردود مبيعات';
        case 'invoice': return 'فاتورة مبيعات';
        case 'receipt': return 'سند قبض';
        default: return 'مستند';
    }
};

export default PrintPreview;
