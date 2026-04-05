import React, { useState, useEffect } from 'react';
import { Ship, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// UI Helpers
const Button = ({ children, variant, className, onClick }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        outline: "border border-slate-200 bg-transparent hover:bg-slate-100",
    };
    return <button onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Badge = ({ children, variant, className }: any) => {
    const variants: any = {
        default: "bg-slate-100 text-slate-800",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800",
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant || 'default']} ${className}`}>{children}</span>;
};

const ContainerTrackingDashboard = () => {
    const { navigateInTab } = useTabs();
    const [loading, setLoading] = useState(false);
    const [containers, setContainers] = useState<any[]>([]);
    const [demurrageAlerts, setDemurrageAlerts] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        loadContainers();
        loadDemurrageAlerts();
    }, []);

    const loadContainers = async () => {
        try {
            setLoading(true);
            // Get all active shipments and their containers
            const shipments = await window.electronAPI.import.getShipments({ status: 'Shipped,Arrived' });

            const allContainers: any[] = [];
            for (const shipment of shipments) {
                const shipmentContainers = await window.electronAPI.import.getContainers(shipment.id);
                shipmentContainers.forEach((c: any) => {
                    allContainers.push({
                        ...c,
                        shipment_no: shipment.shipment_no,
                        shipment_id: shipment.id
                    });
                });
            }

            setContainers(allContainers);
        } catch (error) {
            console.error('Error loading containers:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDemurrageAlerts = async () => {
        try {
            const alerts = await window.electronAPI.import.getContainersNearDemurrage(7);
            setDemurrageAlerts(alerts || []);
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: any = {
            'IN_TRANSIT': { variant: 'info', label: 'في الطريق', icon: Ship },
            'ARRIVED': { variant: 'warning', label: 'واصل الميناء', icon: Package },
            'CLEARED': { variant: 'success', label: 'تم التخليص', icon: CheckCircle },
            'DELIVERED': { variant: 'default', label: 'تم التسليم', icon: CheckCircle }
        };

        const config = statusMap[status] || { variant: 'default', label: status, icon: Package };
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };

    const getDaysUntilDemurrage = (alertDate: string) => {
        if (!alertDate) return null;
        const today = new Date();
        const alert = new Date(alertDate);
        const diffTime = alert.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getDemurrageBadge = (days: number | null) => {
        if (days === null) return null;

        if (days < 0) {
            return <Badge variant="danger" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                متأخر {Math.abs(days)} يوم
            </Badge>;
        } else if (days === 0) {
            return <Badge variant="danger" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                اليوم!
            </Badge>;
        } else if (days <= 3) {
            return <Badge variant="warning" className="gap-1">
                <Clock className="w-3 h-3" />
                {days} أيام متبقية
            </Badge>;
        } else {
            return <Badge variant="success" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {days} يوم
            </Badge>;
        }
    };

    const filteredContainers = containers.filter(c =>
        statusFilter === 'ALL' || c.container_status === statusFilter
    );

    const stats = {
        total: containers.length,
        inTransit: containers.filter(c => c.container_status === 'IN_TRANSIT').length,
        arrived: containers.filter(c => c.container_status === 'ARRIVED').length,
        cleared: containers.filter(c => c.container_status === 'CLEARED').length,
        alerts: demurrageAlerts.length
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">تتبع الحاويات</h1>
                <p className="text-slate-500 text-sm">متابعة حالة الحاويات وتنبيهات الغرامات</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm opacity-90">إجمالي الحاويات</div>
                                <div className="text-3xl font-bold mt-1">{stats.total}</div>
                            </div>
                            <Package className="w-10 h-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm opacity-90">في الطريق</div>
                                <div className="text-3xl font-bold mt-1">{stats.inTransit}</div>
                            </div>
                            <Ship className="w-10 h-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm opacity-90">واصل الميناء</div>
                                <div className="text-3xl font-bold mt-1">{stats.arrived}</div>
                            </div>
                            <Package className="w-10 h-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm opacity-90">تم التخليص</div>
                                <div className="text-3xl font-bold mt-1">{stats.cleared}</div>
                            </div>
                            <CheckCircle className="w-10 h-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm opacity-90">تنبيهات غرامات</div>
                                <div className="text-3xl font-bold mt-1">{stats.alerts}</div>
                            </div>
                            <AlertTriangle className="w-10 h-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Demurrage Alerts */}
            {demurrageAlerts.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-900">تنبيهات الغرامات</h3>
                                <div className="mt-2 space-y-2">
                                    {demurrageAlerts.map((alert: any) => (
                                        <div key={alert.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                                            <div className="flex items-center gap-3">
                                                <div className="font-semibold text-slate-900">{alert.container_no}</div>
                                                <div className="text-sm text-slate-600">ملف: {alert.shipment_no}</div>
                                            </div>
                                            {getDemurrageBadge(getDaysUntilDemurrage(alert.demurrage_alert_date))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-2">
                        {[
                            { value: 'ALL', label: 'الكل' },
                            { value: 'IN_TRANSIT', label: 'في الطريق' },
                            { value: 'ARRIVED', label: 'واصل الميناء' },
                            { value: 'CLEARED', label: 'تم التخليص' },
                            { value: 'DELIVERED', label: 'تم التسليم' }
                        ].map(filter => (
                            <Button
                                key={filter.value}
                                variant={statusFilter === filter.value ? 'default' : 'outline'}
                                onClick={() => setStatusFilter(filter.value)}
                            >
                                {filter.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Containers List */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">قائمة الحاويات</h3>

                    {loading ? (
                        <div className="text-center py-8 text-slate-500">جاري التحميل...</div>
                    ) : filteredContainers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">لا توجد حاويات</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        <th className="p-3 text-right text-sm font-medium">رقم الحاوية</th>
                                        <th className="p-3 text-right text-sm font-medium">ملف الشحنة</th>
                                        <th className="p-3 text-right text-sm font-medium">الحجم</th>
                                        <th className="p-3 text-right text-sm font-medium">الحالة</th>
                                        <th className="p-3 text-right text-sm font-medium">تاريخ الوصول المتوقع</th>
                                        <th className="p-3 text-right text-sm font-medium">تاريخ الوصول الفعلي</th>
                                        <th className="p-3 text-right text-sm font-medium">تنبيه الغرامة</th>
                                        <th className="p-3 text-right text-sm font-medium">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContainers.map((container: any) => (
                                        <tr key={container.id} className="border-b hover:bg-slate-50">
                                            <td className="p-3 font-semibold">{container.container_no}</td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => navigateInTab(`/import/shipments/${container.shipment_id}`, `ملف ${container.shipment_no}`)}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {container.shipment_no}
                                                </button>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="default">{container.size?.toUpperCase()}</Badge>
                                            </td>
                                            <td className="p-3">{getStatusBadge(container.container_status)}</td>
                                            <td className="p-3 text-sm">
                                                {container.eta ? new Date(container.eta).toLocaleDateString('ar-EG') : '-'}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {container.ata ? new Date(container.ata).toLocaleDateString('ar-EG') : '-'}
                                            </td>
                                            <td className="p-3">
                                                {getDemurrageBadge(getDaysUntilDemurrage(container.demurrage_alert_date))}
                                            </td>
                                            <td className="p-3">
                                                {container.tracking_url && (
                                                    <a
                                                        href={container.tracking_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        تتبع
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ContainerTrackingDashboard;
