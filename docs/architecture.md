# Technical Architecture

## Architecture Type

The ERP platform shall use a modular monolith for the MVP with clean boundaries per business module.  
This is more practical for SME SaaS delivery than early microservices.

## High-Level Flow

```text
Web App / Mobile App
        |
        v
Backend API / API Gateway
        |
        v
ERP Core Backend Modules
        |
        v
PostgreSQL + Redis + Object Storage
        |
        v
Monitoring + Logs + Backups
```

## Core Backend Modules

- Auth
- Tenants
- Companies
- Branches
- Users
- Roles and Permissions
- Finance
- Sales
- Procurement
- Inventory
- Warehouse
- HRIS
- Payroll
- Approvals
- Reports
- Notifications
- Audit Logs
- Subscriptions

## Multi-Tenant SaaS Design

Every tenant-owned table must include:

```text
tenant_id
company_id
branch_id, if applicable
created_by
updated_by
created_at
updated_at
deleted_at
status
```

## Tenant Isolation Rules

1. A user can only access records belonging to their tenant.
2. Every API request must validate tenant context.
3. Every database query must be scoped by tenant_id.
4. Super Admin can access platform-wide data.
5. Tenant Admin can only manage their own company.
6. Cross-tenant data leakage must be blocked by middleware, guards, services, and database constraints.

### Enforcement layers

Isolation is enforced at multiple layers so a single bug cannot leak data:

1. **Auth guard** resolves `tenant_id` from the JWT and rejects mismatched contexts.
2. **Service layer** scopes every query by `tenant_id`.
3. **Database (Row-Level Security)** is the backstop: each request runs in a
   transaction that sets `app.current_tenant`, and Postgres RLS policies reject
   any cross-tenant row even when the application forgets to filter. See
   `apps/api/prisma/manual/0001_rls_and_constraints.sql`. The API must
   run under a non-superuser DB role for RLS to take effect.

### API contract

The backend exposes an **OpenAPI** spec (`/api/docs`, raw at `/api/docs-json`)
via `@nestjs/swagger`. This single contract drives both the web client types and
the **Flutter Dart client codegen**, so mobile and web stay in sync with the API.

## Database Strategy

### MVP
Single PostgreSQL database with tenant_id on all tenant-owned tables.

### Enterprise Option
Dedicated database per tenant for premium clients.

## Integration Strategy

The platform should support future integrations with:

- POS systems
- E-commerce platforms
- Payment gateways
- Accounting exports
- Biometric attendance devices
- Bank statement imports
- Courier / logistics APIs
- Government report exports
