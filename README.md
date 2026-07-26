# StaffPay — Complete Attendance, Payroll & Invoicing System

StaffPay is a modern, full-stack HR tech platform designed for small-to-medium businesses. It simplifies staff attendance tracking, automated payroll generation, PDF/Excel salary statement issuing, invoicing, public payslip verification, and leave management.

---

## 🚀 Features & Architecture Overview

### 1. Attendance & Work Tracking
- **Check-in / Check-out**: 1-tap check-in with automatic late calculation based on customizable company start times.
- **Attendance Management**: Managers can view, filter, and mark daily attendance across team members.
- **Calendar Reports**: Visual monthly calendar grid displaying attendance status, weekends, and paid company holidays.

### 2. Automated Payroll & Payslips
- **Dynamic Salary Computation**: Calculates Gross Earnings, Basic, HRA, Allowances, Overtime, PF, Tax/TDS, Absent deductions, and Unpaid leave deductions.
- **PDF & Excel Exports**: Generates authentic, vector-grade PDF payslips with optional signatures, statutory details, and compact summaries.
- **Auto-Payroll Cron Job**: Runs on the 1st of every month at 06:00 to calculate and email salary statements automatically.
- **Print & Share**: Built-in print styling and 1-tap sharing to WhatsApp, Telegram, Email, or clipboard.

### 3. Public Payslip Verification Portal
- **Verification at `/verify`**: Third parties (banks, recruiters, employees) can verify any slip's authenticity using its unique serial number (e.g., `PSL-202606-003`).

### 4. Leave Workflow & Quotas
- **Leave Requests**: Apply for casual, sick, or unpaid leave.
- **Manager Approval**: Approved leave automatically syncs into attendance without overwriting days worked.
- **Leave Balances**: Enforces annual quotas (e.g., 12 casual, 8 sick) with live balance cards.

### 5. PDF Layout Studio & Customization
- **Admin Document Control**: Toggle exact sections printed on PDF/HTML payslips & invoices (e.g., tagline, tax IDs, statutory block, breakdown tables, net pay in words, attendance strip, signature block, verification footer).
- **Live Preview Modal**: Real-time preview of unsaved document layout changes.

### 6. Notifications & Audit Log
- **Notification Bell**: Live in-app notifications for issued payslips, decided leave requests, and marked absences.
- **Activity Feed**: Audit log tracking logins, check-ins, payroll runs, invoice creations, and leave decisions.

---

## 🛠 Tech Stack

- **Frontend**: React (Vite), Modern Vanilla CSS Design System, React Router DOM, Axios, Context API.
- **Backend**: Node.js, Express.js, MongoDB (Mongoose).
- **PDF & Excel Engine**: PDFKit, ExcelJS.
- **Scheduler & Automation**: `node-cron`.
- **Authentication & Security**: JWT (Access + Refresh tokens), Password Hashing (`bcrypt.js`), Express Rate Limiting.
- **PWA**: Web App Manifest, Installable on Mobile & Desktop.

---

## 📋 Release Versions & Version Log

### `v1.0.0` — Core Engine & Authentication
- User Auth (Email, Phone OTP, Google OAuth2).
- Role-based Access Control (Admin, Manager, Staff).
- Company profile & global currency settings.

### `v2.0.0` — Attendance, Payroll & Invoices
- Attendance check-in/check-out system.
- Salary computation engine & payslip generation.
- Client invoicing module with PDF & Excel exports.
- Native Share Sheet + WhatsApp/Email sharing integration.

### `v3.0.0` — Activity Audit, PWA & Rate Limiting
- System activity audit log (`logActivity`).
- Full Progressive Web App (PWA) manifest & icons.
- API Rate limiting on auth endpoints.

### `v4.0.0` — Leave Workflow, Public Verification & Cron
- End-to-end Leave application & approval workflow.
- Attendance auto-sync on leave approval.
- Public Payslip Verification Portal (`/verify`).
- Monthly Auto-payroll cron job (`node-cron`).
- Company paid holidays calendar & payroll awareness.

### `v5.0.0` — PDF Layout Studio, Notifications & Leave Balances
- PDF Layout Studio with live document toggles & preview.
- In-app Notification Bell with unread counter & real-time updates.
- Annual leave quota enforcement & live balance progress cards.
- PDFKit bounding box & right-alignment layout fixes.

---

## 🔧 Installation & Local Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### 1. Clone & Setup Backend
```bash
cd Backend/server
npm install
cp .env.example .env
```
Fill in `.env` configuration (MongoDB URI, JWT secrets, etc.), then run:
```bash
npm run dev
```

### 2. Setup Frontend
```bash
cd Backend/client
npm install
cp .env.example .env
npm run dev
```
Open `http://localhost:5173` in your browser.
