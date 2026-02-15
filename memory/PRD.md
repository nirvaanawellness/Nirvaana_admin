# Nirvaana Wellness ERP - Product Requirements Document

## Original Problem Statement
Build a secure, scalable, mobile-first internal operations management application for a spa operations company named Nirvaana Wellness. The system functions as a complete internal Spa Operations ERP, handling property and therapist management, attendance, sales tracking, GST automation, revenue sharing, incentives, monthly settlements, and automated feedback.

## User Personas
- **Super Admin**: Full access to all modules, reporting, user management
- **Therapist**: Access to attendance, service entry, personal performance

## Core Requirements
- Property/Hotel Management (Admin)
- Therapist Onboarding with auto-generated credentials
- Attendance System (Therapist check-in/out)
- Service Entry System with GST (18%) calculation
- Revenue Split Engine based on property agreements
- Target & Incentive System
- Analytics Dashboard with date-based filtering
- Expense Tracking System
- Monthly Closing System
- WhatsApp/SMS Feedback (Mocked)

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: FastAPI, Pydantic
- **Database**: MongoDB
- **Authentication**: JWT
- **Integrations**: Resend (Email), WhatsApp/SMS (Mocked)

## What's Been Implemented

### Feb 15, 2026 - Major Dashboard & Reports Upgrade
- **Admin Dashboard Enhancements**:
  - Month timeline scroller (horizontal navigation across 12 months)
  - Default view shows TODAY's data only
  - Current month click → Month-to-date (1st to today)
  - Past month click → Full month aggregation
  - Reset to Today button for clearing all filters
  - Dynamic date range labels on pie chart
  - Clickable stat cards with detail dialogs
  
- **Reports Module Complete Overhaul** (Updated with Correct Business Logic):
  - Renamed from "Revenue Reports" to "Reports"
  - Filters: Year, Month, Quarter, Property (multi) - **Therapists filter removed**
  - Properties display share percentage (e.g., "Taj Palace Mumbai (50%)")
  - **Correct Profit Calculation Formula**:
    ```
    Net Profit = (Gross Revenue × Our Share %) – Expenses
    ```
  - Property-wise calculation BEFORE aggregation
  - Dynamic share % fetched from property settings
  
  **New Summary Cards**:
  - Gross Revenue (total bookings)
  - Hotel Share (calculated per property %)
  - Our Revenue (Gross - Hotel Share)
  - Expenses
  - Net Profit (Our Revenue - Expenses)
  - Transactions count

  **New Date-wise Line Graph**:
  - Shows "Our Revenue" per date
  - Red X markers on dates with expenses
  - Respects property and date filters
  
  **Property Bar Chart**:
  - Shows "Our Revenue vs Expenses" per property
  - Tooltip shows consistent values (fixed mismatch bug)
  
  **Three Downloadable Reports**:
  1. Sales Report - Revenue split by property share %, settlements & outstanding
  2. Expense Report - Fixed & variable costs grouped by property
  3. P&L Report - Shows calculation breakdown with formula explanation

- **Expense Tracking System**:
  - CRUD API endpoints for expenses
  - Recurring costs (salary, living cost)
  - Ad-hoc costs (marketing, disposables, oils, etc.)
  - Property-wise expense tracking
  - Summary cards (Recurring, Ad-hoc, Total)
  - Filter by property, expense type, date range
  - Excel export

- **Login Page UI Fix**:
  - Updated header styling with gold color
  - Changed subtitle text

### Previous Implementations
- User authentication for Admin and Therapist roles
- Property management (CRUD)
- Therapist onboarding with email credentials
- Service entry with GST calculation
- Basic admin dashboard with statistics
- Revenue distribution tracking (Hotel vs Nirvaana)

## API Endpoints
- `POST /api/auth/login` - User authentication
- `GET/POST /api/properties` - Property management
- `DELETE /api/properties/{id}` - Delete property
- `GET/POST /api/therapists` - Therapist management
- `DELETE /api/therapists/{id}` - Remove therapist
- `GET/POST /api/services` - Service entries (with filters)
- `GET/POST /api/expenses` - Expense tracking (NEW)
- `GET /api/expenses/summary/by-property` - Expense summary (NEW)
- `DELETE /api/expenses/{id}` - Delete expense (NEW)
- `GET /api/revenue/property/{id}` - Property revenue report

## Test Credentials
- **Admin**: admin@nirvaana.com / admin123
- **Therapist**: anita@nirvaana.com / therapist123

## Prioritized Backlog

### P0 (Critical)
- [x] Dashboard month timeline scroller ✅
- [x] Reports page with downloadable reports ✅
- [x] Expense tracking system ✅

### P1 (High Priority)
- [ ] Admin password change with OTP verification
- [ ] Therapist deactivation flow (status field)

### P2 (Medium Priority)
- [ ] Full analytics dashboard with graphs (Sales Trends)
- [ ] Automated monthly closing system

### P3 (Low Priority)
- [ ] Email therapist ID proofs to nirvaanabysunrise@gmail.com
- [ ] Functional SMS/WhatsApp integration (requires user API keys)

## Known Mocked Features
- WhatsApp feedback messages (placeholder)
- SMS notifications (placeholder)

## File Structure
```
/app/
├── backend/
│   ├── server.py (main API)
│   ├── models.py (Pydantic models)
│   ├── auth.py (JWT auth)
│   ├── email_service.py
│   └── whatsapp_service.py (mocked)
├── frontend/
│   └── src/pages/
│       ├── admin/
│       │   ├── Dashboard.jsx (with timeline)
│       │   ├── Reports.jsx (comprehensive)
│       │   ├── Expenses.jsx (NEW)
│       │   ├── Properties.jsx
│       │   ├── Therapists.jsx
│       │   └── Services.jsx
│       └── therapist/
│           ├── Dashboard.jsx
│           ├── Attendance.jsx
│           └── ServiceEntry.jsx
└── memory/
    └── PRD.md
```
