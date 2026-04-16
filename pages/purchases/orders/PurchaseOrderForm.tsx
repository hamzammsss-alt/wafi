import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../../../src/pages/shared/DocumentPage';
import { PurchaseOrderDefinition } from './PurchaseOrderDefinition';

export function PurchaseOrderForm() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';

    return <DocumentPage definition={PurchaseOrderDefinition} id={isNew ? undefined : id} />;
}
