import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';

const CertificateOfOrigin = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);

    useEffect(() => {
        if (id) loadData();
        loadCompany();
    }, [id]);

    const loadData = async () => {
        try {
            const data = await window.electronAPI.export.getShipment(id!);
            setShipment(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadCompany = async () => {
        try {
            const settings = await window.electronAPI.system.getSettings();
            setCompany(settings);
        } catch (e) {
            console.error(e);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!shipment) return <div className="p-10 text-center">Loading...</div>;

    const items = shipment.items || [];
    const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    // Simplified description
    const goodsDescription = items.map((i: any) => i.item_name).join(', ').substring(0, 200) + (items.length > 5 ? '...' : '');

    return (
        <div className="min-h-screen bg-slate-100 p-8 font-sans print:p-0 print:bg-white text-slate-900">
            {/* Toolbar */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:bg-white px-4 py-2 rounded-lg transition-colors">
                    <ArrowRight className="w-5 h-5" />
                    Back
                </button>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Print COO
                    </button>
                </div>
            </div>

            {/* Document Frame */}
            <div className="max-w-[21cm] mx-auto bg-white min-h-[29.7cm] shadow-md border border-slate-200 p-8 print:shadow-none print:border-0 print:p-0 relative">

                {/* Border Pattern */}
                <div className="absolute inset-4 border-4 border-double border-slate-800 pointer-events-none"></div>

                <div className="relative p-6 h-full flex flex-col">

                    <h1 className="text-3xl font-serif font-bold text-center mb-8 uppercase tracking-widest">Certificate of Origin</h1>

                    <div className="grid grid-cols-2 gap-0 border border-slate-800 flex-1">

                        {/* 1. Exporter */}
                        <div className="border-b border-r border-slate-800 p-4 min-h-[150px]">
                            <span className="block text-xs font-bold uppercase mb-2">1. Exporter (Name & Address)</span>
                            <div className="text-sm">
                                <p className="font-bold">{company?.company_name_en}</p>
                                <p className="whitespace-pre-line">{company?.address_en}</p>
                            </div>
                        </div>

                        {/* 2. Certificate No */}
                        <div className="border-b border-slate-800 p-4">
                            <span className="block text-xs font-bold uppercase mb-2">Reference No.</span>
                            <p className="text-xl font-mono font-bold">{shipment.shipment_no}</p>
                        </div>

                        {/* 3. Consignee */}
                        <div className="border-b border-r border-slate-800 p-4 min-h-[150px]">
                            <span className="block text-xs font-bold uppercase mb-2">2. Consignee (Name & Address)</span>
                            <div className="text-sm">
                                <p className="font-bold">{shipment.customer_name}</p>
                                <p className="whitespace-pre-line">{shipment.customer_address}</p>
                                <p>{shipment.destination_country}</p>
                            </div>
                        </div>

                        {/* 4. Transport */}
                        <div className="border-b border-slate-800 p-4">
                            <span className="block text-xs font-bold uppercase mb-2">3. Transport Details</span>
                            <p className="text-sm">By Truck / {shipment.vehicle_no}</p>
                            <p className="text-sm mt-1">From: {shipment.port_of_loading}</p>
                            <p className="text-sm">To: {shipment.port_of_discharge}</p>
                        </div>

                        {/* 5. Remarks */}
                        <div className="col-span-2 border-b border-slate-800 p-4 min-h-[100px]">
                            <span className="block text-xs font-bold uppercase mb-2">4. Remarks</span>
                            <p className="text-sm">{shipment.notes}</p>
                        </div>

                        {/* 6. Goods */}
                        <div className="col-span-2 border-b border-slate-800 flex min-h-[300px]">
                            <div className="w-16 border-r border-slate-800 p-2 text-center text-xs font-bold">5. Item No.</div>
                            <div className="w-32 border-r border-slate-800 p-2 text-center text-xs font-bold">6. Marks & Numbers</div>
                            <div className="flex-1 border-r border-slate-800 p-2 text-center text-xs font-bold">7. Number and kind of packages; Description of goods</div>
                            <div className="w-24 border-r border-slate-800 p-2 text-center text-xs font-bold">8. Origin Criterion</div>
                            <div className="w-24 border-r border-slate-800 p-2 text-center text-xs font-bold">9. Gross Weight</div>
                            <div className="w-24 p-2 text-center text-xs font-bold">10. Number & Date of Invoices</div>
                        </div>

                        {/* Actual Data Row (Simulated as one big block for freedom) */}
                        <div className="col-span-2 -mt-[250px] flex px-0 pointer-events-none">
                            <div className="w-16 p-2 text-center text-sm pt-4">1</div>
                            <div className="w-32 p-2 text-center text-sm pt-4">N/A</div>
                            <div className="flex-1 p-2 text-left text-sm pt-4 whitespace-pre-wrap">
                                {items.length} Packages containing:
                                {'\n\n'}
                                {goodsDescription}
                                {'\n\n'}
                                Total Quantity: {totalQty} Units
                            </div>
                            <div className="w-24 p-2 text-center text-sm pt-4">Palestine</div>
                            <div className="w-24 p-2 text-center text-sm pt-4">{(totalQty * 0.5).toFixed(2)} KG</div>
                            <div className="w-24 p-2 text-center text-sm pt-4">
                                {shipment.invoice_no}
                                {'\n'}
                                {shipment.loading_date}
                            </div>
                        </div>


                        {/* 11. Declaration */}
                        <div className="border-r border-slate-800 p-4 min-h-[150px]">
                            <span className="block text-xs font-bold uppercase mb-4">11. Declaration by the Exporter</span>
                            <p className="text-xs text-justify leading-tight mb-8">
                                The undersigned hereby declares that the above details and statements are correct; that all the goods were produced in
                                <b className="mx-1 uppercase">PALESTINE</b>
                                and that they comply with the origin requirements specified for those goods in the Agreement with the importing country.
                            </p>
                            <div className="mt-8 border-t border-dotted border-slate-400 pt-2 flex justify-between text-xs">
                                <span>Place and Date</span>
                                <span>Signature of authorized signatory</span>
                            </div>
                        </div>

                        {/* 12. Certification */}
                        <div className="p-4 min-h-[150px]">
                            <span className="block text-xs font-bold uppercase mb-4">12. Certification</span>
                            <p className="text-xs text-justify leading-tight mb-8">
                                It is hereby certified, on the basis of control carried out, that the declaration by the exporter is correct.
                            </p>
                            <div className="mt-12 text-center">
                                <span className="block border-t border-dotted border-slate-400 pt-2 text-xs w-32 mx-auto">Stamp</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateOfOrigin;
