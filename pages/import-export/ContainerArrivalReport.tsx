import React, { useState, useEffect } from 'react';
import { Truck, Calendar, AlertTriangle, CheckCircle2, Search, Filter, Ship } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

const ContainerArrivalReport = () => {
    const { navigateInTab } = useTabs();
    const [containers, setContainers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDays, setFilterDays] = useState(7);

    useEffect(() => {
        loadContainers();
    }, [filterDays]);

    const loadContainers = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getContainersNearDemurrage(filterDays);
            setContainers(data || []);
        } catch (error) {
            console.error('Failed to load container report:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ARRIVED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CLEARED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_TRANSIT': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'DELAYED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Ship size={28} className="text-indigo-600" />
                        حركة الحاويات والمراسي (Container Tracking)
                    </h1>
                    <p className="text-slate-500 text-sm">متابعة مواعيد وصول الحاويات وتنبيهات الأرضيات (Demurrage)</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 px-3">منبه الأرضيات:</span>
                    {[3, 7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setFilterDays(d)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterDays === d ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            {d} أيام
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center text-slate-400">جاري مسح الحاويات...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {containers.map((container) => {
                        const daysLeft = Math.ceil((new Date(container.demurrage_alert_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        const isCritical = daysLeft <= 3;

                        return (
                            <Card key={container.id} className={`overflow-hidden border-r-4 ${isCritical ? 'border-r-red-500' : 'border-r-indigo-500'}`}>
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{container.container_no}</h3>
                                            <p className="text-xs text-slate-500">شحنة رقم: {container.shipment_no}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(container.container_status)}`}>
                                            {container.container_status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">الحجم</p>
                                            <p className="text-sm font-bold text-slate-700">{container.size || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">الوزن القائم (KG)</p>
                                            <p className="text-sm font-bold text-slate-700">{container.gross_weight?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className={`p-3 rounded-lg flex items-center justify-between ${isCritical ? 'bg-red-50' : 'bg-slate-50'}`}>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-red-600' : 'text-amber-500'}`} />
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold">بدء الأرضيات</p>
                                                <p className="text-xs font-bold">{container.demurrage_alert_date}</p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <span className={`text-xl font-black ${isCritical ? 'text-red-700' : 'text-slate-700'}`}>
                                                {daysLeft}
                                            </span>
                                            <span className="text-[10px] text-slate-500 mr-1 italic">يوم متبقي</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigateInTab(`/import/shipments/${container.shipment_id}`, 'تفاصيل الشحنة')}
                                        className="w-full py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-100 transition-colors"
                                    >
                                        فتح ملف الشحنة
                                    </button>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {containers.length === 0 && (
                        <div className="col-span-full p-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">لا توجد حاويات متأخرة أو قريبة من موعد الأرضيات</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContainerArrivalReport;
