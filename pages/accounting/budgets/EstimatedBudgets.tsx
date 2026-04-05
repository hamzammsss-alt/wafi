import React from 'react';
import { Budgets } from './Budgets';

// Reusing Budgets component as they are conceptually same in this context (Estimated vs Actual often handled in same/linked views)
// Or we can create a view-only version for "Estimated Budgets" vs "Budget Entry"

export const EstimatedBudgets = () => (
    <Budgets />
);
