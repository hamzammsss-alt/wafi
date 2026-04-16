import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../shared/DocumentPage';
import { ReceiptDefinition } from './ReceiptDefinition';

export default function ReceiptPage() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';
    return <DocumentPage definition={ReceiptDefinition} id={isNew ? undefined : id} />;
}