import React, { useMemo, useState } from 'react';
import { Archive, Search, UploadCloud, FileText, Sparkles } from 'lucide-react';

interface ArchivedDocument {
    id: string;
    title: string;
    category: string;
    fileName: string;
    uploadedAt: string;
    status: 'Indexed' | 'Pending' | 'Ready';
}

export const SmartArchive = () => {
    const [search, setSearch] = useState('');
    const [archiveList, setArchiveList] = useState<ArchivedDocument[]>([
        { id: 'A001', title: 'فاتورة مشتريات 2026', category: 'المشتريات', fileName: 'purchase_2026.pdf', uploadedAt: '2026-04-10 14:18', status: 'Indexed' },
        { id: 'A002', title: 'سند صرف نقدية', category: 'الخزينة', fileName: 'cash_payment.pdf', uploadedAt: '2026-04-12 09:05', status: 'Ready' },
        { id: 'A003', title: 'عقد مورد', category: 'الموردين', fileName: 'vendor_contract.pdf', uploadedAt: '2026-04-13 16:40', status: 'Pending' },
    ]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadNote, setUploadNote] = useState('');
    const [tags, setTags] = useState('');

    const filteredArchive = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return archiveList;
        return archiveList.filter(doc =>
            doc.title.toLowerCase().includes(q) ||
            doc.category.toLowerCase().includes(q) ||
            doc.fileName.toLowerCase().includes(q)
        );
    }, [search, archiveList]);

    const handleUpload = () => {
        if (!selectedFile) return;
        const newDoc: ArchivedDocument = {
            id: `A${(archiveList.length + 1).toString().padStart(3, '0')}`,
            title: uploadNote || selectedFile.name,
            category: 'غير مصنفة',
            fileName: selectedFile.name,
            uploadedAt: new Date().toLocaleString('ar-EG'),
            status: 'Pending',
        };
        setArchiveList([newDoc, ...archiveList]);
        setSelectedFile(null);
        setUploadNote('');
        setTags('');
    };

    return (
        <div className="app-page h-full flex flex-col" dir="rtl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
                            <Archive size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">الأرشفة الذكية</h1>
                            <p className="text-sm text-gray-600">أرشفة المستندات، الفواتير، والسجلات مع تصنيف ذكي ومتابعة الحالة.</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Sparkles className="text-yellow-500" />
                    <span className="text-sm text-gray-500">يمكنك الآن استعراض الأرشيف وتحميل مستندات جديدة بسهولة.</span>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
                <div className="card p-6">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-bold text-lg text-gray-800">بحث في الأرشيف</h2>
                            <p className="text-sm text-gray-500">ابحث عن المستندات حسب العنوان أو الفئة أو اسم الملف.</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-600">
                            <Search size={18} /> {filteredArchive.length} مستندات
                        </div>
                    </div>
                    <input
                        className="w-full border rounded-lg p-3 bg-white"
                        placeholder="ابحث عن مستند..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="mt-6 overflow-auto max-h-[420px]">
                        {filteredArchive.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                                لا توجد مستندات تطابق البحث.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredArchive.map(doc => (
                                    <div key={doc.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="font-bold text-gray-800">{doc.title}</div>
                                                <div className="text-xs text-gray-500">{doc.category} · {doc.uploadedAt}</div>
                                            </div>
                                            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${doc.status === 'Ready' ? 'bg-emerald-100 text-emerald-700' : doc.status === 'Indexed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {doc.status}
                                            </div>
                                        </div>
                                        <div className="mt-3 text-sm text-gray-600">اسم الملف: {doc.fileName}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="card p-6">
                    <h2 className="font-bold text-lg text-gray-800 mb-4">تحميل وإدخال مستند جديد</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">اختر ملف</label>
                            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-gray-600 hover:border-indigo-500 hover:text-indigo-700">
                                <span>{selectedFile ? selectedFile.name : 'اسحب الملف هنا أو انقر للاختيار'}</span>
                                <UploadCloud size={24} />
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">وصف المستند</label>
                            <input
                                className="w-full border rounded-lg p-3 bg-white"
                                placeholder="اكتب عنوان أو وصف المستند"
                                value={uploadNote}
                                onChange={(e) => setUploadNote(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">علامات ذكية</label>
                            <input
                                className="w-full border rounded-lg p-3 bg-white"
                                placeholder="مثال: فاتورة, مورد, خزينة"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 mt-2">سيتم استخدام هذه العلامات لتصنيف المستندات تلقائياً في البحث.</p>
                        </div>
                        <button
                            className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-white font-bold hover:bg-indigo-700"
                            onClick={handleUpload}
                            disabled={!selectedFile}
                        >
                            حفظ المستند في الأرشيف الذكي
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6 card p-6 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100">
                <div className="flex items-start gap-4">
                    <FileText size={24} className="text-indigo-600" />
                    <div>
                        <h3 className="font-bold text-gray-800">لماذا الأرشفة الذكية مهمة؟</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            تسمح لك بأرشفة المستندات الواردة والصادرة تلقائياً مع إمكانية البحث الذكي عبر العناوين، الفئات، والأرقام المرجعية.
                            يمكن ربطها لاحقاً بالفواتير، وسندات الصرف، وأوراق العمل لضمان توفر المستند مع كل معاملة.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};