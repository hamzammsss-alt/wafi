import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FileText, Plus, Search, MoreVertical, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProformaInvoice } from '../../types';

export const ProformaInvoiceList: React.FC = () => {
    const navigate = useNavigate();
    const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProformas();
    }, []);

    const loadProformas = async () => {
        try {
            const data = await window.electronAPI.import.getProformas({});
            setProformas(data);
        } catch (error) {
            console.error("Error loading proformas", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConvert = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to convert this Proforma to a Shipment?')) {
            try {
                const result = await window.electronAPI.import.convertProforma(id);
                if (result.success) {
                    alert('Check Shipment Created: ' + result.shipmentNo);
                    navigate(`/import/shipments/${result.shipmentId}`);
                }
            } catch (e) {
                alert('Conversion Failed');
            }
        }
    };

    const filtered = proformas.filter(p =>
        p.proforma_no.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Proforma Invoices</h1>
                    <p className="text-gray-500">Manage supplier offers and convert them to shipments</p>
                </div>
                <button
                    onClick={() => navigate('/import/proformas/new')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <Plus size={18} /> New Proforma
                </button>
            </div>

            <Card>
                <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by number or supplier..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm">
                                <th className="p-4 font-medium">Proforma No</th>
                                <th className="p-4 font-medium">Supplier</th>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Expiry</th>
                                <th className="p-4 font-medium">Currency</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No proformas found.</td></tr>
                            ) : (
                                filtered.map((pf) => (
                                    <tr
                                        key={pf.id}
                                        className="hover:bg-blue-50/50 cursor-pointer group transition-colors"
                                        onClick={() => navigate(`/import/proformas/${pf.id}`)}
                                    >
                                        <td className="p-4 font-medium text-blue-600 group-hover:underline">{pf.proforma_no}</td>
                                        <td className="p-4 text-gray-700">{pf.supplier_name}</td>
                                        <td className="p-4 text-gray-500">{pf.date}</td>
                                        <td className="p-4 text-gray-500">{pf.expiry_date || '-'}</td>
                                        <td className="p-4 text-gray-700 font-medium">{pf.currency_id}</td>
                                        <td className="p-4">
                                            <Badge status={pf.status} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {pf.status === 'DRAFT' && (
                                                    <button
                                                        onClick={(e) => handleConvert(pf.id, e)}
                                                        className="px-3 py-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 rounded-full border border-green-200 flex items-center gap-1"
                                                        title="Convert to Shipment"
                                                    >
                                                        Convert <ArrowRight size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const Badge = ({ status }: { status: string }) => {
    const styles: any = {
        'DRAFT': 'bg-gray-100 text-gray-600',
        'APPROVED': 'bg-blue-100 text-blue-600',
        'CONVERTED': 'bg-green-100 text-green-600',
        'CANCELLED': 'bg-red-100 text-red-600',
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
};
