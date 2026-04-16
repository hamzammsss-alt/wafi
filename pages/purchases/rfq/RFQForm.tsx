import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../../../src/pages/shared/DocumentPage';
import { RFQDefinition } from './RFQDefinition';

export default function RFQForm() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';

    return <DocumentPage definition={RFQDefinition} id={isNew ? undefined : id} />;
}
