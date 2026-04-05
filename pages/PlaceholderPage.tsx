import React from 'react';
import { FileQuestion } from 'lucide-react';

interface PlaceholderPageProps {
    title: string;
    category: string;
    description?: string;
    icon?: React.ReactNode;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
    title,
    category,
    description,
    icon
}) => {
    return (
        <div className="h-full bg-gray-50 flex items-center justify-center p-6" dir="rtl">
            <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-indigo-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                    {icon || <FileQuestion size={48} className="text-indigo-600" />}
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-3">{title}</h1>
                <p className="text-sm text-gray-500 mb-2">القسم: {category}</p>
                {description && (
                    <p className="text-gray-600 mb-6">{description}</p>
                )}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-right">
                    <p className="text-sm text-yellow-800">
                        <strong>قيد التطوير:</strong> هذه الصفحة جاهزة للتطوير. الهيكل الأساسي موجود ويمكن إضافة الوظائف المطلوبة.
                    </p>
                </div>
            </div>
        </div>
    );
};
