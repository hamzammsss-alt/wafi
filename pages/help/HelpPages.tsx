
import React from 'react';
import { HelpCircle } from 'lucide-react';

export const HelpPages = () => (
    <div className="p-6 bg-[#f0f2f5] min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <HelpCircle className="text-purple-600" /> المساعدة والدعم
        </h1>
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
            <p>دليل المستخدم، التفعيل، والدعم الفني.</p>
        </div>
    </div>
);
