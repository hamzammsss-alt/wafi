import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentPage from '../shared/DocumentPage';
import { StockTransferDefinition } from './StockTransferDefinition';

export default function StockTransferPage() {
    const { id } = useParams<{ id: string }>();
    const isNew = id === 'new';
    return <DocumentPage definition={StockTransferDefinition} id={isNew ? undefined : id} />;
}

