# Database Schema Specification

## General Rules

All major tenant-owned tables must include:

```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
created_by UUID
updated_by UUID
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
status VARCHAR
version INT NOT NULL DEFAULT 0   -- optimistic locking for concurrent edits
```

### Money

All monetary amounts use `DECIMAL(18, 4)` (Prisma `Decimal @db.Decimal(18, 4)`).
Never use float/double — rounding errors are unacceptable in finance/payroll.
Multi-currency tables additionally store `currency_code` and the `fx_rate` used.

### Tenant isolation (defence in depth)

App-layer query scoping is necessary but not sufficient — one forgotten
`WHERE tenant_id = ?` leaks another company's data. All tenant-owned tables also
enforce **Postgres Row-Level Security** (see
`apps/api/prisma/migrations/manual/0001_rls_and_constraints.sql`). Each request
runs inside a transaction that sets `app.current_tenant`; the database rejects
cross-tenant rows even if the application has a bug. Run the API under a
non-superuser role so RLS is actually enforced.

### Soft delete + uniqueness

Natural keys (slug, email, branch code, role name) are unique only **among
non-deleted rows**, enforced by PARTIAL unique indexes
(`... WHERE deleted_at IS NULL`) in the SQL migration above. A plain composite
`UNIQUE` would permanently block reusing a value after soft delete.

### Gapless document numbering

Financial/legal documents (BIR OR/SI, journal entries, payments) require
**gapless, sequential numbers per series** — a `UNIQUE` column does not provide
this and will gap/collide under concurrency. Use a dedicated sequence table:

```sql
document_sequences (
  id, tenant_id, company_id,
  doc_type VARCHAR,     -- SALES_INVOICE | OFFICIAL_RECEIPT | JOURNAL | ...
  series   VARCHAR,
  prefix   VARCHAR,
  next_no  BIGINT,
  UNIQUE (tenant_id, company_id, doc_type, series)
)
```

Allocate the next number with `SELECT ... FOR UPDATE` (or `UPDATE ... RETURNING`)
inside the same transaction that inserts the document.

### Inventory costing

Costing method is **moving weighted average** for the MVP. `inventory_balances`
stores a running `avg_unit_cost`; every posted `inventory_transaction` updates it.
Balances are always derived from the append-only transaction ledger, never
edited directly. (A future FIFO option would require per-receipt cost layers.)

Financial, payroll, and inventory transactions must also include:

```sql
transaction_number VARCHAR UNIQUE
transaction_date DATE
posting_date DATE
approval_status VARCHAR
posted_by UUID
posted_at TIMESTAMP
voided_by UUID
voided_at TIMESTAMP
void_reason TEXT
```

## Core Tables

```text
tenants
companies
branches
departments
users
roles
permissions
role_permissions
user_roles
sessions
subscriptions
subscription_plans
document_sequences
audit_logs
notifications
approval_workflows
approval_steps
approval_requests
approval_request_logs
```

## Master Data Tables

```text
customers
suppliers
products
product_categories
units_of_measure
warehouses
chart_of_accounts
tax_codes
payment_terms
banks
employees
job_positions
cost_centers
```

## Sales Tables

```text
sales_leads
sales_quotations
sales_quotation_items
sales_orders
sales_order_items
sales_invoices
sales_invoice_items
customer_payments
delivery_orders
delivery_order_items
```

## Procurement Tables

```text
purchase_requests
purchase_request_items
purchase_orders
purchase_order_items
goods_receipts
goods_receipt_items
supplier_invoices
supplier_invoice_items
supplier_payments
```

## Inventory Tables

```text
inventory_balances
inventory_transactions
stock_transfers
stock_transfer_items
stock_adjustments
stock_adjustment_items
stock_counts
stock_count_items
reorder_rules
```

## Finance Tables

```text
journal_entries
journal_entry_lines
general_ledger
accounts_receivable
accounts_payable
bank_accounts
bank_transactions
expense_claims
expense_claim_items
financial_periods
```

## HRIS and Payroll Tables

```text
employees
employee_contacts
employee_documents
attendance_logs
leave_types
leave_requests
overtime_requests
payroll_runs
payroll_items
payslips
salary_structures
contribution_tables          -- effective-dated (SSS, PhilHealth, HDMF, withholding)
contribution_brackets        -- bracket rows per contribution_table
tax_settings
```

> Statutory rates change yearly. `contribution_tables` / `contribution_brackets`
> are **effective-dated** (`effective_from` / `effective_to`) so historical
> payroll recomputes correctly and new rates are config, not code. See
> `docs/compliance-ph.md`.

## Indexing Requirements

Add indexes for:

```text
tenant_id
company_id
branch_id
created_at
transaction_date
posting_date
status
approval_status
transaction_number
reference_number
customer_id
supplier_id
product_id
warehouse_id
employee_id
```

## Data Integrity Rules

1. Do not hard-delete financial records.
2. Do not hard-delete payroll records.
3. Do not hard-delete inventory transactions.
4. Use void, cancel, reverse, or soft-delete logic.
5. Journal entries must balance.
6. Inventory stock cannot go negative unless company setting allows it.
7. Approved transactions cannot be modified unless reopened or reversed.
