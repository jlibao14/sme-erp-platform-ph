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
```

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
government_contribution_settings
tax_settings
```

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
