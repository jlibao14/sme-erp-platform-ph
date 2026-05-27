# SME ERP Platform PH

A cloud-based, multi-tenant ERP platform designed for Philippine small to medium enterprises.  
The platform is intended to support both Web and Mobile applications.

## Core Objective

Build a commercial SaaS ERP system for Philippine SMEs covering:

- Finance and Accounting
- Sales and CRM
- Procurement
- Inventory and Warehouse
- HRIS and Payroll
- Approval Workflows
- Reports and Dashboards
- Audit Logs
- Notifications
- AI-assisted business insights

## Target Users

- Business Owners / CEOs
- Finance Managers
- Accountants
- Sales Managers
- Sales Staff
- Procurement Officers
- Warehouse Managers
- Warehouse Staff
- HR Managers
- Payroll Officers
- Employees
- Auditors
- SaaS Platform Administrators

## Recommended Stack

### Web
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Recharts
- TanStack Table

### Mobile
- Flutter
- Dart
- Riverpod or Bloc
- SQLite / Hive
- Firebase Cloud Messaging

### Backend
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- S3-compatible object storage

### Infrastructure
- Docker
- GitHub Actions
- Managed PostgreSQL
- Redis
- Nginx
- SSL
- Monitoring with Grafana / Sentry / Prometheus

## Repository Structure

```text
apps/
  web/
  mobile/
  api/

packages/
  shared-types/
  validation/
  ui/

docs/
  architecture.md
  claude-master-prompt.md
  database-schema.md
  api-specification.md
  module-breakdown.md
  web-mobile-requirements.md
  security.md
  deployment.md
  testing.md
  roadmap.md
```

## MVP Priority

1. Multi-tenant foundation
2. Authentication and RBAC
3. Company setup
4. Customer and supplier master files
5. Product and inventory module
6. Sales module
7. Procurement module
8. Basic finance module
9. Approval workflow
10. Reports dashboard
11. Mobile approvals and inventory
12. HRIS and payroll
13. AI assistant and advanced analytics

## Local Development

### Prerequisites
- Node.js 20+, pnpm 9+
- PostgreSQL 16 (Docker: `docker compose up -d postgres`)

### Backend (apps/api) setup

```bash
pnpm install

# Run migrations as a privileged role (owner/superuser):
cd apps/api
DATABASE_URL="postgresql://OWNER:PASS@localhost:5432/sme_erp_db" pnpm prisma:migrate

# Apply the RLS / constraints / append-only SQL (one-time, and after schema changes):
DATABASE_URL="postgresql://OWNER:PASS@localhost:5432/sme_erp_db" pnpm prisma:migrate:manual

# Seed the global permission catalogue + a demo tenant/admin:
DATABASE_URL="postgresql://OWNER:PASS@localhost:5432/sme_erp_db" pnpm prisma:seed

# Run the API under a NON-superuser role so Row-Level Security is enforced:
DATABASE_URL="postgresql://sme_erp_app:PASS@localhost:5432/sme_erp_db" pnpm --filter @sme-erp/api dev
```

API docs (OpenAPI/Swagger) are served at `http://localhost:4000/api/docs`
(raw spec at `/api/docs-json`). Demo login: tenant `demo`, `admin@demo.test` / `Admin123!`.

### Tests

```bash
pnpm --filter @sme-erp/api test        # unit
DATABASE_URL="postgresql://sme_erp_app:PASS@localhost:5432/sme_erp_db" \
  pnpm --filter @sme-erp/api test:e2e  # e2e (needs a migrated+seeded DB, app role)
```

CI (`.github/workflows/ci.yml`) runs lint, build, unit tests, and the full e2e
suite against a real Postgres with RLS enforced.

## Implemented (v1 foundation)

- Multi-tenant schema with Postgres Row-Level Security (defence-in-depth isolation)
- Auth: login, JWT access + rotating refresh tokens, logout, password reset,
  invitation acceptance, email verification, `/me`
- RBAC: permission catalogue, roles, role-permission and user-role assignment,
  `@RequirePermissions` enforcement
- User management: invite, list/search, update, activate/deactivate, soft-delete
- Organization: company, branch, and department CRUD
- Standard response envelope, global error handling, pagination, audit logging
