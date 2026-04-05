import React from 'react';
import {
    Calendar, Calculator, RefreshCw, Clipboard,
    Mail, MessageCircle, Smartphone,
    FileCog, Printer, ArrowLeft, Zap, Box
} from 'lucide-react';
import { useTabs } from '../../src/contexts/TabsContext';

interface ToolItem {
    label: string;
    icon: any;
    path: string;
    color: string;           // Icon color class
    bgGradient: string;      // Background gradient class for the icon container
    description: string;
}

const TOOLS_DATA = {
    office: [
        { label: 'الرزنامة', icon: Calendar, path: '/tools/calendar', color: 'text-blue-100', bgGradient: 'from-blue-500 to-blue-600', description: 'إدارة المواعيد والمهام اليومية' },
        { label: 'الآلة الحاسبة', icon: Calculator, path: '/tools/calculator', color: 'text-emerald-100', bgGradient: 'from-emerald-500 to-emerald-600', description: 'حسابات مالية وضريبة' },
        { label: 'محول العملات', icon: RefreshCw, path: '/tools/converter', color: 'text-amber-100', bgGradient: 'from-amber-500 to-amber-600', description: 'أسعار الصرف المباشرة' },
        { label: 'المفكرة', icon: Clipboard, path: '/tools/notepad', color: 'text-purple-100', bgGradient: 'from-purple-500 to-purple-600', description: 'تدوين الملاحظات السريعة' },
    ],
    communication: [
        { label: 'البريد الداخلي', icon: Mail, path: '/tools/mail', color: 'text-sky-100', bgGradient: 'from-sky-500 to-sky-600', description: 'مراسلات الفريق الداخلية' },
        { label: 'المحادثة', icon: MessageCircle, path: '/tools/chat', color: 'text-pink-100', bgGradient: 'from-pink-500 to-pink-600', description: 'غرف الدردشة المباشرة' },
        { label: 'رسائل SMS', icon: Smartphone, path: '/tools/sms', color: 'text-indigo-100', bgGradient: 'from-indigo-500 to-indigo-600', description: 'بوابة الرسائل القصيرة' },
    ],
    designers: [
        { label: 'مصمم النماذج', icon: FileCog, path: '/tools/designer', color: 'text-teal-100', bgGradient: 'from-teal-500 to-teal-600', description: 'تخصيص نماذج الفواتير والسندات' },
        { label: 'تخطيط الطباعة', icon: Printer, path: '/tools/print-layout', color: 'text-cyan-100', bgGradient: 'from-cyan-500 to-cyan-600', description: 'إعدادات الترويسة والتذييل' },
    ]
};

const ToolCard: React.FC<{ item: ToolItem }> = ({ item }) => {
    const { openTab } = useTabs();
    const Icon = item.icon;

    const handleClick = () => {
        openTab({
            id: item.path,
            path: item.path,
            title: item.label,
            isClosable: true
        });
    };

    return (
        <div
            onClick={handleClick}
            className="group relative bg-white border border-slate-200/60 rounded-2xl p-6 
                     cursor-pointer transition-all duration-300 overflow-hidden
                     hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 hover:border-slate-300"
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-slate-100 transition-colors" />

            <div className="relative flex flex-col gap-4">
                {/* Icon Container */}
                <div className={`w-14 h-14 rounded-xl shadow-lg bg-gradient-to-br ${item.bgGradient} 
                                flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={28} className={item.color} strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {item.label}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {item.description}
                    </p>
                </div>

                {/* Action Arrow */}
                <div className="absolute top-0 left-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowLeft size={20} className="text-slate-400" />
                </div>
            </div>
        </div>
    );
};

export const ToolsDashboard = () => {
    return (
        <div className="min-h-full bg-slate-50/50 p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Hero Section */}
                <div className="relative bg-white rounded-3xl p-8 border border-slate-200 shadow-sm overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 bg-blue-50 rounded-2xl">
                            <Box className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">الأدوات والإعدادات المساعدة</h1>
                            <p className="text-slate-500 text-lg max-w-2xl">
                                مجموعة متكاملة من الأدوات المكتبية والخدمية لتعزيز إنتاجية الفريق وتخصيص تجربة العمل.
                            </p>
                        </div>
                    </div>
                    {/* Abstract Shapes */}
                    <div className="absolute right-0 bottom-0 opacity-5">
                        <Zap size={200} />
                    </div>
                </div>

                {/* Office Tools */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-blue-500 rounded-full" />
                        <h2 className="text-xl font-bold text-slate-800">الأدوات المكتبية</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TOOLS_DATA.office.map((tool, idx) => (
                            <ToolCard key={idx} item={tool} />
                        ))}
                    </div>
                </section>

                {/* Communication */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-indigo-500 rounded-full" />
                        <h2 className="text-xl font-bold text-slate-800">التواصل والمراسلات</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TOOLS_DATA.communication.map((tool, idx) => (
                            <ToolCard key={idx} item={tool} />
                        ))}
                    </div>
                </section>

                {/* Designers */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1 bg-teal-500 rounded-full" />
                        <h2 className="text-xl font-bold text-slate-800">التصميم والتخصيص</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {TOOLS_DATA.designers.map((tool, idx) => (
                            <ToolCard key={idx} item={tool} />
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ToolsDashboard;
