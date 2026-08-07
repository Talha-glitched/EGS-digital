# CRM UX Restructure Plan

**Status:** proposal, ready to execute in phases
**Scope:** `client/src/admin/crm` — information architecture, record pages, cross-entity views, visual system
**Not in scope:** new backend features, AI automation (noted where the IA should leave room for it)

---

## 0. The one-sentence diagnosis

The CRM is organized around **how it was built** — one nav item per feature, one tab per table, one screen per team — rather than around **what a person came here to do**. Every symptom below follows from that, including the visual crowding, which is what happens when you set an entire application in 10px type to make the unplanned density fit.

Four defects, in dependency order. Fix them in this order; later ones don't hold without earlier ones.

| # | Defect | Fix |
|---|---|---|
| 1 | Vocabulary: 3–4 names per object | One noun per object, everywhere |
| 2 | Navigation: 22 destinations, status used as navigation | 9 destinations + saved views |
| 3 | Records: flat tab dumps, 3 different shells, no cross-entity view | One record shell, ≤5 counted tabs, one unified job view at 3 zoom levels |
| 4 | Visual system: 17 font sizes, 22 padding values, no scale | 6-step type scale, 4px spacing scale, 3 density tiers |

---

# Part 1 — Vocabulary

Nothing else sticks until this is done. Right now the same object has a different name in the nav, the URL, the API, and the component tree — so users can't build a mental model and developers can't either.

## 1.1 The collisions, as they exist today

| Real-world object | Nav label | Route | Data field / API | Component |
|---|---|---|---|---|
| Outreach campaign | Campaigns | `/projects` | `projectName`, `project` | `ProjectsPage`, `ProjectDetailWorkspace` |
| A won job being delivered | Ongoing Jobs | `/ongoing-jobs` | `opportunity` **and** `ongoingJob` | `OngoingJobDrawer`, `OpportunityTasksPanel`, `OngoingJobTasksPanel` |
| A finished job | Jobs Done | `/completed-jobs` | same table, `completedOnly` flag | same component |
| A person at a client | Contacts | `/people` | `lead` | `PeoplePage`, `OutreachDrawer` |
| An important contact | Key Relationships | `/relationships` | filtered contacts | `RelationshipsPage` |

Blast radius today: `opportunit*` in 28 client + 14 server files · `projectName` in 41 + 5 · `ongoingJob` in 21 + 21 · `campaign` in 97 + 35.

The word **"project"** is the worst offender: in the code it means *campaign*, in the user's head it means *job*. Every conversation about this system pays a tax for that.

## 1.2 The canonical nouns

Pick these and use them in the nav label, the URL, the API path, the DB column, the component name, and in conversation. No synonyms, no exceptions.

| Canonical noun | Definition | Replaces |
|---|---|---|
| **Company** | An organisation | (unchanged) |
| **Contact** | A person at a company | lead, people, POC, outreach target |
| **Campaign** | An outreach effort targeting many contacts | project, `projectName` |
| **Sequence** | The automated email steps inside a campaign | flow |
| **Job** | A piece of work EGS delivers, from won to closed out | opportunity, ongoing job, completed job, pipeline |
| **Phase** | A stage of work inside a job | activity, production activity, workphase |
| **Resource** | Anything schedulable: person, crew, vehicle, equipment | employee, crew, asset |
| **Supplier** | An external party EGS buys from | subcontractor, vendor |
| **Item** | Inventory / stock | material, asset |
| **Task** | An accountable action owned by a person | follow-up, to-do |

Two rules that resolve the current overlaps:

- **"Employee" is not a top-level object.** An employee is a `Resource` with `type: employee` that may be linked to a login. The separate Employees nav item merges into Resources with a type filter. (This is already how the data works — `ResourcesPage.jsx:7` — the UI just disagrees with it.)
- **"Subcontractor" is not a fifth thing.** It is a Resource linked to a Supplier. One record, two lenses.

## 1.3 Rename execution

Do it as one mechanical pass per term, each its own commit, each verified by `npm test` before the next:

1. `opportunity` → `job` (server routes, then client)
2. `ongoingJob` → `job` (collapses with the above — after this there is one job type, not two)
3. `projectName` / `project` → `campaign` (client-heavy; 41 files)
4. `lead` → `contact`
5. Route aliases: keep `/projects`, `/ongoing-jobs`, `/people` as permanent redirects so nobody's bookmarks break (the redirect pattern already exists in `CrmApp.jsx:196`).

Do **not** try to combine this with the nav restructure. One is a rename with zero behaviour change; the other changes behaviour. Keeping them separate is what makes them both safe.

---

# Part 2 — Navigation

## 2.1 What's wrong

`Sidebar.jsx:8` lists 19 items in 4 groups, plus 3 settings items = **22 destinations**. The groups are named after departments (`Leads`, `Project Management`, `Tracking`) rather than after intent, and `Tracking` is a junk drawer holding email, money, and two report pages.

Several destinations are not distinct nouns at all — they are **filters that got promoted to navigation**:

- Ongoing Jobs / Jobs Done — one component, `completedOnly` flag
- Key Relationships — a filtered view of Contacts
- Commercial Reports / Operations Reports / Analytics — three read-only surfaces, overlapping questions
- Communications / Resend Emails / Email Sequences — three doors into email
- Dashboard / Today — both answer "what should I look at now"

`designerMode` (`Sidebar.jsx:76`) already collapses the nav to 7 items for one role. That is an existing, shipped admission that 22 is too many. Generalise it.

## 2.2 The rule

> A sidebar item earns its place only if it is a **different noun**.
> Status, owner, date range, and role are **saved views**, not destinations.

## 2.3 The new tree — 9 destinations

```
  Home                    ← Dashboard + Today merged, role-aware content

  WORK
  Jobs                    ← ongoing + done, one page, status views
  Schedule                ← plan calendar + resource load, one surface, 3 pivots
  Tasks

  PIPELINE
  Companies
  Contacts                ← key relationships becomes a saved view
  Outreach                ← campaigns + sequences, one page, two tabs

  BUSINESS
  Money                   ← finance + costing + settlement
  Reports                 ← commercial + operations, tabbed

  Setup                   ← resources, inventory, suppliers, team, email, activity log
```

22 → 9. Group headings are named for **what you're doing** (Work / Pipeline / Business), not who owns the feature.

## 2.4 Saved views replace the deleted items

Each list page gets a view bar directly under the title — pills with live counts, URL-addressable so they're shareable and bookmarkable:

```
Jobs   [ Active 12 ] [ Mine 4 ] [ At risk 2 ] [ Awaiting approval 3 ] [ Done ] [ + ]
```

This is strictly better than the nav items it replaces: it shows the count *before* you click, it keeps you on one page, and users can define their own.

Ship the `+` (user-defined views) last; the built-ins alone recover everything the nav loses.

## 2.5 Role-scoped nav

Extend the `designerMode` pattern to every role. Each role sees only the nouns it acts on; everything else stays reachable through Spotlight (already built, `SpotlightSearch.jsx`) — so nothing is *lost*, it's just not *shouting*.

| Role | Sees |
|---|---|
| Designer / field | Home, Jobs, Schedule, Tasks |
| Sales | Home, Companies, Contacts, Outreach, Jobs, Tasks |
| Ops | Home, Jobs, Schedule, Tasks, Setup |
| Finance | Home, Jobs, Money, Reports |
| Admin | Everything |

---

# Part 3 — Record pages

## 3.1 What's wrong

**Twelve flat tabs on a job** (`OngoingJobDrawer.jsx:41`): Overview, Scope & Plan, Designs & Quotes, Production, Suppliers, Costing, Settlement, Closeout, Job Memory, Tasks, POC, Timeline.

Three defects in that one line:
1. **No hierarchy.** "Scope & Plan" (a phase of work) sits beside "Job Memory" (a reference log) as if they were peers.
2. **No lifecycle order.** The order doesn't match how a job actually moves.
3. **No counts.** The Company drawer puts counts on its tabs (`CompanyDetailsDrawer.jsx:62`); the Job drawer doesn't. So a user must click all 12 to discover which 9 are empty. **This is the single cheapest high-impact fix in the app.**

**Three different shells for "open a record".** A campaign opens a full page (`ProjectDetailWorkspace`), a job opens a drawer, a company opens a drawer. Same user intent, three different spatial models.

**Drawers stack on drawers on modals.** `stackLevel` is threaded through 11 call sites. Three levels deep there is no breadcrumb telling you where you are or how to get back to the job you started from.

## 3.2 One record shell

Every entity — job, company, contact, campaign, resource — opens the same structure:

```
┌────────────────────────────────────────────────────────────┐
│ IDENTITY HEADER (sticky)                                   │
│ JOB-2041 · Gulfood Hall 4 Stand          [Active] [Owner]  │
│ AED 184,000 · Install 12 Mar · 3 phases · 2 open tasks     │
├────────────────────────────────────────────────────────────┤
│ Plan 8   Do 14   Money 3   Record 22          [Actions ▾]  │
├────────────────────────────────────────────────────────────┤
│ (tab body)                                                 │
└────────────────────────────────────────────────────────────┘
```

Three hard rules:
- **≤5 tabs.** If you need a sixth, it belongs inside one of the five.
- **Every tab carries a count.** Zero-count tabs render dimmed. You should never click to find nothing.
- **The identity header never scrolls away.** It answers "what am I looking at, is it healthy, what's next" without a click.

## 3.3 Job: 12 tabs → 4, ordered by lifecycle

| New tab | Absorbs | Question it answers |
|---|---|---|
| **Plan** | Overview, Scope & Plan, phases, resource assignment | What are we building, by when, with whom? |
| **Do** | Production, Suppliers, Designs & Quotes, inventory, evidence | What's happening right now, and what's blocked? |
| **Money** | Costing, Settlement | Are we making money on this? |
| **Record** | Timeline, Job Memory, Tasks, POC, Closeout | What happened, who's accountable, what's on file? |

`Money` stays permission-gated exactly as the current `finance:read` gate does — the gate moves from two tabs to one.

## 3.4 Other records

| Record | Today | Proposed |
|---|---|---|
| Company | 7 tabs | 4: **Overview** (incl. details) · **People** · **Work** (jobs + tasks) · **Record** (email + timeline) |
| Contact | 4 tabs | 3: **Profile** (incl. relationship) · **Follow-ups** · **Record** (timeline) |
| Campaign | full page, ad-hoc sections | 3: **Audience** · **Sequence** · **Results** |

## 3.5 Fix the stack

- Max **two** overlay levels. A third navigates to a full record page instead of stacking.
- Every stacked overlay shows a back-crumb in its header: `‹ Gulfood Hall 4 Stand`.
- `Esc` closes one level, not all. Browser back does the same.

---

# Part 4 — The unified view (the thing you actually asked for)

## 4.1 It already exists, one level too low

`TodayPage.jsx:52-56` renders, for a **single activity**: approved documents, materials and stock, supplier deliveries, crew/vehicles/equipment, and evidence — all in one modal. That is exactly the unified view you want. It was just never lifted to the job level or the portfolio level.

So this is not a new concept. It's the same component at three zoom levels.

## 4.2 One component, three zoom levels

```
Zoom 1  ACTIVITY   one phase          → exists today (TodayPage modal)
Zoom 2  JOB        all phases of one job, stacked on a timeline
Zoom 3  PORTFOLIO  all phases of all jobs
```

At every zoom, a row expands to reveal the same five things: **resources · suppliers · materials · documents · time & cost logged**. Learn it once, use it everywhere.

## 4.3 Three pivots on the same data

The Schedule page is this component with a pivot toggle:

| Pivot | Rows are | Answers |
|---|---|---|
| **By job** | phases grouped under jobs | Is this job on track? |
| **By resource** | one lane per person/vehicle/crew | Is Ahmed double-booked next Tuesday? |
| **By day** | calendar columns | What's happening this week? |

This is what replaces three screens that currently show the same assignment data and don't link to each other: Resources & Time (resource-centric), Plan Calendar (date-centric), and the job's Production tab (job-centric).

## 4.4 Make conflicts clickable

`ResourcesPage` computes `conflictCount` and renders it as a number with nowhere to go. In the resource pivot, an overlap draws as **overlapping bars in the same lane** — the conflict becomes visible rather than counted, and clicking it opens both phases side by side.

---

# Part 5 — The explanation layer

Your instinct (hover explanations) is right about the problem and slightly off about the remedy: hover animations on every section become noise fast, and hand-written copy drifts out of date within a month.

Do it as **data**, so it can't drift:

```js
// crm/constants/ontology.js
job: {
  label: 'Job',
  is:   'A piece of work EGS delivers, from won to closed out.',
  from: ['campaign', 'company'],       // what creates one
  uses: ['resource', 'supplier', 'item'],
  into: ['invoice', 'report'],         // what it feeds
}
```

Rendered in three places, all generated from that one map:

1. **Page subtitle** — one sentence under every page title. (`PageHeader` already supports `subtitle`; most pages just don't pass one.)
2. **The `?` panel** — opens a short card: *what this is · what feeds it · what it feeds*, with **live links** to those screens. The links are the real value: they teach the model by letting you walk it.
3. **Empty states that teach.** `EmptyState` exists but is used to say "nothing here". It should say what the thing is for and offer the action that creates one.

Nav tooltips currently appear **only when the sidebar is collapsed** (`Sidebar.jsx:55`). Show them always for a user's first N sessions, then stop.

---

# Part 6 — The visual system

This is the "crammed / inconsistent / not enough space" problem, measured.

## 6.1 The measurements

**Font sizes in use across the JSX — 17 distinct values:**

| size | uses | | size | uses |
|---|---|---|---|---|
| `text-xs` (12px) | 706 | | `text-[13px]` | 12 |
| `text-[10px]` | 339 | | `text-lg` / `text-2xl` | 8 / 8 |
| `text-[11px]` | 267 | | `text-xl` | 6 |
| `text-sm` (14px) | 205 | | `text-[12px]` | 4 |
| `text-[9px]` | 51 | | `text-[15px]`, `text-[12.5px]` | 2, 2 |
| `text-base` | 15 | | `text-[8px]`, `text-[7px]`, `text-[13.5px]`, `text-[32px]` | 1 each |

**~1,363 of ~1,630 text elements — 84% of the app — are set at 12px or smaller.** There is 8px and 7px type shipping. That is the crowding: when everything is small, nothing is prominent, hierarchy collapses, and the only way to read the screen is to read all of it.

**Spacing:** `crm.css` is 5,602 lines using **22 distinct pixel padding values** — every integer from 1px to 12px, then 14, 15, 16, 18, 20, 22, 24, 28, 32, 48 — plus 34 distinct `gap` declarations, mixing `px` and `rem` freely, with **39 `!important` overrides** (including hard-coded `padding-top: 3px !important` on table cells).

There is no scale. Each value was chosen locally to make one component fit. That's why sizes feel inconsistent — they *are* inconsistent, ~56 arbitrary values deep.

## 6.2 The type scale — 6 steps, nothing else

| Token | px / line-height | Use |
|---|---|---|
| `--t-display` | 24 / 1.2 | Page title only |
| `--t-title` | 18 / 1.3 | Record name, section headers |
| `--t-body` | 14 / 1.5 | **Default. Table cells, form values, paragraphs.** |
| `--t-label` | 13 / 1.4 | Field labels, secondary metadata |
| `--t-meta` | 12 / 1.4 | Timestamps, counts, badges |
| `--t-micro` | 11 / 1.3 | Table column headers only (uppercase, tracked) |

**Floor: 11px, and only for uppercase headers.** Delete every 7/8/9/10px value.

The single biggest perceived improvement in the whole plan: **promote the default body size from 12px to 14px.** Rows get taller, text gets readable, and — counterintuitively — the screen feels *less* crowded, because fewer things compete at the same visual weight.

## 6.3 The spacing scale — 4px base, 7 steps

```css
--s-1:  4px    /* icon↔label, inside a badge */
--s-2:  8px    /* between related controls */
--s-3: 12px    /* table cell padding, form field gap */
--s-4: 16px    /* card padding, between form rows */
--s-6: 24px    /* between cards, section padding */
--s-8: 32px    /* between major sections */
--s-12: 48px   /* page top/bottom margin */
```

Every padding, margin, and gap in `crm.css` maps to one of these seven. If a value doesn't fit the scale, the layout is wrong — don't add an eighth token.

## 6.4 Density tiers, chosen explicitly

The current file has three densities (`crm-table`, plus two `!important` compact overrides) that were arrived at accidentally. Make them a deliberate, user-facing choice:

| Tier | Row height | Cell padding | Where |
|---|---|---|---|
| Comfortable | 48px | `--s-3` `--s-4` | Default everywhere |
| Compact | 36px | `--s-2` `--s-3` | User toggle on dense tables |
| Dense | 28px | `--s-1` `--s-2` | Opt-in only, power users |

One toggle in the toolbar, persisted per user. Delete all 39 `!important` overrides — they exist only because there was no tier system.

## 6.5 Breathing room — the specific offenders

- **Stat card rows.** Four cards in a row at `xl` (`ResourcesPage`) puts them below their comfortable width. Cap at 3 and let them breathe, or make them a single horizontal strip.
- **Read and write are interleaved.** `ResourcesPage` stacks 4 stat cards + a directory table + a live time-entry form + running timers + a 30-row history table on one scroll. The form isn't what you came for but it sits in the middle of the reading path. **Creation and editing belong behind an action, never in the reading path.**
- **Section separation.** Cards currently sit `mt-5` (20px) apart with the same border and background as their contents — no visual grouping. Use `--s-8` (32px) between major sections, and let whitespace do the separating instead of another border.
- **Max line length.** Table cells and description text run the full viewport width on wide monitors. Cap prose at ~72 characters.
- **Every page reinvents its toolbar.** Some pages use the shared `AdvancedFilterPopover`; `ResourcesPage` rolls its own search + type select. One `PageToolbar` component (it exists — `primitives.jsx:20`), used everywhere, so filtering behaves identically on every screen.

---

# Part 7 — Execution order

Six phases. Each is independently shippable, each ends at a state where the app works. Do not start a phase before the one above it is merged.

**Precondition:** the working tree must be clean before Phase 1. `crm.css` and `primitives.jsx` currently have uncommitted edits — the exact files Phase 1 rewrites. Commit or stash first, and branch per phase.

| Phase | Work | Gate | Felt impact |
|---|---|---|---|
| **1** | Type scale, spacing scale, density tiers; delete the 39 `!important`s; breathing-room fixes (6.5) | none | The app stops looking crammed |
| **2** | Canonical noun list + ontology map (one artifact), then rename one term per commit | **noun list sign-off** | No visible change; unblocks 3–6 |
| **3** | Nav 22 → 9, saved-view pills with counts, role scoping — Sidebar touched once | **nav tree sign-off** | Orientation solved |
| **4** | One record shell; job 12 → 4 tabs with counts; company 7 → 4; stack depth limit + breadcrumbs | none | Detail-page overwhelm solved |
| **5** | Unified schedule view — one component, three pivots | none | The core ask |
| **6** | Render the explanation layer from Phase 2's map: subtitles, `?` panels, teaching empty states | none | System explains itself |

## Why this order

- **Rename before restructure.** Doing Phase 2 after Phases 3–5 means touching every moved file twice.
- **Visual before structural.** Phase 1 works at the token layer, which is orthogonal to component structure — later restructuring inherits the tokens for free. It also front-loads the most visible improvement.
- **Ontology map is written in Phase 2, rendered in Phase 6.** Defining canonical nouns and defining "what feeds what" is the same exercise; splitting them would mean doing the thinking twice.
- **Tab counts live in Phase 4, not earlier.** Adding counts to the current 12 tabs is ~2 hours of work that Phase 4 deletes. Only pull it forward if Phase 4 is more than a couple of weeks out.
- **Sidebar and record shell are each touched exactly once.** Role scoping is folded into Phase 3, and stack/breadcrumb work into Phase 4, rather than being separate passes over the same files.

Phases 1 and 2 are fully orthogonal — one changes CSS and classNames, the other changes identifiers — so they can be run in parallel if review bandwidth allows. Everything from Phase 3 onward is strictly sequential.

## Leaving room for AI automation

Two decisions here matter for the automation layer later, so make them now:

- **The ontology map (Part 5) is the schema an agent needs** to answer "what feeds this job" without hard-coded prompts. Build it as data, not copy.
- **Saved views (Part 2.4) are queries.** If they're expressed as serialisable filter objects rather than bespoke page state, an agent can create, run, and subscribe to them — "tell me when a job enters At risk" is then a saved view plus a trigger, not a new feature.
