import React, { useState, useEffect } from 'react';
import { SalesTransactionForm } from '../../../components/sales/SalesTransactionForm';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export const SalesOrderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const quotationId = searchParams.get('quotation_id');

    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const api = (window as any).electronAPI?.sales;

    useEffect(() => {
        if (id && id !== 'new') {
            loadOrder();
        } else if (quotationId) {
            loadQuotationForConversion();
        }
    }, [id, quotationId]);

    const loadOrder = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getOrder(id);
            setInitialData(data);
        } catch (error) {
            console.error("Failed to load order", error);
        } finally {
            setLoading(false);
        }
    };

    const loadQuotationForConversion = async () => {
        if (!api) return;
        setLoading(true);
        try {
            // Re-use API to get q data for pre-filling
            const data = await api.getQuotation(quotationId);
            if (data) {
                // Ensure field mapping is clean for new Order
                setInitialData({
                    header: {
                        ...data.header,
                        quotation_id: quotationId, // Link original
                        order_no: '', // Reset No
                        date: new Date().toISOString().split('T')[0], // Reset Date
                        status: 'CONFIRMED'
                    },
                    lines: data.lines.map((l: any) => ({
                        ...l,
                        id: Date.now() + Math.random(), // New Line IDs
                        order_id: '' // Clear link
                    }))
                });
            }
        } catch (error) {
            console.error("Failed to load quotation for conversion", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data: any) => {
        setLoading(true);
        try {
            if (id && id !== 'new') {
                alert("Update not fully implemented. Creating new as fallback/demo.");
            }

            const result = await api.createOrder(data);
            if (result.success) {
                navigate('/sales/orders');
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (id && id !== 'new' && !initialData) return <div>Loading...</div>;

    return (
        <SalesTransactionForm
            type="ORDER"
            title={id === 'new' ? (quotationId ? 'تحويل عرض سعر لطلبية' : 'طلبية جديدة') : `طلبية ${initialData?.header?.order_no}`}
            initialData={initialData}
            onSubmit={handleSubmit}
            loading={loading}
        />
    );
};
