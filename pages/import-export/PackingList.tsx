import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';

const PackingList = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState<any>(null);
    const [company, setCompany] = useState<any>(null); // To fetch company details for header

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
    const totalNetWeight = items.reduce((sum: number, item: any) => sum + ((item.unit_weight || 0) * item.quantity), 0);
    // Gross weight approximation (Net + 5%)
    const totalGrossWeight = totalNetWeight * 1.05;
    const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-slate-100 p-8 font-sans print:p-0 print:bg-white text-slate-900">
            {/* Toolbar */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:bg-white px-4 py-2 rounded-lg transition-colors">
                    <ArrowRight className="w-5 h-5" />
                    Back
                </button>
                <div className="flex gap-2">
                    <button onClick={() => navigate(`/export/shipments/${id}`)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm">
                        Edit Shipment
                    </button>
                    <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Print Packing List
                    </button>
                </div>
            </div>

            {/* Document */}
            <div className="max-w-4xl mx-auto bg-white p-12 rounded-xl shadow-sm print:shadow-none print:w-full">
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-8 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">PACKING LIST</h1>
                        <p className="text-slate-500">Document No: PL-{shipment.shipment_no}</p>
                        <p className="text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">{company?.company_name_en || 'Company Name'}</h2>
                        <div className="text-sm text-slate-500 mt-1 whitespace-pre-line">
                            {company?.address_en || 'Address Line 1\nCity, Country'}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Exporter</h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="font-bold text-lg">{company?.company_name_en || 'Our Company'}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-line mt-1">
                                {company?.address_en}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Consignee</h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="font-bold text-lg">{shipment.customer_name}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-line mt-1">
                                {shipment.customer_address || 'Address Not Available'}
                            </p>
                            <p className="text-sm text-slate-600 mt-2">
                                Country: {shipment.destination_country}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-12 border-t border-b border-slate-100 py-6">
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Invoice No.</span>
                        <span className="font-bold text-lg">{shipment.invoice_no || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Port of Loading</span>
                        <span className="font-bold text-lg">{shipment.port_of_loading || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Port of Discharge</span>
                        <span className="font-bold text-lg">{shipment.port_of_discharge || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Loading Date</span>
                        <span className="font-bold text-lg">{shipment.loading_date || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-400 uppercase">Transport / Vehicle</span>
                        <span className="font-bold text-lg">{shipment.vehicle_no || '-'}</span>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead className="border-b-2 border-slate-800">
                        <tr>
                            <th className="py-3 text-left w-12">#</th>
                            <th className="py-3 text-left">Description of Goods</th>
                            <th className="py-3 text-center w-24">HS Code</th>
                            <th className="py-3 text-center w-24">Quantity</th>
                            <th className="py-3 text-center w-32">Unit</th>
                            <th className="py-3 text-right w-32">Net Weight (KG)</th>
                            <th className="py-3 text-right w-32">Gross Weight (KG)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <tr><td colSpan={7} className="py-6 text-center text-gray-400 italic">No Items Linked (Select Invoice in Shipment)</td></tr>
                        ) : (
                            items.map((item: any, i: number) => {
                                const net = (Number(item.quantity) * Number(item.unit_weight || 0));
                                const gross = net * 1.05; // Dummy logic
                                return (
                                    <tr key={i}>
                                        <td className="py-3 text-slate-500">{i + 1}</td>
                                        <td className="py-3 font-medium">{item.item_name} <span className="text-slate-400 text-xs block">{item.item_code}</span></td>
                                        <td className="py-3 text-center text-slate-500">-</td>
                                        <td className="py-3 text-center font-bold">{item.quantity}</td>
                                        <td className="py-3 text-center text-slate-500">{item.unit_id || 'Unit'}</td>
                                        <td className="py-3 text-right tabular-nums">{net > 0 ? net.toFixed(2) : '-'}</td>
                                        <td className="py-3 text-right tabular-nums">{gross > 0 ? gross.toFixed(2) : '-'}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <tr>
                            <td colSpan={3} className="py-4 px-4 text-right">TOTALS</td>
                            <td className="py-4 text-center">{totalQty}</td>
                            <td></td>
                            <td className="py-4 text-right">{totalNetWeight.toFixed(2)} KG</td>
                            <td className="py-4 text-right">{totalGrossWeight.toFixed(2)} KG</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer Signatures */}
                <div className="mt-20 pt-8 border-t border-slate-200 grid grid-cols-2 gap-20">
                    <div>
                        <p className="text-sm font-bold mb-12">Authorized Signature & Stamp</p>
                        <div className="h-0 border-b border-dashed border-slate-300"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackingList;
