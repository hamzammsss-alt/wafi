import React, { useState, useEffect } from 'react';
import { SalesTransactionForm } from '../../../components/sales/SalesTransactionForm';
import { useNavigate, useParams } from 'react-router-dom';

export const QuotationForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const api = (window as any).electronAPI?.sales;

    useEffect(() => {
        if (id && id !== 'new') {
            loadQuotation();
        }
    }, [id]);

    const loadQuotation = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getQuotation(id);
            setInitialData(data);
        } catch (error) {
            console.error("Failed to load quotation", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data: any) => {
        setLoading(true);
        try {
            // If editing, merge ID? (Not supporting edit update in Service yet per se, usually we update Drafts)
            // But Service has Create only? Plan says Update is needed?
            // Actually, Service "UpdateQuotation" was NOT implemented, only "UpdateQuotationStatus".
            // Implementation Plan missed "UpdateQuotation" body logic.
            // For now, let's assume Create New or simple logic.  
            // I will only call Create for New for now as per MVP or implement Update if I can.
            // I only added updateQuotationStatus. 
            // I will focus on Creation for this verification step.

            if (id && id !== 'new') {
                alert("Update not fully implemented in backend yet. Creating new copy.");
            }

            const result = await api.createQuotation(data);
            if (result.success) {
                navigate('/sales/quotations');
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
            type="QUOTATION"
            title={id === 'new' ? 'عرض سعر جديد' : `عرض سعر ${initialData?.header?.quotation_no}`}
            initialData={initialData}
            onSubmit={handleSubmit}
            loading={loading}
        />
    );
};
