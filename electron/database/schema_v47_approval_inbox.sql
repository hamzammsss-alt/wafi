-- Approval Inbox View to consolidate pending documents

DROP VIEW IF EXISTS view_approval_inbox;

CREATE VIEW view_approval_inbox AS
SELECT 
    'sales_invoice' as doc_type,
    id as doc_id,
    COALESCE(invoice_no, id) as ref_no,
    date as doc_date,
    COALESCE(created_by, submitted_by, '') as created_by,
    COALESCE(submitted_at, updated_at, created_at) as submitted_at,
    COALESCE(grand_total, 0) as amount,
    status
FROM sales_invoices
WHERE status LIKE 'PENDING_APPROVAL%'

UNION ALL

SELECT 
    'purchase_order' as doc_type,
    id as doc_id,
    COALESCE(order_no, id) as ref_no,
    date as doc_date,
    COALESCE(created_by, submitted_by, '') as created_by,
    COALESCE(submitted_at, created_at) as submitted_at,
    COALESCE(grand_total, 0) as amount,
    status
FROM purchase_orders
WHERE status LIKE 'PENDING_APPROVAL%'

UNION ALL

SELECT 
    'purchase_request' as doc_type,
    id as doc_id,
    COALESCE(request_no, id) as ref_no,
    date as doc_date,
    COALESCE(submitted_by, requester_id, '') as created_by,
    COALESCE(submitted_at, created_at) as submitted_at,
    0 as amount,
    status
FROM purchase_requests
WHERE status LIKE 'PENDING_APPROVAL%';

-- You can add more UNION ALL branches here for other document types as needed.
