import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Filter, Plus, FileText,
    MapPin, Anchor, DollarSign, Calendar, Eye, ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// Basic UI Helper for missing shadcn components (Button/Input) if they are not yet fully available globally
const Button = ({ children, variant, className, onClick, size }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
    const variants: any = {
        default: "bg-slate-900 text-white hover:bg-slate-900/90 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100 hover:text-slate-900",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
    };
    return <button onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};
const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;
const Badge = ({ children, className }: any) => <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${className}`}>{children}</div>;


const ShipmentList = () => {
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        loadShipments();
    }, []);

    const loadShipments = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getShipments({});
            setShipments(data || []);
        } catch (error) {
            console.error('Failed to load shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Shipped': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Arrived': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Cleared': return 'bg-green-100 text-green-800 border-green-200';
            case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: any = {
            'Open': 'مفتوح',
            'Shipped': 'في الطريق',
            'Arrived': 'واصل الميناء',
            'Cleared': 'تم التخليص',
            'Closed': 'مغلق'
        };
        return labels[status] || status;
    };

    const statusOptions = [
        { value: 'All', label: 'الكل' },
        { value: 'Open', label: 'مفتوح' },
        { value: 'Shipped', label: 'في الطريق' },
        { value: 'Arrived', label: 'واصل الميناء' },
        { value: 'Cleared', label: 'تم التخليص' },
        { value: 'Closed', label: 'مغلق' }
    ];

    const filteredShipments = shipments.filter(s => {
        const matchesSearch =
            s.shipment_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigateInTab('/import/dashboard', 'لوحة الاستيراد')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة الشحنات والاستيراد</h1>
                        <p className="text-slate-500 mt-1">متابعة ملفات الاستيراد، الحاويات، والتخليص الجمركي</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        تقارير الاستيراد
                    </Button>
                    <Button onClick={() => navigateInTab('/import/shipments/new', 'ملف استيراد جديد')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Plus className="w-4 h-4" />
                        ملف استيراد جديد
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">شحنات مفتوحة</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-2">{shipments.filter(s => s.status === 'Open').length}</h3>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">في الطريق</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-2">{shipments.filter(s => s.status === 'Shipped').length}</h3>
                            </div>
                            <div className="p-2 bg-yellow-50 rounded-lg">
                                <Anchor className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">واصل الميناء</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-2">{shipments.filter(s => s.status === 'Arrived').length}</h3>
                            </div>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <MapPin className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500">تم التخليص</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-2">{shipments.filter(s => s.status === 'Cleared').length}</h3>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Package className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-lg">
                            <Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                            <Input
                                placeholder="بحث برقم الشحنة، المورد، أو المرجع..."
                                className="pr-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                            {statusOptions.map(status => (
                                <Button
                                    key={status.value}
                                    variant={statusFilter === status.value ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter(status.value)}
                                    className="whitespace-nowrap"
                                >
                                    {status.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Shipments Grid */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        جاري التحميل...
                    </div>
                ) : filteredShipments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-dashed">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">لا توجد شحنات</h3>
                        <p className="text-slate-500 mt-1">ابدأ بإنشاء ملف استيراد جديد لمتابعة شحناتك</p>
                        <Button
                            onClick={() => navigateInTab('/import/shipments/new', 'ملف استيراد جديد')}
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 ml-2" />
                            ملف استيراد جديد
                        </Button>
                    </div>
                ) : (
                    filteredShipments.map((shipment) => (
                        <Card
                            key={shipment.id}
                            className="hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => navigateInTab(`/import/shipments/${shipment.id}`, `ملف ${shipment.shipment_no}`)}
                        >
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    {/* Left: Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-bold text-slate-900">#{shipment.shipment_no}</h3>
                                            <Badge className={`${getStatusColor(shipment.status)} border`}>
                                                {getStatusLabel(shipment.status)}
                                            </Badge>
                                            {shipment.origin_country && (
                                                <span className="flex items-center text-sm text-slate-600 gap-1 px-2 py-0.5 bg-slate-100 rounded">
                                                    <MapPin className="w-3 h-3" />
                                                    {shipment.origin_country}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                                            <div>
                                                <span className="block text-xs text-slate-400 mb-1">المورد</span>
                                                <span className="font-medium text-slate-800">{shipment.supplier_name || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-slate-400 mb-1">المرجع</span>
                                                <span className="font-medium">{shipment.reference_number || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-slate-400 mb-1">تاريخ الفتح</span>
                                                <span className="font-medium">{shipment.opening_date}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-slate-400 mb-1">ميناء الوصول</span>
                                                <span className="font-medium">{shipment.port_of_arrival || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions/Status */}
                                    <div className="flex items-center justify-end md:border-l md:pl-6 border-slate-200">
                                        <div className="text-blue-600 group-hover:text-blue-700 flex items-center gap-2 font-medium">
                                            <Eye className="w-4 h-4" />
                                            <span className="text-sm">عرض التفاصيل</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default ShipmentList;
