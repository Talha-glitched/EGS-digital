# EGS ERP UI/UX Overhaul — Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Testing Philosophy & Core Principles

The testing framework for the EGS ERP UI/UX Overhaul adheres to four core testing principles:

1. **Opaque-Box & Behavior-Based Testing**:
   Tests validate observable contracts, user-facing interactions, design system specifications, and API data structures without relying on internal private state or non-standard side-effects.

2. **Progressive Testability & Isolation**:
   Every test case is self-contained and isolated. No test relies on preceding test execution order, and setup state is instantiated deterministically per test run.

3. **Explicit Authoritative Output Derivation**:
   Expected outputs for every test case are strictly derived from authoritative specifications defined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

4. **Zero-Modal & UI-UX-Pro-Max Compliance**:
   Tests enforce the 0-Modal Split-Pane Framework (modal overlay count = 0, inline 680px+ reader detail views, inline auto-context action form drawers) and the 44px minimum tap target standard across all interactive controls (`crm-btn`, `crm-input`, `crm-select`, `crm-row-trigger`).

---

## 2. Test Runner Invocation

### Executing Full Test Suite
To run the full unit and E2E test suite (including Tiers 1-4):

```bash
cd server
npm test
```

Underneath, `npm test` executes the Node.js native test runner (`node:test` + `node:assert/strict`):

```bash
node --test tests/*.test.js
```

---

## 3. 4-Tier Test Architecture

```
                               ┌──────────────────────────────────────────┐
                               │  Tier 4: Real-World Workload Scenarios   │
                               │  (End-to-End Quoting -> Payment Flow)    │
                               └────────────────────┬─────────────────────┘
                                                    │
                               ┌────────────────────┴─────────────────────┐
                               │  Tier 3: Cross-Feature Combinations      │
                               │  (Matrix Click -> Spine Highlight, POs)  │
                               └────────────────────┬─────────────────────┘
                                                    │
                               ┌────────────────────┴─────────────────────┐
                               │  Tier 2: Boundary & Corner Cases         │
                               │  (Empty States, Max Length, 44px Targets)│
                               └────────────────────┬─────────────────────┘
                                                    │
                               ┌────────────────────┴─────────────────────┐
                               │  Tier 1: Feature Coverage Suite          │
                               │  (35 Test Cases across 14 Features)      │
                               └──────────────────────────────────────────┘
```

### Test Files Location
- `server/tests/e2e_tier1_feature_coverage.test.js` — Tier 1 Feature Coverage Suite (35 tests)
- `server/tests/e2e_tier2_boundaries.test.js` — Tier 2 Boundary & Corner Cases Suite (15 tests)
- `server/tests/e2e_tier3_cross_feature.test.js` — Tier 3 Cross-Feature Combinations Suite (7 tests)
- `server/tests/e2e_tier4_workloads.test.js` — Tier 4 Real-World Workload Scenarios Suite (5 tests)

---

## 4. Feature Coverage Matrix (Features 1 – 14)

| Feature # | Feature Description | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Workload) |
|---|---|---|---|---|---|
| **F1** | UI-UX-Pro-Max Design System Rules (44px, typography, contrast) | `test_feature1_min_touch_target_44px_css_contracts`, `test_feature1_typography_hierarchy_contracts`, `test_feature1_wcag_contrast_pair_specifications` | `test_boundary_44px_tap_target_box_sizing` | Verified in all cross-tests | Verified in Full Acceptance Checklist |
| **F2** | 0-Modal Split-Pane Framework | `test_feature2_zero_modal_split_pane_layout`, `test_feature2_inline_action_form_drawers`, `test_feature2_auto_bind_parent_context` | `test_boundary_zero_modal_overlay_guard`, `test_boundary_inline_drawer_missing_parent_context_failsafe` | `test_cross_inline_po_submission_matrix_update`, `test_cross_inline_task_creation_updates_people_and_spine` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F3** | Control Tower Matrix Header Actions | `test_feature3_matrix_header_view_modes`, `test_feature3_matrix_header_stage_filters`, `test_feature3_matrix_header_search_input` | `test_boundary_special_characters_in_search_query` | `test_cross_matrix_cell_click_to_spine_highlight` | `test_tier4_multi_entity_concurrent_job_risk_management` |
| **F4** | Control Tower Matrix Grid Structure | `test_feature4_matrix_grid_320px_left_column`, `test_feature4_matrix_grid_8_risk_columns` | `test_boundary_empty_state_rendering_matrix`, `test_boundary_max_string_length_job_title` | `test_cross_matrix_cell_click_to_spine_highlight` | `test_tier4_multi_entity_concurrent_job_risk_management` |
| **F5** | Risk Dimension Cell Badges (🟢 ✓, 🔴 Late, 🟧 Rev Pending, 🟨 Unassigned, ⚪ —) | `test_feature5_risk_badge_green_healthy`, `test_feature5_risk_badge_red_late_owed`, `test_feature5_risk_badge_orange_rev_pending`, `test_feature5_risk_badge_yellow_unassigned`, `test_feature5_risk_badge_grey_na` | `test_boundary_risk_matrix_exact_48h_pending_revision`, `test_boundary_risk_matrix_exact_5d_unassigned_crew` | `test_cross_inline_po_submission_matrix_update`, `test_cross_crew_assignment_clears_yellow_matrix_badge` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow`, `test_tier4_supplier_delay_mitigation_workflow`, `test_tier4_crew_unassigned_urgency_escalation` |
| **F6** | Matrix Cell Navigation (0ms switch to Spine view with row highlight) | `test_feature6_matrix_cell_click_navigation_spine` | `test_boundary_0ms_view_switching_performance` | `test_cross_matrix_cell_click_to_spine_highlight` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F7** | Job Spine Left Pane (320px list, client logo, AED budget, stage badge) | `test_feature7_job_spine_left_pane_320px_list` | `test_boundary_empty_state_rendering_spine` | `test_cross_people_workspace_contact_to_job_spine_flow` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F8** | Job Spine Right Reader Pane (680px+, top summary bar, 5 action toolbar buttons) | `test_feature8_job_spine_top_summary_bar`, `test_feature8_job_spine_action_toolbar` | `test_boundary_empty_state_rendering_spine` | `test_cross_inline_po_submission_matrix_update`, `test_cross_inline_task_creation_updates_people_and_spine` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F9** | 10-Row Stage-Aware Status Rows | `test_feature9_job_spine_10_status_rows_order`, `test_feature9_job_spine_status_row_micro_summaries` | `test_boundary_max_string_length_scope_notes`, `test_boundary_negative_aed_financial_costing` | `test_cross_matrix_cell_click_to_spine_highlight`, `test_cross_operations_inventory_update_to_spine_materials` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F10** | Stage Auto-Expansion Engine | `test_feature10_stage_auto_expansion_inquiry`, `test_feature10_stage_auto_expansion_quotation`, `test_feature10_stage_auto_expansion_in_production`, `test_feature10_stage_auto_expansion_waiting_payment` | `test_boundary_rapid_stage_auto_expansion_switches` | `test_cross_stage_transition_auto_expansion_flow` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F11** | Unified People Workspace Header Chips | `test_feature11_people_workspace_filter_chips` | `test_boundary_empty_state_rendering_people` | `test_cross_people_workspace_contact_to_job_spine_flow` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F12** | Unified People Workspace Split Pane | `test_feature12_people_workspace_320px_left_list`, `test_feature12_people_workspace_680px_reader_overview`, `test_feature12_people_workspace_680px_reader_activities` | `test_boundary_empty_state_rendering_people` | `test_cross_people_workspace_contact_to_job_spine_flow`, `test_cross_inline_task_creation_updates_people_and_spine` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F13** | Unified Operations Workspace Tabs | `test_feature13_operations_segmented_tabs` | `test_boundary_empty_state_rendering_operations` | `test_cross_operations_inventory_update_to_spine_materials` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
| **F14** | Unified Operations Workspace Split Pane | `test_feature14_operations_320px_left_list`, `test_feature14_operations_680px_reader_suppliers`, `test_feature14_operations_680px_reader_inventory`, `test_feature14_operations_680px_reader_resources_employees` | `test_boundary_empty_state_rendering_operations` | `test_cross_operations_inventory_update_to_spine_materials` | `test_tier4_quoting_to_production_to_payment_end_to_end_workflow` |
