# Web and Mobile App Requirements

## Web Application

### Framework
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Layout Requirements

The web app must include:

- Left sidebar navigation
- Top header bar
- Global search
- Notification icon
- User profile menu
- Tenant/company selector
- Breadcrumbs
- Main content area
- Responsive data tables
- Dashboard cards
- Light and dark mode support

### Required Web Screens

1. Login
2. Forgot Password
3. Main Dashboard
4. Company Setup
5. Branch Management
6. User Management
7. Role and Permission Management
8. Customer List
9. Customer Profile
10. Supplier List
11. Supplier Profile
12. Product List
13. Product Profile
14. Warehouse Dashboard
15. Inventory Transactions
16. Sales Quotation
17. Sales Order
18. Sales Invoice
19. Purchase Request
20. Purchase Order
21. Goods Receipt
22. Journal Entry
23. Chart of Accounts
24. Employee List
25. Employee Profile
26. Attendance
27. Leave Requests
28. Payroll Run
29. Payslip
30. Approval Inbox
31. Reports Dashboard
32. Audit Logs
33. Settings

## Mobile Application

### Framework
- Flutter
- Dart
- Riverpod or Bloc
- SQLite or Hive
- Firebase Cloud Messaging

### Required Mobile Screens

1. Login
2. Mobile Dashboard
3. Approval Inbox
4. Sales Order Creation
5. Customer Lookup
6. Inventory Lookup
7. Barcode / QR Scanner
8. Stock Receiving
9. Stock Transfer
10. Stock Count
11. Delivery Confirmation
12. Attendance Check-in / Check-out
13. Leave Request
14. Payslip Viewer
15. Notifications
16. Profile

### Mobile-Specific Requirements

- Biometric login-ready
- Push notifications
- Offline mode for warehouse transactions
- Local data sync
- Camera support for receipts and delivery proof
- QR/barcode scanning
- GPS capture for attendance, optional
- Simple one-hand operation
- Low-bandwidth friendly

## Offline Sync Rules

Offline supported workflows:

1. Inventory count
2. Stock transfer draft
3. Delivery confirmation
4. Sales order draft
5. Attendance logs

Conflict handling:

1. Use last-write-wins only for non-financial drafts.
2. Require manual review for inventory conflicts.
3. Never auto-post financial transactions from offline mode without validation.
4. Show sync status to the user.
