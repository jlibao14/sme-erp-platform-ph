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
POST /api/v1/auth/login            # body: { tenantSlug, email, password }
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
POST /api/v1/auth/forgot-password  # body: { tenantSlug, email }
POST /api/v1/auth/reset-password   # body: { token, password }
POST /api/v1/auth/accept-invite    # body: { token, password }
POST /api/v1/auth/verify-email     # body: { token }
GET  /api/v1/auth/me
```

## User and RBAC Endpoints (implemented)

```text
GET    /api/v1/users               # admin.user.view  (paginated, ?search=)
GET    /api/v1/users/:id           # admin.user.view
POST   /api/v1/users               # admin.user.manage (invite)
PATCH  /api/v1/users/:id           # admin.user.manage
PATCH  /api/v1/users/:id/status    # admin.user.manage (ACTIVE | DISABLED)
DELETE /api/v1/users/:id           # admin.user.manage (soft delete)

GET    /api/v1/admin/permissions   # admin.role.manage
GET    /api/v1/admin/roles         # admin.role.manage
POST   /api/v1/admin/roles         # admin.role.manage
PUT    /api/v1/admin/roles/:id/permissions   # admin.role.manage
PUT    /api/v1/admin/users/:userId/roles     # admin.user.manage
```

## Company / Branch / Department Endpoints (implemented)

```text
GET    /api/v1/companies           # authenticated (tenant-scoped)
POST   /api/v1/companies           # admin.company.manage
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id       # admin.company.manage
DELETE /api/v1/companies/:id       # admin.company.manage

GET    /api/v1/branches            # ?companyId=
POST   /api/v1/branches            # admin.branch.manage
GET    /api/v1/branches/:id
PATCH  /api/v1/branches/:id        # admin.branch.manage
DELETE /api/v1/branches/:id        # admin.branch.manage

GET    /api/v1/departments         # ?companyId=
POST   /api/v1/departments         # admin.department.manage
GET    /api/v1/departments/:id
PATCH  /api/v1/departments/:id     # admin.department.manage
DELETE /api/v1/departments/:id     # admin.department.manage
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
