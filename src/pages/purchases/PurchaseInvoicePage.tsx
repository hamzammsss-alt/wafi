import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../shared/DocumentPage';
import { PurchaseInvoiceDefinition } from './PurchaseInvoiceDefinition';

export default function PurchaseInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';
    return <DocumentPage definition={PurchaseInvoiceDefinition} id={isNew ? undefined : id} />;
}

