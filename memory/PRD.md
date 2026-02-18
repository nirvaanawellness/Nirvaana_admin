# Nirvaana Wellness ERP - Product Requirements Document

## Original Problem Statement
Build a secure, scalable, mobile-first internal operations management application for a spa operations company named Nirvaana Wellness. The system functions as a complete internal Spa Operations ERP, handling property and therapist management, attendance, sales tracking, GST automation, revenue sharing, incentives, monthly settlements, and automated feedback.

## User Personas
- **Super Admin**: Full access to all modules, reporting, user management
- **Therapist**: Access to attendance, service entry, personal performance

## Core Requirements
- Property/Hotel Management (Admin) with Ownership Type support
- Therapist Onboarding with auto-generated credentials
- Attendance System (Therapist check-in/out + Admin daily tracking)
- Service Entry System with GST (5%) calculation
- Revenue Split Engine based on property agreements
- Target & Incentive System
- Analytics Dashboard with date-based filtering and revenue forecast
- Expense Tracking System with shared expense distribution
- Monthly Closing System
- Automated Email Feedback (Resend Integration)

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: FastAPI, Pydantic, NumPy
- **Database**: MongoDB
- **Authentication**: JWT, OTP (for password change)
- **Integrations**: Resend (Email - ACTIVE)
- **Deployment**: Vercel (Frontend), Render (Backend)

## What's Been Implemented

### Feb 18, 2026 - Property Ownership Type Feature (P0 Complete)

#### Property Ownership Model
- **Two ownership types**: 
  - `our_property` - 100% owned by Nirvaana
  - `outside_property` - Revenue split with hotel partner
- **Backend**: `OwnershipType` enum in `models.py`, supported in Property model
- **Frontend**: Radio button selection in Add/Edit Property forms

#### Ownership Type Behavior
- **Our Property**:
  - Revenue share % field disabled (shows "Not applicable")
  - Contract Start Date field disabled
  - Green "Owned" badge on property cards
  - Shows "100% Nirvaana" instead of hotel share percentage
  - Sales Report shows "N/A" for Hotel Share, GST Liability, Settlement columns
  - P&L calculations assign 100% revenue to Nirvaana

- **Outside Property** (default):
  - Revenue share % required
  - Orange "Split Model" badge on property cards
  - Full settlement calculations in reports

#### Ownership Change Confirmation
- When editing a property and changing ownership type, a confirmation dialog appears
- Warns user that change affects historical reporting calculations
- Reports are calculated dynamically (no data loss)

#### Improved Bar Chart
- Grouped bar chart with thinner bars, rounded corners
- Custom tooltips showing property details
- Clear legend with color indicators
- Y-axis shows values in "₹Xk" format for readability
- Shows distributed expense note when "Other" expenses are split

#### Shared Expense Allocation
- Expenses with type "other" (not property-specific) are distributed equally
- Distribution happens at report level (not stored in DB)
- Note displayed on chart when distribution is active

### Previous Sessions Summary

#### Session 4 - Deployment & Bug Fixes
- Deployed to Vercel (frontend) and Render (backend)
- Created deployment config files (Procfile, runtime.txt, vercel.json)
- Implemented `/api/auth/init-admin` endpoint
- Added Edit functionality for Properties and Therapists
- Fixed GST rate to 5% (was 18%)
- Fixed email portal URL
- Added Services Excel export
- Updated attendance to 9-hour workday logic

#### Session 3 - Email Integration & Analytics
- Resend email integration (OTP, Welcome, Feedback)
- Analytics dashboard with revenue forecast
- Fixed therapist onboarding response handling

#### Session 2 - Attendance & Archiving
- Admin attendance tracking page
- Soft delete (archiving) for properties and therapists
- OTP-based admin password change
- Settings page

#### Session 1 - GST-Separated Reporting
- Corrected revenue share logic (apply % to BASE only, not gross)
- Sales Report with full GST breakdown
- P&L Report with 3 segments (Selection, Current, All-Time)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/request-otp` - Request OTP for password change (admin)
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/change-password` - Change password with OTP
- `GET /api/auth/init-admin` - Create initial admin user

### Properties
- `GET/POST /api/properties` - Property management (includes ownership_type)
- `PUT /api/properties/{id}` - Update property (including ownership type change)
- `DELETE /api/properties/{id}` - Archive property (soft delete)
- `PUT /api/properties/{id}/restore` - Restore archived property

### Therapists
- `GET/POST /api/therapists` - Therapist management
- `PUT /api/therapists/{id}` - Update therapist
- `DELETE /api/therapists/{id}` - Archive therapist (soft delete)
- `PUT /api/therapists/{id}/restore` - Restore archived therapist

### Attendance (Admin)
- `GET /api/attendance/admin/daily` - Daily attendance log
- `GET /api/attendance/admin/history/{therapist_id}` - Therapist history

### Services & Expenses
- `GET/POST /api/services` - Service entries (with filters)
- `GET/POST /api/expenses` - Expense tracking
- `DELETE /api/expenses/{id}` - Delete expense

### Analytics
- `GET /api/analytics/dashboard` - Dashboard analytics
- `GET /api/analytics/forecast` - Revenue forecast

## Test Credentials
- **Admin**: admin / admin123 (or nirvaanabysunrise@gmail.com / admin123)
- **Therapist**: Created via admin panel

## Prioritized Backlog

### P0 (Critical) - ALL COMPLETED ✅
- [x] Property ownership type feature
- [x] Dynamic reporting based on ownership
- [x] Improved bar chart visualization
- [x] Ownership badges on property cards
- [x] Ownership change confirmation dialog

### P1 (High Priority)
- [x] "Other" expense distribution across properties ✅
- [x] Shared expenses (no property_id) distributed equally ✅

### Feb 18, 2026 - Service Entries & Therapist Reassignment Features

#### Service Entries Page Improvements
- **Property Filter**: Added dropdown to filter services by property
- **Reset Button**: Added reset icon to clear all filters
- **New Columns**: Added Therapist Name, Property Name, City columns
- **Time Fix**: Service time now captured in IST (Indian Standard Time) instead of UTC
- **Excel Export**: Updated to include all new columns

#### Therapist Property Reassignment
- **Email Notification**: When therapist is reassigned to a new property, system sends email with:
  - Same login credentials (unchanged)
  - Old property → New property visual transition
  - Clear instructions about what changes
- **Data Preservation**: Historical services and attendance remain linked to old property
- **Going Forward**: New services and attendance tracked under new property mapping

#### Owned Property Payment Logic
- **Auto-selection**: If therapist is assigned to an "Owned" property:
  - "Payment Received By" automatically defaults to "Nirvaana"
  - No option to change (selection is disabled/hidden)
  - Visual banner shows "Owned Property - Payment to Nirvaana"
- **Backend Validation**: Even if frontend is bypassed, backend enforces nirvaana payment for owned properties

#### Shared Expense Logic
- Expenses without a property_id are treated as "Shared" expenses
- Examples: Website development, software subscriptions, marketing costs
- **Distribution Rule**: Total shared expense ÷ Number of active (non-archived) properties
- Distribution is **calculated dynamically** at report level
- **No database duplication** - original expense entry unchanged

#### UI Changes
- **Expenses Page**: "Shared (All Properties)" option in property dropdown
- Purple badge shows "Shared (All Properties)" in expense table
- Helper text: "Select 'Shared' for expenses that should be distributed across all active properties"

#### Reports Integration
- Bar chart tooltip shows distributed expense per property
- Note below chart: "* Shared expenses (₹X/property) distributed equally across all N active properties"
- P&L calculations include distributed shared expenses in each property's total

### P2 (Medium Priority)
- [ ] Automated monthly closing system
- [ ] SMS backup system for notifications

### P3 (Low Priority)
- [ ] Email therapist ID proofs to admin
- [ ] Functional SMS/WhatsApp integration (requires API keys)

## File Structure
```
/app/
├── backend/
│   ├── server.py (main API - updated for ownership type)
│   ├── models.py (includes OwnershipType enum)
│   ├── auth.py (JWT auth)
│   ├── email_service.py
│   ├── Procfile, runtime.txt (deployment)
│   └── tests/
│       └── test_ownership_type.py (comprehensive tests)
├── frontend/
│   └── src/
│       ├── pages/admin/
│       │   ├── Properties.jsx (ownership selection, badges, confirmation)
│       │   ├── Reports.jsx (ownership-aware calculations, improved chart)
│       │   └── ... other pages
│       └── components/
├── test_reports/
│   └── iteration_5.json (latest test results - 100% pass)
└── memory/
    └── PRD.md
```

## Test Reports
- `/app/test_reports/iteration_5.json` - Latest test results
  - Backend: 100% pass rate (11/11 tests)
  - Frontend: 100% pass rate (All UI features verified)
  - All ownership type features tested and working
