import React from 'react';
import { Monitor } from 'lucide-react';

export const RemoteSupport = () => {
    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center text-center" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                <Monitor className="text-indigo-600" size={32} /> المساعدة عن بعد
            </h1>

            <div className="grid grid-cols-2 gap-8 max-w-3xl w-full">
                <div className="bg-white p-8 rounded-2xl shadow-md border hover:border-blue-500 transition cursor-pointer group">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/TeamViewer_Logo_Icon_Only.svg/1024px-TeamViewer_Logo_Icon_Only.svg.png" className="w-20 h-20 mx-auto mb-4 object-contain opacity-80 group-hover:opacity-100 transition" alt="TeamViewer" />
                    <h3 className="font-bold text-xl text-gray-800 mb-2">TeamViewer</h3>
                    <button className="text-blue-600 font-bold hover:underline">تحميل البرنامج</button>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-md border hover:border-red-500 transition cursor-pointer group">
                    <img src="https://anydesk.com/_static/img/logos/anydesk-logo-400.png" className="w-20 h-20 mx-auto mb-4 object-contain opacity-80 group-hover:opacity-100 transition" alt="AnyDesk" />
                    <h3 className="font-bold text-xl text-gray-800 mb-2">AnyDesk</h3>
                    <button className="text-red-500 font-bold hover:underline">تحميل البرنامج</button>
                </div>
            </div>

            <p className="mt-8 text-gray-500 max-w-lg">
                يرجى تحميل أحد البرامج أعلاه وتزويد موظف الدعم الفني برقم الهوية (ID) وكلمة المرور للسماح له بالدخول لجهازك وحل المشكلة.
            </p>
        </div>
    );
};
