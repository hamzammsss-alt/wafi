import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../shared/DocumentPage';
import { SalesInvoiceDefinition } from './SalesInvoiceDefinition';

export default function SalesInvoicePage() {
    const { id } = useParams<{ id: string }>();

    // new check
    const isNew = id === 'new';

    return <DocumentPage definition={SalesInvoiceDefinition} id={isNew ? undefined : id} />;
}
