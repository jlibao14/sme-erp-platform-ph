# Claude Master Prompt

Use this prompt to instruct Claude to design and develop the ERP web and mobile applications.

```text
You are a senior software architect, full-stack engineer, mobile app engineer, ERP consultant, cloud architect, UI/UX designer, and technical documentation specialist.

Your task is to design and develop a complete ERP platform for small to medium companies in the Philippines.

The platform must include:
1. Web application
2. Mobile application
3. Backend API
4. Database schema
5. Authentication and authorization
6. Multi-tenant SaaS architecture
7. ERP business modules
8. Reporting dashboards
9. Audit logs
10. Approval workflows
11. Philippine business compliance readiness
12. API documentation
13. UI/UX design specifications
14. Mobile app design specifications
15. Deployment architecture
16. Security standards
17. Testing plan
18. Development roadmap

Design the system using a practical, scalable, and maintainable architecture suitable for a real commercial SaaS ERP product.

Prioritize clean architecture, modular design, strong security, data integrity, performance, maintainability, and business usability.

Do not produce generic descriptions only. Provide concrete technical specifications, database tables, API endpoints, user flows, UI screen designs, folder structures, implementation steps, validation rules, and acceptance criteria.

Assume the target clients are Philippine SMEs such as trading companies, distributors, retailers, service companies, logistics firms, construction suppliers, and light manufacturing businesses.

The system must be designed for commercial use and future expansion.
```

## First Claude Instruction

```text
Design the complete technical architecture for the SME ERP Platform PH.

Start by producing:
1. System overview
2. SaaS multi-tenant architecture
3. Web app architecture
4. Mobile app architecture
5. Backend architecture
6. Database architecture
7. Module breakdown
8. Security model
9. Deployment model
10. Development roadmap

Do not start coding yet. First produce the full architecture and confirm the recommended structure.

After that, proceed module by module.
```

## Second Claude Instruction

```text
Now generate the complete database schema for the ERP platform using PostgreSQL and Prisma.

Include:
1. Tenant tables
2. User and role tables
3. Company setup tables
4. Finance tables
5. Sales tables
6. Procurement tables
7. Inventory tables
8. HRIS tables
9. Payroll tables
10. Approval workflow tables
11. Notification tables
12. Audit log tables
13. Subscription billing tables

Apply tenant_id to all tenant-owned tables.

Use UUID primary keys.

Include indexes, foreign keys, status fields, timestamps, soft-delete fields, and audit-related fields.

Do not hard-delete financial, payroll, or inventory transactions.
```

## Third Claude Instruction

```text
Now generate the backend API specification using NestJS.

For every module, provide:
1. Controller routes
2. DTOs
3. Services
4. Guards
5. Permission checks
6. Validation rules
7. Error responses
8. Sample request and response payloads

Use this API format:

/api/v1/{module}/{resource}

Include authentication, authorization, tenant validation, audit logging, pagination, filtering, sorting, and export support.
```

## Fourth Claude Instruction

```text
Now generate the web application design using Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

Include:
1. Folder structure
2. Page routes
3. Layout components
4. Dashboard components
5. Data table components
6. Form components
7. Authentication pages
8. ERP module pages
9. Role-based menu visibility
10. Responsive design behavior

Design the UI as a modern SaaS dashboard for Philippine SME owners, managers, finance teams, sales teams, HR teams, and warehouse users.
```

## Fifth Claude Instruction

```text
Now generate the mobile application design using Flutter.

Include:
1. Folder structure
2. Authentication flow
3. Mobile dashboard
4. Approval inbox
5. Inventory scanner
6. Stock count
7. Sales order creation
8. Delivery confirmation
9. Attendance
10. Leave request
11. Payslip viewer
12. Offline sync design
13. Push notification design
14. API service layer
15. Local database structure

Prioritize mobile usability, speed, simple navigation, offline support, and secure access.
```

## Sixth Claude Instruction

```text
Now generate the initial codebase scaffold.

Create:
1. Monorepo structure
2. Backend NestJS base project
3. Prisma schema starter
4. Authentication module
5. Tenant module
6. User module
7. Role and permission module
8. Audit log module
9. Web Next.js base project
10. Dashboard layout
11. Flutter mobile base project
12. Docker Compose setup
13. Environment variable templates
14. README setup instructions

Prioritize clean, maintainable, production-ready structure.
```
