import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, Download, Eye, Plus, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

interface DocumentUploadProps {
    shipmentId: string;
    readonly?: boolean;
}

const Button = ({ children, variant, className, onClick, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        ghost: "hover:bg-slate-100",
    };
    return <button disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />;
const Label = ({ children }: any) => <label className="text-sm font-medium text-slate-700 mb-1 block">{children}</label>;
const Select = ({ className, children, ...props }: any) => <select className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>{children}</select>;

const DocumentUploadComponent: React.FC<DocumentUploadProps> = ({ shipmentId, readonly }) => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        document_type: 'INVOICE',
        file_name: '',
        file_path: 'C:/WAFI_DOCS/',
        notes: ''
    });

    useEffect(() => {
        if (shipmentId) {
            loadDocuments();
        }
    }, [shipmentId]);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const docs = await window.electronAPI.import.getShipmentDocuments(shipmentId);
            setDocuments(docs || []);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.file_name) {
            alert('الرجاء إدخال اسم الملف');
            return;
        }

        try {
            setLoading(true);
            const result = await window.electronAPI.import.saveShipmentDocument({
                ...formData,
                shipment_id: shipmentId,
                file_size: Math.floor(Math.random() * 5000000), // Mock size
                mime_type: 'application/pdf',
                uploaded_by: 'مدير النظام'
            });

            if (result.success) {
                setIsAdding(false);
                setFormData({
                    document_type: 'INVOICE',
                    file_name: '',
                    file_path: 'C:/WAFI_DOCS/',
                    notes: ''
                });
                loadDocuments();
            }
        } catch (error) {
            console.error('Error saving document:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

        try {
            const result = await window.electronAPI.import.deleteShipmentDocument(id);
            if (result.success) {
                loadDocuments();
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const documentTypes = [
        { value: 'INVOICE', label: 'فاتورة تجارية' },
        { value: 'BL', label: 'بوليصة شحن (B/L)' },
        { value: 'PACKING_LIST', label: 'قائمة تعبئة' },
        { value: 'CERTIFICATE_ORIGIN', label: 'شهادة منشأ' },
        { value: 'CUSTOMS_DECLARATION', label: 'بيان جمركي' },
        { value: 'INSURANCE', label: 'بوليصة تأمين' },
        { value: 'OTHER', label: 'أخرى' }
    ];

    return (
        <div className="space-y-4" dir="rtl">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">المستندات المرفقة</h3>
                {!readonly && !isAdding && (
                    <Button onClick={() => setIsAdding(true)} className="gap-2">
                        <Plus size={16} />
                        إضافة مستند
                    </Button>
                )}
            </div>

            {isAdding && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>نوع المستند</Label>
                                <Select
                                    value={formData.document_type}
                                    onChange={(e: any) => setFormData({ ...formData, document_type: e.target.value })}
                                >
                                    {documentTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <Label>اسم الملف</Label>
                                <Input
                                    placeholder="مثال: فاتورة_رقم_123.pdf"
                                    value={formData.file_name}
                                    onChange={(e: any) => setFormData({ ...formData, file_name: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label>ملاحظات</Label>
                                <Input
                                    placeholder="ملاحظات إضافية عن المستند..."
                                    value={formData.notes}
                                    onChange={(e: any) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsAdding(false)}>إلغاء</Button>
                            <Button onClick={handleSave} disabled={loading}>حفظ المستند</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-3">
                {loading && documents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">جاري تحميل المستندات...</div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                        <Upload size={48} className="mb-4 opacity-20" />
                        <p>لا توجد مستندات مرفقة لهذه الشحنة</p>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <File size={24} />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-900">{doc.file_name}</div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                            {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(doc.upload_date).toLocaleDateString('ar-EG')}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                    {doc.notes && <div className="text-xs text-slate-500 mt-2 italic">{doc.notes}</div>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" className="p-2 h-auto text-blue-600">
                                    <Eye size={18} />
                                </Button>
                                <Button variant="ghost" className="p-2 h-auto text-slate-600">
                                    <Download size={18} />
                                </Button>
                                {!readonly && (
                                    <Button variant="ghost" onClick={() => handleDelete(doc.id)} className="p-2 h-auto text-red-600 hover:bg-red-50">
                                        <Trash2 size={18} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg flex gap-3">
                <AlertCircle className="text-yellow-600 shrink-0" size={20} />
                <p className="text-sm text-yellow-800">
                    ملاحظة: يتم تخزين المستندات في مسار العرض الافتراضي، للوصول للملفات الأصلية يرجى مراجعة إدارة تقنية المعلومات.
                </p>
            </div>
        </div>
    );
};

export default DocumentUploadComponent;
