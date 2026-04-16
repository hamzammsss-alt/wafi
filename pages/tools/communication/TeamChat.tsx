import React from 'react';
import { MessageCircle, Send } from 'lucide-react';

export const TeamChat = () => {
    return (
        <div className="app-page h-full flex flex-col" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MessageCircle className="text-green-600" /> المحادثة الفورية
            </h1>

            <div className="flex-1 card flex overflow-hidden">
                {/* Contact List */}
                <div className="w-80 border-l flex flex-col bg-gray-50">
                    <div className="p-4 border-b font-bold text-gray-700">المستخدمين (5 متصل)</div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {['أحمد سلطان', 'خالد عواد', 'سارة محمد'].map(user => (
                            <div key={user} className="flex items-center gap-3 p-3 hover:bg-white rounded-lg cursor-pointer transition">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-800">{user}</div>
                                    <div className="text-xs text-gray-500">متاح</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Room */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-4 border-b flex items-center gap-3 shadow-sm z-10">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div>
                            <div className="font-bold text-gray-800">أحمد سلطان</div>
                            <div className="text-xs text-green-600 font-bold">يكتب الآن...</div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-auto space-y-4 bg-gray-50/30">
                        <div className="flex justify-end">
                            <div className="bg-indigo-600 text-white rounded-2xl rounded-tl-none px-4 py-2 max-w-[70%] shadow-sm">
                                السلام عليكم، هل التقرير جاهز؟
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <div className="bg-white border text-gray-800 rounded-2xl rounded-tr-none px-4 py-2 max-w-[70%] shadow-sm">
                                وعليكم السلام، نعم سأقوم بإرساله خلال دقائق.
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50">
                        <div className="flex gap-2">
                            <input type="text" className="flex-1 border rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="اكتب رسالتك هنا..." />
                            <button className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-700 shadow-sm"><Send size={18} className="ml-1" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

