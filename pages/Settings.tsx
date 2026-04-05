import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, Save, Globe, Printer } from 'lucide-react';

export const Settings = () => {
    const [machineId, setMachineId] = useState('LOADING...');
    const [license, setLicense] = useState({ status: 'checking', key: '' });
    const [inputKey, setInputKey] = useState('');

    // System Config
    const [config, setConfig] = useState<any>({
        companyName: 'WAFI ERP User',
        taxRate: '16',
        currency: 'ILS',
        printer: 'Default'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const mid = await window.electronAPI.getMachineId();
            setMachineId(mid);

            // @ts-ignore
            const lic = await window.electronAPI.validateLicense();
            setLicense(lic);

            // @ts-ignore
            const settings = await window.electronAPI.system.getSettings();
            if (settings.companyName) setConfig(settings);
        }
    };

    const handleActivate = async () => {
        if (!inputKey) return alert("أدخل مفتاح التفعيل");
        try {
            // @ts-ignore
            await window.electronAPI.activateProduct(inputKey);
            alert("تم التفعيل بنجاح! شكراً لاستخدامك WAFI ERP.");
            loadData();
        } catch (err: any) {
            alert("فشل التفعيل: " + err.message);
        }
    };

    const handleSaveConfig = async () => {
        try {
            // @ts-ignore
            await window.electronAPI.saveSettings(config);
            alert("تم حفظ الإعدادات");
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-6 gap-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-blue-600" /> الإعدادات والحماية (The Iron Dome)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Licensing Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Key className="text-yellow-600" /> الترخيص والتفعيل
                    </h2>

                    <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Machine Fingerprint</label>
                        <div className="font-mono text-lg font-bold text-gray-800 tracking-wider select-all">
                            {machineId}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">زود هذا الرمز للشركة للحصول على مفتاح التفعيل.</p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-600 mb-1">حالة النسخة</label>
                        {license.status === 'active' ? (
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded font-bold flex items-center gap-2">
                                <Shield size={18} /> نسخة مفعلة وقانونية
                            </div>
                        ) : (
                            <div className="bg-red-100 text-red-800 px-4 py-2 rounded font-bold flex items-center gap-2 animate-pulse">
                                <Lock size={18} /> نسخة غير مفعلة (تجريبية)
                            </div>
                        )}
                    </div>

                    {license.status !== 'active' && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputKey}
                                onChange={e => setInputKey(e.target.value)}
                                placeholder="WAFI-XXXX-XXXX-XXXX"
                                className="flex-1 border p-2 rounded text-center font-mono uppercase"
                            />
                            <button
                                onClick={handleActivate}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
                            >
                                تفعيل
                            </button>
                        </div>
                    )}
                </div>

                {/* System Configuration */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Globe className="text-purple-600" /> إعدادات النظام
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">اسم الشركة</label>
                            <input
                                value={config.companyName}
                                onChange={e => setConfig({ ...config, companyName: e.target.value })}
                                className="w-full border p-2 rounded"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">العملة الأساسية</label>
                                <select
                                    value={config.currency}
                                    onChange={e => setConfig({ ...config, currency: e.target.value })}
                                    className="w-full border p-2 rounded"
                                >
                                    <option value="ILS">شيكل (ILS)</option>
                                    <option value="USD">دولار (USD)</option>
                                    <option value="JOD">دينار (JOD)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">نسبة الضريبة %</label>
                                <input
                                    type="number"
                                    value={config.taxRate}
                                    onChange={e => setConfig({ ...config, taxRate: e.target.value })}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1 flex items-center gap-1">
                                <Printer size={14} /> الطابعة الافتراضية
                            </label>
                            <select
                                value={config.printer}
                                onChange={e => setConfig({ ...config, printer: e.target.value })}
                                className="w-full border p-2 rounded"
                            >
                                <option value="Default">System Default</option>
                                <option value="POS-80">POS-80 Thermal</option>
                                <option value="HP-LaserJet">HP LaserJet P1102</option>
                            </select>
                        </div>

                        <button
                            onClick={handleSaveConfig}
                            className="w-full mt-4 bg-gray-800 hover:bg-gray-900 text-white py-2 rounded font-bold flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> حفظ الإعدادات
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
