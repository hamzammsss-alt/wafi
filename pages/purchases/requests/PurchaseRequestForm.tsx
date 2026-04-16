import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../../../src/pages/shared/DocumentPage';
import { PurchaseRequestDefinition } from './PurchaseRequestDefinition';

export function PurchaseRequestForm() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';

    return <DocumentPage definition={PurchaseRequestDefinition} id={isNew ? undefined : id} />;
}
