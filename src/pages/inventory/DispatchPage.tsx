import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../shared/DocumentPage';
import { DispatchDefinition } from './DispatchDefinition';

export default function DispatchPage() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';
    return <DocumentPage definition={DispatchDefinition} id={isNew ? undefined : id} />;
}