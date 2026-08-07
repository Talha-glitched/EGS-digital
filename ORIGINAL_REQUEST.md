# Original User Request

## Initial Request — 2026-08-06T19:18:04+04:00

# Teamwork Project Prompt — EGS ERP UI/UX Overhaul

Complete front-end usability refactoring for EGS ERP, bringing traditional ERP-grade depth (65 PostgreSQL tables, multi-entity relationships, versioned quotes/designs, inventory asset movements, costing) into a modern, 1-click split-pane interface.

Working directory: `/Users/mac/Desktop/EGS/EGS/EGS-digital`

## 1. Traditional ERPs (ERPNext / Odoo) vs. EGS ERP Superior UX

| Feature / Dimension | Traditional ERPs (ERPNext / Odoo) | EGS ERP Superior UX Solution |
|---|---|---|
| **Navigation & Context** | Deep page hierarchies (`Sales Order` → `Job` → `Item` → `PO`). You lose context every time you click. | **Split-Pane Master-Detail (320px List + 680px+ Reader)**. Clicking any record updates the detail pane in 0ms without page reloads. |
| **Document State** | Static child-table tabs (`Items`, `Taxes`, `Accounting`, `Connections`). Must click all tabs to check status. | **Stage-Aware Status Rows (The Job Spine)**. Live micro-summaries right on the row line (`Suppliers · 1 delayed · AED 41,250`). Auto-expands based on `summary_stage`. |
| **Cross-Job Risk Management** | 10 separate list views (Sales Orders, Work Orders, POs, Invoices). Requires opening 14 jobs × 12 tabs = 168 clicks. | **Single-Screen Control Tower Matrix**. Jobs down the left, 8 risk dimensions across the top. Color-coded cells (`✓`, `late`, `unassigned`, `owed`). |
| **Data Entry & Forms** | Generic form dialogs requiring manual selection of Customer, Job, Lead, and Item IDs. | **In-Line Auto-Context Action Bars**. Buttons (`+ Task`, `+ Job Note`, `+ PO`, `+ Revision`) auto-bind all 6 parent IDs from active selection. |
| **Modals & Overlays** | 35+ popups, nested drawers, and modal dialogs that stack and obscure background content. | **0 Stacked Overlays**. All forms and detail views render inline within the split pane or side inspection column. |
| **Mobile & Touch** | Small 28px buttons, cramped data tables, broken mobile layouts. | **UI-UX-Pro-Max 44px Minimum Touch Targets**. High contrast, clean typography (13px+ base body), touch-friendly action chips. |

## 2. Detailed View Specifications

### View 1: Control Tower Matrix (`/admin/crm/jobs?view=matrix`)
- **Header Actions**:
  - `[ View Modes: Matrix | Board | Calendar | List ]`
  - `[ Filter by Stage: All | Inquiry | Quotation | In Production | Payment ]`
  - `[ Search Jobs... ]`
- **Matrix Grid Structure**:
  - Left Column: Active Ongoing Jobs (e.g. *GITEX Stand 2026*, *HCT Graduation*, *Philips Exhibition*) with Job #, Client, and AED Value.
  - Risk Columns across Top: `Design`, `Quote`, `Production`, `Suppliers`, `Crew`, `Materials`, `Handover`, `Money`.
  - Cell Badges:
    - 🟢 `✓` (Healthy / Completed)
    - 🔴 `Late` / `Owed` (Hard Blocker or Overdue Payment)
    - 🟧 `Rev 3 Pending` (Client Approval Delay >48h)
    - 🟨 `Unassigned` (Installation within 5d without Crew)
    - ⚪ `—` (Not Applicable for current stage)
- **Click Interaction**: Clicking any matrix cell immediately switches to Split-Pane view with that exact job and row highlighted!

### View 2: Stage-Aware Job Spine & Split Pane (`/admin/crm/jobs?view=spine`)
- **Left Pane (320px)**: List of Ongoing Jobs with client logo, AED budget, and current stage badge (`inquiry`, `quotation`, `in_production`, `waiting_payment`, `completed`).
- **Right Detail Pane (680px+)**:
  - Top Summary Bar: Job Title, Customer Organization, Assigned Manager, Stage Progress Bar (`[Inquiry] → [Quotation] → [In Production] → [Payment]`).
  - Action Toolbar: `[ + Task ]` `[ + Log Note ]` `[ + Issue Revision ]` `[ + Add PO ]` `[ + Assign Crew ]`.
  - **10 Status Rows**:
    1. `Client & POC` — Contact person, roles, campaign source, email thread.
    2. `Brief & Requirements` — Scope lines, client brief notes, version history.
    3. `Design Revisions` — Active design PDF, version history (v1, v2, v3), client approval status.
    4. `Quotation Revisions` — Quoted AED total, scope items, discount, client sign-off decision.
    5. `Production Plan` — Work packages, phases, locations, physical delivery activities.
    6. `Supplier Commitments (POs)` — Linked POs, supplier names, AED cost, delivery status (`delivered`, `delayed`).
    7. `Crew & Resources` — Assigned employees, contractors, vehicles, equipment.
    8. `Material Movements` — Stock reservations, barcode asset movements, UOM quantities.
    9. `Site & Handover Evidence` — Installation photos, snag lists, customer sign-off photos.
    10. `Finances & Costing` — Quoted vs. Actual Cost, gross margin AED/%, milestone invoices, Zoho Books sync status.

### View 3: Unified People Workspace (`/admin/crm/people`)
- **Top Filter Chips**: `[ All Contacts (3,079) ]` `[ Companies (1,172) ]` `[ Key Relationships (13) ]`.
- **Split-Pane Layout**:
  - Left List (320px): Name, Company, Email, Role, Contact Badge.
  - Right Reader (680px+): Person overview, organization role history, campaign participation, email reply history, ongoing jobs, and active tasks.

### View 4: Unified Operations Workspace (`/admin/crm/operations`)
- **Segmented Control Tabs**: `[ Suppliers ]` `[ Inventory & Assets ]` `[ Resources & Time ]` `[ Employees ]`.
- **Split-Pane Layout**:
  - Left List (320px): Record list with search & category filters.
  - Right Reader (680px+): Full operational profile, capabilities, active PO commitments, stock movements, or project time logs.

## 3. Requirements

### R1. UI-UX-Pro-Max Design System & Touch Targets
- Minimum 44px hit targets across all interactive controls (`crm-input`, `crm-btn`, `crm-select`, row triggers).
- Clean typography hierarchy (13px body text, 14px inputs, 16px/18px section headers, 24px page title).
- High-contrast WCAG 4.5:1 text pairs.

### R2. 0-Modal Split-Pane Workspace Framework
- Eliminate all 37 overlay popups and modal popovers in favor of inline split-pane readers.
- Fast action buttons (`+ Task`, `+ Note`, `+ Revision`) open inline form drawers within the detail pane without stacking popups.

### R3. Deterministic Risk Matrix & Stage-Aware Job Spine
- Build the Control Tower Matrix displaying all active jobs against the 8 risk dimensions.
- Build the 10-Row Job Spine with auto-expansion based on `summary_stage`.

## 4. Acceptance Criteria

- [ ] Working tree verified clean before implementation (`git status` clean).
- [ ] `npm run build` in `client/` succeeds with zero errors.
- [ ] `npm test` in `server/` passes 100% of route permission checks and API endpoints.
- [ ] Zero modal overlays remain — all details render inline in the split pane.
- [ ] Every button, input, and touch region meets the 44px tap target standard.
