import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../shared/DocumentPage';
import { JournalVoucherDefinition } from './JournalVoucherDefinition';

export default function JournalVoucherPage() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';
    return <DocumentPage definition={JournalVoucherDefinition} id={isNew ? undefined : id} />;
}

