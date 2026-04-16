import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../../../src/pages/shared/DocumentPage';
import { QuotationDefinition } from './QuotationDefinition';

export function QuotationForm() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';

    return <DocumentPage definition={QuotationDefinition} id={isNew ? undefined : id} />;
}
