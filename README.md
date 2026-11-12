# SPAR Promo Approval System — Production Architecture

A high-performance, enterprise-grade promotional planning and approval workflow system built for SPAR retail operations. Replaces legacy spreadsheet-driven promotional workflows with automated calculations, strict role-based governance, department isolation, atomic approvals, audit logging, and integrations with external retail systems.

---

## 1. Project Overview

The SPAR Promo Approval System manages promotional campaigns across retail departments (Fresh, Food, Non-Food). It enforces a strict, department-governed 2-stage approval lifecycle with the **Department Head as the Final Approver**.

```
STAFF (Commercial Initiator)
  ↓
DRAFT
  ↓
SUBMITTED_TO_HEAD
  ↓
HEAD REVIEW (Final Approver)
  ↓
APPROVED ─────────────────────────────→ MARKETING (Read-Only Campaign Execution)
  ↓ (or if rejected)
REJECTED_BY_HEAD (Requires mandatory comment)
  ↓
STAFF CORRECTION & RESUBMISSION
  ↓
SUBMITTED_TO_HEAD
```

### Supported System Roles
There are exactly **5 authorized roles** in the application. There is **NO Director role** or Director stage:
- **`STAFF`**: Commercial category initiator. Creates promo lists, saves drafts, searches real Product Master items, reviews sales trends, submits to Department Head, fixes and resubmits rejected lists.
- **`HEAD`**: Department Head & **Final Approver**. Reviews department submissions, examines promo lines, margins, and forecasts, rejects with mandatory comment, or approves. Exactly **one active Head per department**.
- **`MARKETING`**: Read-only cross-department campaign viewer. Views approved promotions, inspects details, and exports formatted Excel workbooks and PDF promotional summaries.
- **`ADMIN`**: Enterprise administrator. Manages user accounts, retail departments, role assignments, audit logs, and system settings. Cannot approve or reject promotional lists.
- **`MASTER_DATA`**: Master data specialist. Manages catalog items, promo mechanisms, and base pricing structures.

---

## 2. Technology Stack

### Frontend (`/frontend`)
- **Core**: React 18 with TypeScript (Strict Mode)
- **Bundler & Dev Server**: Vite
- **Routing**: React Router v6 with `ProtectedRoute` and `RoleGuard`
- **Data Fetching & State**: TanStack Query (React Query) & Axios
- **Data Grids**: AG Grid Community (high-performance grid for promo lines and SKU tables)
- **Styling**: Tailwind CSS with custom SPAR corporate visual identity:
  - SPAR Green: `#005A36`
  - SPAR Red: `#E31B23`
  - Warm Off-White: `#F8F9FA`
- **Icons**: Lucide React enterprise icon library

### Backend (`/backend`)
- **Runtime & Framework**: Node.js with Express & TypeScript
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) with encrypted role and department claims
- **Password Security**: Bcryptjs with 10 salt rounds (never plain text, never logged)
- **Validation**: Zod schema validation for all API inputs
- **Export Engines**: ExcelJS (branded Excel workbooks) & PDFKit (A4 landscape retail promo summaries)
- **External Integrations**: OAuth2-authenticated clients for Product Master API and POS Sales Data API

---

## 3. Frontend Setup

1. Open a terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure the environment file `frontend/.env` is configured:
   ```env
   VITE_API_URL=http://localhost:5001/api
   ```

---

## 4. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` (or configure your existing `.env`):
   ```bash
   cp .env.example .env
   ```

---

## 5. Database Setup

The backend utilizes PostgreSQL with Prisma ORM.

1. Ensure PostgreSQL is running on your host machine (default port: `5432`).
2. Create the target database if not already created:
   ```sql
   CREATE DATABASE spar_promo;
   ```
3. Configure the database connection string in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spar_promo?schema=public"
   ```

---

## 6. Environment Variables

### Backend Configuration (`backend/.env`)
```env
# Server
PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spar_promo?schema=public"

# Security
JWT_SECRET=your_secure_random_jwt_secret_here
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10

# External Product Master API (Port 8001)
PRODUCT_MASTER_API_URL=http://localhost:8001
PRODUCT_MASTER_API_USERNAME=your_pm_username
PRODUCT_MASTER_API_PASSWORD=your_pm_password
PRODUCT_MASTER_API_TIMEOUT=10000

# External Sales API (Port 8000)
SALES_API_URL=http://localhost:8000
SALES_API_USERNAME=your_sales_username
SALES_API_PASSWORD=your_sales_password
SALES_API_TIMEOUT=10000
```

> **Security Note**: Never commit actual API passwords or secrets to Git. Placeholders must be kept in `.env.example`.

### Frontend Configuration (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5001/api
```

---

## 7. How to Run Frontend

From the `frontend` directory:
```bash
npm run dev
```
The application will be accessible at: `http://localhost:5173`

---

## 8. How to Run Backend

From the `backend` directory:
```bash
npm run dev
```
The backend API server will run on: `http://localhost:5001`  
Health check endpoint: `http://localhost:5001/api/health`  
External integration health check: `http://localhost:5001/api/health/integrations`

---

## 9. How to Run Migrations

To apply database schema changes using Prisma:
```bash
cd backend
npx prisma migrate dev
```
Or to sync the database schema directly without migration files:
```bash
cd backend
npx prisma db push
```
To regenerate the Prisma Client after schema edits:
```bash
cd backend
npx prisma generate
```

---

## 10. How to Seed Data

To populate initial retail departments, default system accounts, promo types, and initial catalog items:
```bash
cd backend
npm run prisma:seed
```

### Seed Development Accounts (Default Password: `Password123!`)
| Role | Email | Department | Description |
|---|---|---|---|
| **STAFF** | `staff.fresh@spar.internal` | Fresh | Fresh produce & butchery category planner |
| **HEAD** | `head.fresh@spar.internal` | Fresh | **Department Head & Final Approver** |
| **STAFF** | `staff.food@spar.internal` | Food | Packaged groceries category planner |
| **HEAD** | `head.food@spar.internal` | Food | **Department Head & Final Approver** |
| **MARKETING** | `marketing@spar.internal` | Cross-Department | Approved campaigns viewer & exporter |
| **ADMIN** | `admin@spar.internal` | Cross-Department | Enterprise user & department administrator |
| **MASTER_DATA** | `masterdata@spar.internal` | Cross-Department | Catalog & master pricing specialist |
| **INACTIVE** | `inactive.staff@spar.internal` | Fresh | Deactivated user account (`active: false`) |

---

## 11. Product Master API Requirement

The system integrates with an external Product Master service:
- **Default Local URL**: `http://localhost:8001`
- **Protocol**: REST over HTTP with OAuth2 Password Flow (`/token`)
- **Key Endpoints Proxied by Backend**:
  - `GET /api/products/search?q=&departmentId=` — Live SKU and barcode search with 400ms debounce
  - `GET /api/products/:code` — SKU detail lookup and base pricing verification
  - Automatic product validation on promo submission (rejects unregistered SKUs)
- **Security**: The frontend never connects directly to the Product Master API; all calls are securely authenticated and proxied by the backend.

---

## 12. Sales API Requirement

The system integrates with an external POS Sales History service:
- **Default Local URL**: `http://localhost:8000`
- **Protocol**: REST over HTTP with OAuth2 Password Flow (`/token`)
- **Key Features Proxied by Backend**:
  - `GET /api/sales/product/:code` — Aggregated volume, average revenue, and recent invoice breakdown
  - Interactive Sales Performance modal in Promo Entry grid allowing Staff to make informed promotional forecasts
- **Security**: Sales API credentials remain exclusively on the backend server.

---

## 13. Testing Instructions

The repository includes a comprehensive, automated test suite covering all business logic, role boundaries, and security protections across phases:

### Running the Complete Test Suite
```bash
cd backend
npm test
```

### Individual Test Suites
- **Auth & RBAC**: `npm run test -- tests/phase2_auth_test.ts`
- **Dashboard**: `npm run test:dashboard`
- **Promo Entry & Calculations**: `npm run test:promo-entry`
- **Head Review & Approval**: `npm run test:head-review`
- **Approved Promos & Marketing**: `npm run test:approved-promos`
- **Notifications**: `npm run test:notifications`
- **Admin Management**: `npm run test:admin`
- **Phase 10 Integrations & Exports**: `npm run test:phase10`

---

## 14. Build Instructions

### Building Backend for Production
```bash
cd backend
npm run build
```
Compiles TypeScript into production JavaScript in `backend/dist/`.

### Building Frontend for Production
```bash
cd frontend
npm run build
```
Type-checks with `tsc -b` and bundles optimized production assets into `frontend/dist/`.

---

## 15. Security & Governance Architecture

1. **Strict 5-Role Model**: Only `STAFF`, `HEAD`, `MARKETING`, `ADMIN`, `MASTER_DATA` exist. All Director endpoints, references, and permissions have been removed or explicitly blocked.
2. **IDOR & Department Isolation**: Every promo lookup, update, submission, approval, and export checks the requesting user's department and role. Cross-department modifications return HTTP 403.
3. **Read-Only Marketing**: Marketing users can search, view, and export approved promos, but any write or mutation attempt returns HTTP 403.
4. **Atomic Approvals**: Head approval transitions, audit records, and notification emissions are executed inside Prisma database transactions.
5. **Mandatory Rejection Comment**: Rejections without detailed feedback are blocked by backend schema validation.
6. **Credential Protection**: Zero credentials or passwords exist in frontend bundles or Git logs. All external API tokens are managed via backend in-memory token caching.
