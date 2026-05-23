# API Specification

## API Standard

```text
/api/v1/{module}/{resource}
```

Example:

```text
GET    /api/v1/sales/customers
POST   /api/v1/sales/customers
GET    /api/v1/sales/customers/:id
PATCH  /api/v1/sales/customers/:id
DELETE /api/v1/sales/customers/:id
```

## Standard Success Response

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

## Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## List Endpoint Requirements

Every list endpoint must support:

```text
pagination
search
sorting
filtering
date range filter
status filter
export option
```

Example:

```text
GET /api/v1/inventory/products?page=1&limit=20&search=laptop&status=active
```

## Auth Endpoints

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
GET  /api/v1/auth/me
```

## Tenant and Company Endpoints

```text
GET    /api/v1/tenants
POST   /api/v1/tenants
GET    /api/v1/tenants/:id
PATCH  /api/v1/tenants/:id

GET    /api/v1/companies
POST   /api/v1/companies
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id

GET    /api/v1/branches
POST   /api/v1/branches
PATCH  /api/v1/branches/:id
```

## Sales Endpoints

```text
GET    /api/v1/sales/customers
POST   /api/v1/sales/customers
GET    /api/v1/sales/quotations
POST   /api/v1/sales/quotations
POST   /api/v1/sales/quotations/:id/approve
POST   /api/v1/sales/quotations/:id/convert-to-order
GET    /api/v1/sales/orders
POST   /api/v1/sales/orders
GET    /api/v1/sales/invoices
POST   /api/v1/sales/invoices
POST   /api/v1/sales/invoices/:id/post
POST   /api/v1/sales/invoices/:id/void
POST   /api/v1/sales/payments
```

## Procurement Endpoints

```text
GET    /api/v1/procurement/suppliers
POST   /api/v1/procurement/suppliers
GET    /api/v1/procurement/purchase-requests
POST   /api/v1/procurement/purchase-requests
POST   /api/v1/procurement/purchase-requests/:id/approve
GET    /api/v1/procurement/purchase-orders
POST   /api/v1/procurement/purchase-orders
GET    /api/v1/procurement/goods-receipts
POST   /api/v1/procurement/goods-receipts
GET    /api/v1/procurement/supplier-invoices
POST   /api/v1/procurement/supplier-invoices
POST   /api/v1/procurement/supplier-payments
```

## Inventory Endpoints

```text
GET    /api/v1/inventory/products
POST   /api/v1/inventory/products
GET    /api/v1/inventory/warehouses
POST   /api/v1/inventory/warehouses
GET    /api/v1/inventory/balances
GET    /api/v1/inventory/transactions
POST   /api/v1/inventory/stock-transfers
POST   /api/v1/inventory/stock-adjustments
POST   /api/v1/inventory/stock-counts
GET    /api/v1/inventory/reorder-alerts
```

## Finance Endpoints

```text
GET    /api/v1/finance/chart-of-accounts
POST   /api/v1/finance/chart-of-accounts
GET    /api/v1/finance/journal-entries
POST   /api/v1/finance/journal-entries
POST   /api/v1/finance/journal-entries/:id/post
POST   /api/v1/finance/journal-entries/:id/reverse
GET    /api/v1/finance/general-ledger
GET    /api/v1/finance/trial-balance
GET    /api/v1/finance/profit-and-loss
GET    /api/v1/finance/balance-sheet
GET    /api/v1/finance/cash-flow
```

## HRIS and Payroll Endpoints

```text
GET    /api/v1/hr/employees
POST   /api/v1/hr/employees
GET    /api/v1/hr/attendance
POST   /api/v1/hr/attendance
GET    /api/v1/hr/leave-requests
POST   /api/v1/hr/leave-requests
POST   /api/v1/hr/leave-requests/:id/approve

GET    /api/v1/payroll/runs
POST   /api/v1/payroll/runs
POST   /api/v1/payroll/runs/:id/process
POST   /api/v1/payroll/runs/:id/approve
GET    /api/v1/payroll/payslips
GET    /api/v1/payroll/reports/summary
```

## Approval Endpoints

```text
GET  /api/v1/approvals/inbox
POST /api/v1/approvals/:id/approve
POST /api/v1/approvals/:id/reject
POST /api/v1/approvals/:id/resubmit
GET  /api/v1/approvals/history
```

## Audit Log Endpoints

```text
GET /api/v1/audit-logs
GET /api/v1/audit-logs/:id
```
