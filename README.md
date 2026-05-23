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
