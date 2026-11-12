---
name: Saran Jeans Saleandevent System
description: Full codebase reference for the unified sales channel & stock management system (Saran Jeans). Covers schema, server actions, lib, config, API routes, components, and architectural patterns.
---

# Saran Jeans — Saleandevent System Skill

> [!NOTE]
> Detailed workflows, status descriptions (Event/Branch creation, stock lifecycle), and detailed business rules are documented in the separate reference file: [Business Logic & Workflows Reference](file:///Users/kanittamac/web/saleandevent/.agent/skills/references/business_logic.md).

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** (App Router, React 19) |
| Language | **TypeScript** |
| ORM | **Prisma 7** with `prisma.config.ts`, `@prisma/adapter-pg` (PG driver adapter) |
| Database | **PostgreSQL** (via `pg` pool) |
| Auth | Custom **JWT** (jose) + **bcryptjs**, cookie-based sessions (`sj-session`) |
| Storage | **Cloudflare R2** (S3-compatible, via `@aws-sdk/client-s3`) for payroll attachments |
| PDF | **jsPDF** (invoice & withholding tax PDF generation) |
| UI | **Tailwind CSS**, Lucide icons, custom components |
| Deployment | Docker + Caddy reverse proxy |

---

## 2. Project Structure

```
/backup.sh                 # Production DB backup script (SSH + pg_dump + local download to /backups)
/prisma
  schema.prisma          # 1000+ lines, 25+ models
  seed.ts / seed.sql     # Seeding scripts
  import-excel.ts        # Excel product import
/scripts
  seed-expense-categories.ts
/src
  /actions               # Server Actions (business logic)
    auth-actions.ts
    attendance-actions.ts  # Check-in / Check-out (GPS geofence + R2 photo + HQ/Channel)
    company-setting-actions.ts # Store / Head Office settings & GPS coordinates
    sale-actions.ts
    product-actions.ts
    invoice-actions.ts
    staff-actions.ts
    customer-actions.ts
    role-permission-actions.ts
    /channel             # 10 files — barrel via index.ts (supports EVENT & monthly BRANCH payroll)
    /stock-request       # 6 files — barrel via index.ts
  /lib
    auth.ts              # JWT session, bcrypt
    db.ts                # Prisma singleton (PG adapter)
    r2.ts                # R2 upload/delete
    geo.ts               # Haversine GPS distance & Google Maps URL coordinate parser
    payroll-period.ts    # Monthly payroll period helpers (YYYY-MM, 30th pay cycle)
    utils.ts             # cn(), fmt()
    invoice-pdf.ts       # jsPDF invoice generation
    withholding-tax-pdf.ts
    thai-baht-text.ts    # Number to Thai text
    thai-font.ts         # Sarabun font Base64
  /config
    menu.ts              # MENU_SECTIONS (6 sections), ROUTE_TO_MENU_KEY
    roles.ts             # AVAILABLE_ROLES (7 roles)
    status.ts            # CHANNEL_STATUS, PACKING_STATUS color badges
  /types
    channel.ts           # StaffSelection
    stock.ts             # AllocationRow, ReceivingItemInput
    sale.ts              # SaleItemInput, AdjustmentInput, CreateSaleInput
    invoice.ts           # InvoiceItemInput
  /components
    /attendance          # CheckInOutCard (Live camera + GPS distance check + Forgot check-out)
    /dashboard           # KpiCard, SalesChart, BranchChart, etc.
    /layout              # Sidebar, BottomNav, MobileNav, EmployeeHeader
    /shared              # ConfirmDialog, EmptyState, FormInput, PageHeader, Spinner, GpsCoordinatePicker
    /ui                  # button, dialog, input, label, select, textarea, toast
  /app
    /(admin)             # Back-office pages (desktop)
    /(employee)          # Employee mobile pages (workspace, channel)
    /api                 # API routes (channels, products, payroll upload, attendance upload, etc.)
    /login               # Login page
  middleware.ts          # Route protection (JWT + allowedMenus RBAC)
```

---

## 3. Database Schema (Key Models)

### Core Business

| Model | PK | Purpose |
|---|---|---|
| `SalesChannel` | UUID | EVENT or BRANCH — central hub for all operations. Includes `latitude`, `longitude`, and `checkInRadiusKm` (default `0.5` km) for employee GPS check-in |
| `ChannelLog` | UUID | Audit log per channel (action, details JSON, changedBy) |
| `Product` | `barcode` (VarChar) | Products keyed by barcode, with `sku` (nullable VarChar(100)), code/color/size as identifiers |
| `WarehouseStock` | `barcode` | Central warehouse stock (quantity, reservedQuantity) ⚠️ ข้อมูลติดลบ ห้าม AI หรือ Dashboard ใช้ตรรกะผลรวมตารางนี้ตรงๆ ให้เลี่ยงใช้ ChannelStock หรือครอบ clamp |
| `ChannelStock` | UUID | Stock at a channel (quantity, soldQuantity, returnedQuantity) — unique on `[channelId, barcode]` |
| `StockMovement` | UUID | All movement records (RECEIVING, RETURN, etc.) |
| `StockTransfer` / `StockTransferItem` | UUID | Stock transfers between Warehouse and Channels (supports Excel Export/Import with SKU & strict stock validation) |

### Stock Request Lifecycle

| Model | Purpose |
|---|---|
| `StockRequest` | Channel requests stock (INITIAL or TOPUP). Status: `draft → submitted → approved → allocated → packed → shipped → received \| cancelled` |
| `WarehouseAllocation` | Warehouse allocates specific products/sizes to a request (via Excel upload) |
| `Shipment` | 1:1 with StockRequest — tracking info |
| `Receiving` | PC confirms received stock — **creates ChannelStock** |
| `ReceivingItem` | Per-barcode received vs allocated comparison |
| `StockRequestLog` | Centralized audit log specifically for stock request operations (e.g., admin edits) |

### Sales & Finance

| Model | Purpose |
|---|---|
| `Sale` | Bill record (billCode = `{ChannelCode}-{running 4-digit}`) |
| `SaleItem` | Line items with freebie flag |
| `ChannelExpense` | Per-channel expenses (category, amount, receipt URL, optional `periodMonth` (`YYYY-MM`) for monthly Branch claims) |
| `Invoice` | Invoice with discount/VAT calculation, status `draft → submitted` |
| `InvoiceItem` | Per-barcode invoice quantities |
| `Customer` | Customer master (taxId, creditTerm, discountPercent) |

### HR & Payroll

| Model | Purpose |
|---|---|
| `Staff` | Employee (code S0001 format, role, paymentType (`daily` \| `monthly` \| `commission`), dailyRate, commissionAmount, `isHeadOffice` boolean for Head Office check-in, allowedMenus override, salaryAccess) |
| `ChannelStaff` | Staff assigned to channel (used directly for EVENT one-time payroll: commission/dailyRate/daysWorked overrides, isWagePaid, isCommissionPaid, isSubmitted, WHT fields) |
| `ChannelStaffPeriod` | Monthly payroll cycle record for permanent `BRANCH` channels (`periodMonth` = `YYYY-MM`, pay cycle 30th of every month). Unique on `[channelStaffId, periodMonth]` |
| `StaffCheckIn` | Employee GPS + Live Photo Check-in / Check-out record (`locationType`: `EVENT` \| `BRANCH` \| `HQ`, `checkInLat/Lng`, `checkInPhotoUrl`, `checkOutLat/Lng`, `checkOutPhotoUrl`, `isForgotCheckOut`, `forgotCheckOutReason`, `hoursWorked`). Unique on `[staffId, date]` (1 person per 1 location per day). Decoupled from `Attendance` / payroll daysWorked calculation |
| `Attendance` | Daily attendance per channel (unique on `[channelId, staffId, date]`) |
| `PayrollAttachment` | R2-stored files attached to payroll records (supports optional `periodMonth` for monthly Branch claims) |
| `PasswordChangeLog` | Audit trail for password changes |

### Others

| Model | Purpose |
|---|---|
| `CompanySetting` | Store / Company master info & Head Office (`สำนักงานใหญ่`) GPS coordinates (`latitude`, `longitude`, `checkInRadiusKm`) |
| `Promotion` | Config JSON for Buy-X-Get-Y, tiered, gift promos |
| `ReturnSummary` / `ReturnItem` | Event closing return data (sold, remaining, damaged, missing) |
| `RolePermission` | Per-role allowedMenus config |
| `ExpenseCategory` | Master categories (type: `emp` or `admin`) |
| `User` | Legacy user model |

---

## 4. Server Actions Reference

### 4.1 Auth (`src/actions/auth-actions.ts`)

| Function | Input | Behavior |
|---|---|---|
| `loginAction` | FormData (code, password) | Finds Staff by code → verify bcrypt → create JWT with allowedMenus → redirect based on role/menus |
| `logoutAction` | - | Destroy session → redirect `/login` |
| `changePasswordAction` | FormData (staffId, current, new, confirm) | Verify old pw, hash new, log to PasswordChangeLog |
| `resetPasswordAction` | staffId, adminId | Reset password to DOB format `ddMMyyyy` (or `01012026` default) |
| `backfillPasswordsFromDOB` | - | Bulk set passwords for staff without passwordHash |

**Landing page priority**: `finance → sales_channel → supply_chain → hr → system_admin → front_office`. PC role always goes to `/workspace`.

### 4.2 Channel Actions (`src/actions/channel/`)

#### Create & Update
| Function | Notes |
|---|---|
| `createChannelWithDetails` | Auto-generates code: EVENT=`EV-YYYYMM-XXX`, BRANCH=`BR-XXX`. **Requires GPS coordinates (`latitude`, `longitude`) and `checkInRadiusKm`**. Transaction: create channel + assign staff + initial stock request + log |
| `updateChannelWithDetails` | Full update in transaction (including `latitude`, `longitude`, `checkInRadiusKm`). Deletes all ChannelStaff and recreates. Updates/creates INITIAL stock request |

#### Approval
| Function | Notes |
|---|---|
| `submitChannel` | `draft → submitted` + log |
| `approveChannel` | `draft/submitted → approved` + auto-approves all submitted stock requests |

#### Closing & Returns (EVENT only)
| Function | Notes |
|---|---|
| `closeChannelStock` | Creates `ReturnSummary` with all items. Status → `pending_return` |
| `createReturnShipment` | Status → `returning` + log shipment data |
| `confirmReturnReceived` | Returns remaining stock to WarehouseStock (upsert + StockMovement). Status → `returned` |
| `closeChannelManual` | Status → `completed` (for branches or forced close) |

#### Expense
| Function | Notes |
|---|---|
| `addChannelExpense` | Create expense (auto `approved` status, supports optional `periodMonth` for monthly Branch claims) + log |
| `removeChannelExpense` | Delete expense + log |
| `deletePayrollAttachment` | Delete from R2 + DB |

#### Payroll
| Function | Notes |
|---|---|
| `updateStaffDailyRate` | Override daily rate / monthly salary per channel assignment (or per `ChannelStaffPeriod` when `periodMonth` is provided) |
| `toggleWagePaid` / `toggleCommissionPaid` | Toggle paid status + timestamp (supports `periodMonth` for Branch monthly cycles) |
| `markAllWagePaid` / `markAllCommissionPaid` | Bulk toggle for a channel (or specific `periodMonth`) |
| `submitPayroll` | Mark `isSubmitted` + timestamp per staff in channel (or specific `periodMonth` for Branch) |

#### Compensation
| Function | Notes |
|---|---|
| `getChannelCompensationSummary` | Calculates wages (`monthly` fixed salary = `effectiveRate`, or `daily` = `daysWorked × effectiveRate`) + commission per staff. Supports `periodMonth` (`YYYY-MM`) for monthly Branch claims |
| `saveStaffCompensation` | Batch update daysWorkedOverride + commissionOverride (supports `periodMonth`) |
| `updateEmployeeCompensation` | Per-staff update for employee self-service (supports `periodMonth`) |

#### Payment
| Function | Notes |
|---|---|
| `submitForPaymentApproval` | Channel status → `pending_payment` |
| `approvePayment` | Channel status → `payment_approved` |

#### Staff
| Function | Notes |
|---|---|
| `addStaffToChannel` | Creates ChannelStaff (checks unique constraint) + log |
| `removeStaffFromChannel` | Deletes ChannelStaff + log |

### 4.3 Stock Request Actions (`src/actions/stock-request/`)

#### Create
| Function | Notes |
|---|---|
| `createStockRequest` | Create (INITIAL/TOPUP) + log. Status: `draft` |
| `updateStockRequest` | Update qty/notes (blocked if shipped/received/cancelled) |
| `submitStockRequest` | Status → `submitted` |

#### Approval & Admin Edit
| Function | Notes |
|---|---|
| `approveStockRequest` | Status → `approved`. Also approves parent channel if still draft/submitted. Tracks real user session. |
| `rejectStockRequest` | Status → `cancelled` + rejection reason. Tracks real user session. |
| `adminUpdateStockRequest` | Allows roles `ADMIN`, `MANAGER`, `WAREHOUSE` to directly edit request items without re-triggering approval flow. Snapshot logged to `StockRequestLog`. |

#### Warehouse
| Function | Notes |
|---|---|
| `uploadAllocation` | **Complex**: Parses Excel rows or auto-maps from POS. (1) **Tries exact barcode match first** for 100% precision. (2) Fallback: matches product by code+color+size case-insensitively. Size normalization (XXL→2XL). Supports `adminOverride` to skip missing products. Status → `allocated` |
| `updateSingleAllocation` | Edit one allocation's packedQuantity |
| `confirmPacking` | Status → `packed`. UI now features a **"แก้ไขจัดสรร"** button to toggle back to the `allocated` mapping screen if adjustments are needed. |
| `createShipment` | Creates Shipment record + status → `shipped` |
| `getProductMasterForTemplate` | Returns grouped product data for Excel template generation |

**`uploadAllocation` Lookup Logic**: Builds a primary `barcodeMap` for exact match (fixing bugs with trailing spaces/casing from POS requests), and a secondary map of `CODE-COLOR-SIZE → barcode` from DB products. Handles 4 variants: code+color+size, code+size, code+color, code-only.

#### Receiving
| Function | Notes |
|---|---|
| `confirmReceiving` | **Critical transaction**: (1) Create Receiving + items, (2) **upsert ChannelStock** (increment qty), (3) Create StockMovement, (4) **Deduct WarehouseStock**, (5) Status → `received`, (6) Channel → `active`. Timeout 30s |

#### Queries
| Function | Returns |
|---|---|
| `getStockRequestsByChannel` | All requests for channel with allocations, shipment, receiving |
| `getStockRequest` | Single request with full relations |
| `getPendingStockRequests` | Status = `submitted` |
| `getApprovedStockRequests` | Status in `[approved, allocated]` |
| `getPackedStockRequests` | Status = `packed` |
| `getShippedStockRequests` | Status = `shipped` |

### 4.4 Sales (`src/actions/sale-actions.ts`)

| Function | Notes |
|---|---|
| `createSale` | Transaction: calculate totals (with adjustments/discounts) → generate billCode → create Sale + SaleItems → **increment soldQuantity** on ChannelStock → log |
| `getSalesByChannel` | Active sales for a channel (with items+products) |
| `getSaleById` | Single sale with items+products+channel |
| `cancelSale` | Transaction: status → `cancelled` + **decrement soldQuantity** on ChannelStock → log |
| `getActiveChannelsWithSales` | Channels with status selling/approved/packing/shipped/received/active with sales aggregates |
| `getAllSales` | Recent active sales (default limit 50) |

### 4.5 Products (`src/actions/product-actions.ts`)

| Function | Notes |
|---|---|
| `createProduct` | Check duplicate barcode → create Product + WarehouseStock(qty=0) → redirect |
| `updateProduct` | Update by barcode → redirect |
| `deleteProduct` | Soft delete (status → `inactive`) |

### 4.6 Invoice (`src/actions/invoice-actions.ts`)

| Function | Notes |
|---|---|
| `getChannelsForInvoice` | Channels with shipped/received stock requests + invoice count |
| `getChannelShippedItems` | Aggregate shipped items by barcode for invoice creation |
| `getChannelForInvoice` | Channel with customer details |
| `createInvoice` | Calculate totals (7% VAT, discount), create draft invoice with items |
| `updateInvoice` | Draft only — delete items + recreate in transaction |
| `submitInvoice` | Generate `INV-YYYYMM-XXXX` number, status → `submitted` |
| `updateInvoiceNumber` | Edit number for submitted invoices (unique constraint check) |
| `deleteInvoice` | Draft only — hard delete |
| `getInvoicesByChannel` / `getInvoice` | Query helpers |

### 4.7 Staff (`src/actions/staff-actions.ts`)

| Function | Notes |
|---|---|
| `createStaff` | Auto-generate code `S0001`++. Supports per-staff allowedMenus override |
| `updateStaff` | Full update including allowedMenus |
| `deleteStaff` | Soft delete (status → `inactive`) |
| `backfillStaffCodes` | Batch assign codes to staff without codes |

### 4.8 Customer (`src/actions/customer-actions.ts`)

| Function | Notes |
|---|---|
| `createCustomer` | Auto-generate code `C00001`++ or use custom code |
| `updateCustomer` | Full update |
| `deleteCustomer` | **Hard delete** |

### 4.9 Role Permission (`src/actions/role-permission-actions.ts`)

| Function | Notes |
|---|---|
| `getRolePermissions` | All role configs |
| `getAllowedMenusForRole` | Get menus for role (ADMIN gets all by default) |
| `saveRolePermissions` | Upsert role → allowedMenus[] mapping |
| `getStaffForPermissions` | Staff list with allowedMenus for permission management |
| `saveStaffPermissions` | Per-staff allowedMenus + salaryAccess override |

### 4.10 Attendance / Check-in & Check-out (`src/actions/attendance-actions.ts`)

| Function | Notes |
|---|---|
| `performCheckIn` | Enforces 1 check-in per staff per day (`Asia/Bangkok` date), validates Haversine GPS distance `<= checkInRadiusKm` against target `SalesChannel` or Head Office (`CompanySetting`), requires live photo URL, and creates `StaffCheckIn` |
| `performCheckOut` | Validates GPS distance against target location; if outside `checkInRadiusKm`, requires `isForgotCheckOut = true` (with optional `forgotCheckOutReason`), requires live photo URL, computes `hoursWorked`, and updates `StaffCheckIn` |
| `updateLocationGpsConfig` | Admin/HR helper to quickly update `latitude`, `longitude`, and `checkInRadiusKm` for Head Office (`HQ`) or any `SalesChannel` |

---

## 5. Lib Utilities

### `auth.ts`
- `hashPassword(password)` → bcrypt hash (salt 10)
- `verifyPassword(password, hash)` → boolean
- `createSession(payload: SessionPayload)` → JWT (7-day expiry), httpOnly cookie `sj-session`
- `getSession()` → SessionPayload | null
- `updateSession(updates)` → merge and re-sign
- `destroySession()` → delete cookie

### `db.ts`
- Prisma singleton using `@prisma/adapter-pg` with `pg.Pool`
- `export const db` — global reference in dev mode

### `r2.ts`
- `isR2Configured()` — check env vars
- `generateR2Key(filename)` → `payroll/YYYYMM/{uuid}-{safeName}`
- `uploadToR2(buffer, key, contentType)` → public URL
- `deleteFromR2(fileUrl)` — extract key from URL + delete

### `utils.ts`
- `cn(...inputs)` — clsx + tailwind-merge
- `fmt(n: number)` — Thai locale number format (no decimals)

### `geo.ts`
- `calculateDistanceKm(lat1, lng1, lat2, lng2)` — Haversine GPS distance in kilometers
- `formatDistanceThai(distanceKm)` — Formats distance in meters (if `< 1` km) or km
- `parseGoogleMapsCoords(input)` — Extracts `{ lat, lng }` from Google Maps URLs (`!3d..!4d..`, `@lat,lng`, `?q=lat,lng`) or plain `lat, lng` strings
- `isValidLatLng(lat, lng)` — Validates finite latitude (`-90..90`) and longitude (`-180..180`)

### `payroll-period.ts`
- `getCurrentPeriodMonth()` / `getPeriodDateRange(periodMonth)` — Computes `YYYY-MM` period and start/end dates
- `formatPeriodMonthThai(periodMonth)` — Formats `YYYY-MM` into Thai month & Buddhist year with `(รอบจ่ายวันที่ 30)`
- `getSelectablePeriodMonths(count)` — Generates selectable monthly periods for Branch payroll dropdowns

### `invoice-pdf.ts` / `withholding-tax-pdf.ts` / `thai-baht-text.ts`
- jsPDF-based PDF generation for invoices and withholding tax certificates
- Thai Baht text conversion (number → Thai words)

---

## 6. Authentication & Authorization

### Login Flow
1. Staff logs in with **employee code** (e.g., `S0001`) + password
2. Server finds Staff by code, verifies bcrypt
3. Session stores: `staffId, role, name, allowedMenus, salaryAccess`
4. Redirect based on priority: finance → sales_channel → supply_chain → hr → system_admin → front_office
5. PC role always → `/workspace`

### Middleware (`middleware.ts`)
- JWT validation on every request
- **Menu-based RBAC**: checks `allowedMenus[]` against `ROUTE_TO_MENU_KEY` mapping
- Cross-access patterns: supply_chain can view `/channels/xxx/packing`
- Employee routes (`/workspace`, `/channel`) open to all 7 roles (`ADMIN`, `MANAGER`, `WAREHOUSE`, `FINANCE`, `HR`, `STAFF`, `PC`) so both field and Head Office staff can Check-in / Check-out
- Fallback role-based protection when no allowedMenus configured

### Password Default
- Initial password = DOB formatted as `ddMMyyyy` (e.g., `15061995`)
- Default when no DOB: `01012026`

---

## 7. Menu Sections & Roles

### 6 Menu Sections
| Key | Thai Title | Routes |
|---|---|---|
| `front_office` | หน้าร้าน | `/pc/pos`, `/pc/sales`, `/pc/receive`, `/pc/refill`, `/pc/close` |
| `sales_channel` | ช่องทางขาย | `/`, `/channels`, `/channels/create`, `/channels/approvals`, `/channels/expenses` |
| `supply_chain` | คลังสินค้า | `/warehouse/packing`, `/warehouse/shipments`, `/warehouse/stock-adjustment`, `/warehouse/stock-transfer`, `/warehouse/return` |
| `finance` | บัญชี | `/dashboard/owner`, `/reports`, `/finance/customers`, `/finance/invoices` |
| `hr` | บุคคล | `/hr/employees`, `/hr/attendance`, `/hr/payroll`, `/hr/payroll/report` |
| `system_admin` | ตั้งค่า | `/admin/company`, `/admin/products`, `/admin/product-categories`, `/admin/expense-categories`, `/admin/users` |

### 7 Roles
`ADMIN`, `MANAGER`, `WAREHOUSE`, `FINANCE`, `HR`, `STAFF`, `PC`

---

## 8. Channel Status Lifecycle

```
draft → submitted → approved → [Stock flow: allocated → packed → shipped → received]
                                                                        ↓
                                                                     active (selling)
                                                                        ↓
                                                                  pending_return → returning → returned → completed
                                                                        ↓                                    ↑
                                                                   pending_payment → payment_approved --------
```

**Status colors** defined in `src/config/status.ts` — each status has `label, bg, text, border` for consistent badge rendering.

---

## 9. API Routes (`src/app/api/`)

| Route | Purpose |
|---|---|
| `GET /api/channels` | List channels |
| `GET /api/channels/[id]` | Channel detail with relations |
| `GET /api/channels/[id]/invoice` | Invoice PDF download |
| `GET /api/channels/[id]/invoices` | List invoices for channel |
| `GET /api/customers` | List customers |
| `GET /api/customers/export` | Export customers to Excel |
| `GET /api/dashboard` | Dashboard aggregate data |
| `GET /api/dashboard/owner` | Owner dashboard data |
| `GET /api/invoices/[invoiceId]` | Invoice detail |
| `POST /api/payroll/upload` | Upload payroll attachment to R2 (supports `periodMonth` for Branch claims) |
| `POST /api/attendance/upload` | Upload live Check-in / Check-out camera photo to Cloudflare R2 |
| `GET /api/products` | List products |
| `GET /api/products/export` | Export products to Excel |
| `POST /api/products/import` | Import products from Excel |
| `GET /api/staff` | List staff |
| `GET /api/staff/available` | Available staff for assignment |
| `GET /api/staff/export` | Export staff to Excel |

---

## 10. UI Components

### Layout
- `Sidebar.tsx` — Desktop sidebar with menu sections filtered by `allowedMenus`
- `MobileNav.tsx` — Responsive hamburger menu
- `BottomNav.tsx` — Mobile bottom navigation for employee routes
- `EmployeeHeader.tsx` — Header for employee workspace

### Dashboard
- `KpiCard.tsx` — Stat card with icon
- `SalesChart.tsx`, `BranchChart.tsx`, `ExpenseChart.tsx` — Chart components
- `EventTable.tsx`, `BranchTable.tsx`, `ProductInsight.tsx` — Data tables

### Shared & Attendance
- `ConfirmDialog.tsx` — Custom modal replacing native confirm
- `FormInput.tsx` — Labeled input with `border-0 border-b` style
- `PageHeader.tsx` — Page title with breadcrumbs
- `EmptyState.tsx` — Empty data placeholder
- `Spinner.tsx` — Loading indicator
- `GpsCoordinatePicker.tsx` — Reusable GPS coordinate & radius picker (supports Google Maps URL parsing, coordinate pasting, and current browser geolocation)
- `CheckInOutCard.tsx` (`src/components/attendance/CheckInOutCard.tsx`) — Mobile Check-in / Check-out card with live WebRTC camera modal, photo timestamp/GPS watermarking, Haversine distance geofence check, and Forgot Check-out (`ลืม Check-out`) exception flow

### UI (shadcn-style)
`button`, `dialog`, `input`, `label`, `select`, `textarea`, `toast`, `alert-dialog`

---

## 11. Coding Patterns & Standards

### Server Actions Pattern
```typescript
'use server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function doSomething(id: string) {
    await db.$transaction(async (tx) => {
        // ... business logic
        await tx.channelLog.create({ data: { channelId, action: 'action_name', details: {...}, changedBy: '00000000-...' } });
    });
    revalidatePath('/relevant/path');
}
```

### Key Patterns
1. **Transaction-safe**: All multi-step operations use `db.$transaction()`
2. **Audit logging**: Every mutation creates a `ChannelLog` entry (and `StockRequestLog` for stock request edits)
3. **Soft delete**: Products and Staff use `status: 'inactive'` (Customers hard-delete)
4. **Auto-generated codes**: Staff `S0001++`, Customer `C00001++`, Channel `EV-YYYYMM-XXX` / `BR-XXX`, Invoice `INV-YYYYMM-XXXX`, Bill `{ChannelCode}-{0001++}`
5. **Thai localization**: 100% Thai UI labels
6. **revalidatePath**: Called after every mutation for related routes
7. **Excel integration**: Product import, allocation upload with code+color+size matching
8. **R2 storage**: Payroll attachments only (uploads via API route, deletes via server action)
9. **FormData pattern**: Most CRUD actions accept `FormData`, not JSON
10. **Border-bottom inputs**: Standard input style is `border-0 border-b`
11. **Serialization Safety**: Decimal values from Prisma must be explicitly converted to Numbers when passed from Server to Client Components.
12. **Real User Tracking**: Server actions extract the exact logging user from `getSession()`, preventing system fallback misattributions.

### Import Patterns
```typescript
// Channel actions — barrel export
import { createChannelWithDetails, approveChannel } from '@/actions/channel';

// Stock request actions — barrel export
import { uploadAllocation, confirmReceiving } from '@/actions/stock-request';

// Types
import type { AllocationRow, ReceivingItemInput } from '@/types/stock';
import type { StaffSelection } from '@/types/channel';

// Lib
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cn, fmt } from '@/lib/utils';
```

---

## 12. Key Page Structure (`src/app/(admin)/`)

| Route | Page |
|---|---|
| `/` | Main dashboard (`DashboardClient.tsx` — 22KB) |
| `/channels` | Channel list with filters |
| `/channels/create` | Create channel form |
| `/channels/[id]` | Channel detail (EventStockTabs, EventActions, EventExpenses, EventCompensation, StaffManager, EventStatusStepper) |
| `/channels/[id]/edit` | Edit channel |
| `/channels/[id]/packing` | Packing interface |
| `/channels/[id]/shipping` | Shipping form |
| `/channels/[id]/expenses` | Channel expense management |
| `/channels/approvals` | Approval queue |
| `/channels/approvals/payment` | Payment approval queue |
| `/channels/expenses` | Cross-channel expense overview |
| `/admin/company` | Store / Company info & Head Office (`สำนักงานใหญ่`) GPS coordinates + check-in radius |
| `/admin/products` | Product CRUD with import/export |
| `/admin/users` | Role permissions + per-staff settings |
| `/finance/customers` | Customer CRUD |
| `/finance/invoices` | Invoice management by channel |
| `/reports` | Reports hub (`TopProductsReport` with model-aggregated chart & color-grouped S–3XL table, `ChannelStockReport`, `TotalStockReport` with point-of-sale Excel exports) |
| `/hr/employees` | Staff management (supports `isHeadOffice` flag & `monthly`/`daily` payment types) |
| `/hr/attendance` | HR Attendance dashboard — inspect Check-in / Check-out photos, GPS distances, Forgot Check-out flags, quick GPS config modal, and Excel export |
| `/hr/payroll` | Payroll by channel (split tabs: `🎪 Event (จบงาน)` vs `🏪 สาขา (รายเดือน - จ่ายวันที่ 30)`) |
| `/hr/payroll/report` | Cross-channel payroll & WHT report (combines one-time Event payrolls and monthly Branch `ChannelStaffPeriod` records) |
| `/dashboard/owner` | Owner financial dashboard |
| `/warehouse/packing` | Packing queue |
| `/warehouse/shipments` | Shipment tracking |
| `/warehouse/stock-transfer` | Stock transfer between Warehouse & Channels (with Excel Export/Import + SKU + strict stock validation) |
| `/warehouse/return` | Return receiving |
| `/pc/pos` | Point of Sale |
| `/pc/sales` | Sales history |
| `/pc/receive` | Receive shipped stock |
| `/pc/refill` | Request stock top-up (Mobile-friendly POS-style itemized flow) |
| `/pc/close` | Close event / return stock |

---

## 13. Employee Routes (`src/app/(employee)/`)

| Route | Purpose |
|---|---|
| `/workspace` | Employee home — Head Office (`สำนักงานใหญ่`) Check-in / Check-out card + assigned Event/Branch channel cards with direct Check-in / Check-out |
| `/workspace/attendance` | Employee personal Check-in / Check-out history with month selector (defaults to current month), summary cards, and photo preview |
| `/channel/[id]/*` | Employee channel-scoped operations (Check-in / Check-out card, POS, expenses, and Event/Branch monthly payroll self-service) |

---

## 14. Business & Payroll Rules

### 14.1 Event vs. Monthly Branch Payroll (`type = "EVENT"` vs `"BRANCH"`)
1. **Event (`type = "EVENT"`)**:
   - One-time payroll per event lifecycle, stored directly on `ChannelStaff`, `ChannelExpense` (`periodMonth = null`), and `PayrollAttachment` (`periodMonth = null`).
2. **Branch (`type = "BRANCH"`) — Monthly Pay Cycle (30th of Every Month)**:
   - Branches remain permanently `active` (never closed to process payroll).
   - Claims are scoped by `periodMonth` (`YYYY-MM`, e.g., `"2026-11"`) and stored in `ChannelStaffPeriod` (`channel_staff_periods`), `ChannelExpense.periodMonth`, and `PayrollAttachment.periodMonth`.
   - Supports two staff compensation types in the same branch:
     - **Fixed Monthly (`paymentType = 'monthly'`)**: Base salary = `effectiveRate` (`dailyRateOverride ?? staff.dailyRate`) for the month (not multiplied by `daysWorked`) + `commission` + `expenses`.
     - **Daily / Regular (`paymentType = 'daily'`)**: Wage = `daysWorked × effectiveRate` + `commission` + `expenses`.

### 14.2 Withholding Tax (หัก ณ ที่จ่าย 3%)
1. **Tax Applicability**: A staff member's compensation is subject to Withholding Tax (ภ.ง.ด.3) at a rate of **3%** only if their **days worked is strictly greater than 10 days** (`daysWorked > 10`).
2. **Taxable Income**:
   - **Wage (ม.40(1))**: `daysWorked * dailyRate` (or fixed monthly amount if applicable).
   - **Commission (ม.40(2))**: The base commission (`totalCommission`) plus any target incentive withdrawals (`targetIncentive`).
3. **Target Incentive (ค่าเป้า)**:
   - "ค่าเป้า" is set up as an employee-facing expense category (`type: 'emp'`).
   - When a staff member withdraws (เบิก) this category, it is stored as a `ChannelExpense` with category `"ค่าเป้า"`.
   - For Withholding Tax calculation and certificate generation, any approved/submitted `"ค่าเป้า"` expenses are added directly to the commission (ม.40(2)) category.
4. **Net Payout Calculation**:
   - `ยอดโอนรวม` (Net Transfer Amount) = `ค่าแรงรวม + ค่าคอม + เบิกค่าใช้จ่ายทั้งหมด - หัก ณ ที่จ่าย`.
   - Both the summary Excel and the KCASH bank transfer file use the net payout.

### 14.3 Employee Check-in / Check-out System (`StaffCheckIn`)
1. **Supported Locations & Default Shift Schedules**:
   - **Event & Branch (`SalesChannel`)**: Mandatory `latitude`, `longitude`, and `checkInRadiusKm` (default `0.5` km) + default work shift **`10:00 – 21:00`** (`workStartTime`, `workEndTime`) when creating a new channel (`/channels/create`), editable per Event/Branch.
   - **Head Office (`สำนักงานใหญ่` / `CompanySetting`)**: Configured in `/admin/company` or `/hr/attendance` with default work shift **`09:00 – 18:00`** (`workStartTime`, `workEndTime`). Staff with `isHeadOffice = true` can check in at `"สำนักงานใหญ่"` on `/workspace`.
2. **1 Person per 1 Location per Day**:
   - Enforced by `@@unique([staffId, date])` on `StaffCheckIn` (using `Asia/Bangkok` calendar date).
3. **Check-in Validation & Late Tracking**:
   - Requires live WebRTC camera photo capture (no gallery upload allowed; auto-watermarked with location, timestamp, and GPS coordinates, uploaded to Cloudflare R2) + real-time GPS distance check (`distanceKm <= checkInRadiusKm`). Out-of-range check-in is blocked.
   - Snapshots the location's shift (`shiftStartTime`, `shiftEndTime`) and computes `lateMinutes` automatically if checked in after `shiftStartTime`.
4. **Check-out & Forgot Check-out Exception**:
   - Requires live camera photo + GPS.
   - If the employee is outside `checkInRadiusKm` when checking out, they must check **`☑️ ลืม Check-out จากหน้างาน (ยืนยันการ Check-out นอกพื้นที่)`** (`isForgotCheckOut = true`) with an optional reason note so HR can inspect it in `/hr/attendance`.
5. **Decoupled from Payroll Days Worked**:
   - Stored in `staff_check_ins` (`StaffCheckIn`), completely separate from `attendance` (`Attendance`), so payroll `daysWorked` calculations remain unaffected until linked in a future phase.


