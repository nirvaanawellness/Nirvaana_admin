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

### Feb 15, 2026 - CRITICAL: GST-Separated Financial Reporting (P0 Complete)
**This update corrects the fundamental business logic for financial calculations.**

#### Core Business Logic (CORRECTED)
- **Revenue share % is applied ONLY on Base Amount (excluding GST)**
- **GST is tracked separately and settled proportionately**
- **Profit Formula**: `Net Profit = Our Base Share – Expenses` (GST excluded)

#### Settlement Logic
1. Calculate each party's expected BASE share from total base revenue
2. Calculate each party's GST liability based on their base share (Base Share × 18%)
3. Compare Expected Total (Base + GST) with Actual Collected (Gross)
4. Settlement = Expected Total - Actually Collected

#### Reports Page - Complete Overhaul
**7 Summary Cards (GST-Separated)**:
- Base Revenue (Excl. GST)
- GST Collected (18%)
- Gross Revenue (Incl. GST)
- Hotel Base Share (Per contract %)
- Our Base Share (Pre-expense)
- Expenses
- Net Profit (Base Share - Expenses) ✅

**Calculation Logic Info Box**: Explains that revenue share % is applied on Base Amount only

**Sales Report Dialog - Full GST Breakdown**:
- Revenue Breakdown columns: Base, GST, Gross
- Hotel columns: Base Expected, GST Liability, Total Expected, Received
- Nirvaana columns: Base Expected, GST Liability, Total Expected, Received
- Settlement column: Shows "→ Hotel" or "→ Us" with amount
- Detailed explanation section
- Download Excel functionality

**P&L Report Dialog - Three Segments (GST-Aware)**:
- **Segment 1: Selection Based** - Based on current filters (Year, Month, Quarter, Property)
- **Segment 2: Current Period** - Current month only (1st to today)
- **Segment 3: All Time** - Cumulative since business started
- Each segment shows: Base Revenue, GST, Gross Revenue, Hotel/Our Share, Expenses, Net Profit, Transaction count
- Formula explanation with GST-awareness note
- Download Excel functionality

**Charts Updated**:
- Date-wise Line Chart: "Our Base Share" (not revenue) with red X expense markers
- Bar Chart: "Our Base Share vs Expenses by Property"

### Previous Updates (Feb 15, 2026)
- Month timeline scroller for admin dashboard
- Expense tracking system with CRUD
- Login page UI fixes
- Property-wise calculations

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
- `GET/POST /api/expenses` - Expense tracking
- `GET /api/expenses/summary/by-property` - Expense summary
- `DELETE /api/expenses/{id}` - Delete expense
- `GET /api/revenue/property/{id}` - Property revenue report

## Test Credentials
- **Admin**: admin@nirvaana.com / admin123
- **Therapist**: anita@nirvaana.com / therapist123

## Prioritized Backlog

### P0 (Critical) - COMPLETED ✅
- [x] Dashboard month timeline scroller ✅
- [x] Reports page with downloadable reports ✅
- [x] Expense tracking system ✅
- [x] **GST-separated financial reporting logic** ✅

### P1 (High Priority)
- [ ] Admin password change with OTP verification
- [ ] Therapist deactivation flow (status field)

### P2 (Medium Priority)
- [ ] Full analytics dashboard with more graphs (Sales Trends, Pie Charts)
- [ ] Automated monthly closing system

### P3 (Low Priority)
- [ ] Email therapist ID proofs to nirvaanabysunrise@gmail.com
- [ ] Functional SMS/WhatsApp integration (requires user API keys)
- [ ] Remove icon from login page (minor UI fix)

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
│       ├── Login.jsx
│       ├── admin/
│       │   ├── AdminDashboard.jsx (with timeline)
│       │   ├── Reports.jsx (GST-separated) ✅
│       │   ├── Expenses.js
│       │   ├── Properties.js
│       │   ├── Therapists.js
│       │   └── Services.js
│       └── therapist/
│           ├── TherapistDashboard.jsx
│           ├── Attendance.jsx
│           └── ServiceEntry.jsx
└── memory/
    └── PRD.md
```
