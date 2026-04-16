import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../../../src/pages/shared/DocumentPage';
import { SalesOrderDefinition } from './SalesOrderDefinition';

export function SalesOrderForm() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';

    return <DocumentPage definition={SalesOrderDefinition} id={isNew ? undefined : id} />;
}
