import React, { useState } from 'react';
import { SalesTransactionForm } from '../../../components/sales/SalesTransactionForm';
import { useNavigate } from 'react-router-dom';

export const ReturnInvoice = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const api = (window as any).electronAPI?.sales;

    const handleSubmit = async (data: any) => {
        if (!api) return;
        setLoading(true);
        try {
            console.log("Saving Return Invoice", data);

            const result = await api.createReturn(data);

            if (result.success) {
                // Determine navigation - maybe to a Returns List? 
                // For now, back to Invoice List or stay
                alert("تم حفظ مردود المبيعات بنجاح");
                navigate('/sales/invoices'); // Or /sales/returns if we had a list page
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SalesTransactionForm
            type="SALES_RETURN"
            title="فاتورة مردودات مبيعات (إشعار دائن)"
            initialData={null} // Can implement "Convert Invoice to Return" later
            onSubmit={handleSubmit}
            loading={loading}
        />
    );
};
