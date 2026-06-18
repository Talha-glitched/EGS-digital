# EGS Proprietary Lead Engine & ROI CRM Blueprint

**System Platform:** MERN Stack (MongoDB, Express.js, React, Node.js)

**Primary Integration Architecture:** Direct Node.js SMTP Senders & ImapFlow Listeners

**Target Matrix:** Graduation Ceremonies, Exhibition Stands, Retail Branding, Interior Fit-Outs

---

## 1. Directory Tree & Frontend Application Architecture

```
📁 frontend/src/
├── 📁 components/
│   ├── 📁 layout/
│   │   ├── Sidebar.jsx                 # Main CRM application navigation
│   │   └── TopNavbar.jsx               # Quick search, notifications, and profile controls
│   ├── 📁 wizards/
│   │   ├── CampaignInitWizard.jsx      # Step-by-Step Project Setup & Target Companies Upload
│   │   ├── DataBlenderWizard.jsx       # Step-by-Step Multi-Source Lead Upload & Field Mapping
│   │   └── SequenceBuilder.jsx         # Time-delayed email drip configuration canvas
│   ├── 📁 analytics/
│   │   ├── CoverageMetricsBanner.jsx  # Multi-bar target discovery & response tracking dashboard
│   │   └── VendorPerformanceGrid.jsx   # Side-by-side performance matrix (Apollo vs Hunter vs Lusha)
│   ├── 📁 leads/
│   │   ├── LeadFilterToolbar.jsx       # Campaign, Tool Source, and Delivery Status filters
│   │   └── LeadTableView.jsx           # Master table displaying pagination, metadata, and status badges
│   └── 📁 inbox/
│       ├── UnifiedInboxWorkspace.jsx   # Two-column layout (Left: Reply List, Right: Active Thread)
│       └── ConversationThreadView.jsx  # Scrollable historical timeline of outbound steps + incoming text
└── 📁 pages/
    ├── GlobalDashboard.jsx             # Combined view of macro ROI, active queues, and top channels
    └── ProjectDetailWorkspace.jsx      # Targeted campaign workspace linking metrics, wizard, and lead tables

```

---

## 2. Complete Functional Requirements (FR)

### 2.1 Project Initiation & Target Account Ingestion Wizard

* **FR-1.1 (Campaign Context Initialization):** The interface must provide a clean visual initialization panel to register a new target campaign linked to a concrete UAE commercial milestone (e.g., *Gitex 2026*, *Arab Health 2026*, *Downtown Design Outreach*).
* **FR-1.2 (Baseline Budget Setup):** The initialization wizard must compel the user to enter fixed campaign expenses during creation, including a calculated fractional percentage of monthly Apollo/Hunter/Lusha tool licenses, distinct outbound domain purchases, and specific staff hours assigned.
* **FR-1.3 (Master Target Account Import):** The system must accept an initial `.csv` or `.xlsx` upload of companies that EGS explicitly targets for that event. Required import parameters are: `Company Name`, `Domain / Website URL`, `Corporate Industry`, and optional contextual data such as assigned `Booth/Stand Number`.
* **FR-1.4 (Global Directory Sync):** The backend database controller must test incoming domains against a global master repository. If a company already exists from past projects, its historical record must be linked to the new project without altering its original baseline.

### 2.2 Multi-Format Data Blender & Deduplication Engine

* **FR-2.1 (Polymorphic File Processing):** The ingestion tier must cleanly process both a manually consolidated master sheet or individual, unaltered raw export lists directly fetched from Apollo, Hunter, or Lusha.
* **FR-2.2 (Dynamic Visual Header Canvas):** For raw provider exports, the React UI must display an interactive field-mapping canvas. The application must auto-detect obvious naming profiles, while allowing users to map arbitrary headers manually (e.g., routing Lusha’s `Contact First Name` column to internal database parameter `name`).
* **FR-2.3 (Multi-Layer Data Blender Routing):** The backend parsing service must route every individual lead record through a rigorous matching and validation protocol:
* **Layer 1 (Domain Normalization):** Strip protocols, white-spaces, subdirectories, and prefixes (e.g., converting `HTTPS://WWW.ALFUTTAIM.COM/SERVICES/INDEX.HTML` down to a clean string: `alfuttaim.com`) before checking targets.
* **Layer 2 (Company Target Resolution):** Match the lead’s normalized domain against active target companies inside the project. If matched, append the contact to that specific `companyId`.
* **Layer 3 (Contact Duplicate Compression):** Check if the target email address is already present inside the campaign database. If it exists, skip duplicating the document; instead, push the current file's vendor name into a string array field named `sources` (e.g., establishing a single point of contact flagged as `["Apollo", "Lusha"]`).
* **Layer 4 (Primary Tool Attribution):** The sourcing channel that successfully documents a brand-new contact into the database layer first must be permanently set as the `primarySource` for accurate diagnostic analytics.



### 2.3 Conversational Drip Automation & Dynamic Stop-Sequences

* **FR-3.1 (Multi-Stage Drip Matrix):** Users must be able to visually string together complex multi-step messaging structures with distinct day delays (e.g., Day 1: Concept Pitch ➔ Day 4: Portfolio Showcase ➔ Day 9: Local Client Reference).
* **FR-3.2 (OpenAI Personalization Engine):** The system backend must communicate with the OpenAI API using an active organization key. The platform will dynamically construct tailored messaging variations based on metadata values stored on the target lead’s schema.
* **FR-3.3 (Automated Sequence Freeze):** If a prospect sends a reply or books an appointment, the automation thread for that specific contact must freeze, pending emails must be purged from the active queue, and their system status must instantly change to `Replied`.
* **FR-3.4 (Semantic Opt-Out Parsing):** To preserve an organic, 1-to-1 look, no unsubscribe links or footers will be appended to emails. The inbox listener must route incoming replies through a text evaluation filter via OpenAI to look for negative intent (e.g., *"not interested," "remove me," "wrong person"*). Detected contacts must be marked as `Opted Out` and blacklisted from all concurrent or future campaigns.

### 2.4 Delivery Failures & Real-Time Bounce Control

* **FR-4.1 (Asynchronous IMAP Mailbox Watcher):** The Node.js application layer must run an active background connection via an IMAP listener channel (e.g., using `ImapFlow`) to monitor outbox accounts for delivery anomalies.
* **FR-4.2 (Automated Recipient Blacklisting):** When automated diagnostic alerts from "Mail Delivery Subsystems" or "Postmaster" addresses hit the inbox, the listener service must extract the broken recipient email address from the message body and update its state to `Bounced / Invalid`.
* **FR-4.3 (Live Queue Purging):** Any contact transitioned to a `Bounced / Invalid` state must be instantly scrubbed from any active delivery steps to safeguard the health of your primary domain.

### 2.5 Variable Ingestion Ledgers & Macro ROI Computations

* **FR-5.1 (Fixed Cost Accounting Dashboard):** The application must provide a secure financial portal where admins input static overhead data, including monthly subscription fees, domain maintenance costs, and dedicated labor variables.
* **FR-5.2 (Dynamic OpenAI Transaction Logger):** For every contextual message drafted by artificial intelligence, the system must calculate token usage and convert that consumption into a precise fiscal value pinned to that specific lead profile.
* **FR-5.3 (Aggregate Project Cost Accumulator):** A background script must aggregate data models to determine precise campaign outlays:

$$\text{Total Campaign Cost} = \text{Allocated Platform Tool Overhead} + \sum(\text{OpenAI Token Consumption Cost}) + \text{Domain Fixed Costs}$$


* **FR-5.4 (Closed Revenue Logging):** Sales reps must be able to input actual closed contract earnings won from targeted accounts (e.g., logging a finalized AED 65,000 corporate exhibition package) and attribute it to the driving campaign.
* **FR-5.5 (Absolute ROI Output):** The analytics module must synthesize total costs against closed revenue to present clear yield values:

$$\text{Campaign ROI (\%)} = \left( \frac{\text{Aggregated Revenue Won} - \text{Total Campaign Cost}}{\text{Total Campaign Cost}} \right) \times 100$$



### 2.6 Comparative Analytics Dashboard

* **FR-6.1 (Data Coverage Progress Tracking):** Every individual project view must feature live tracking charts showing data discovery metrics:
* *POC Discovery Progress:* $\frac{\text{Target Companies containing } \ge 1 \text{ Valid POC}}{\text{Total Target Companies Initially Uploaded}} \times 100$
* *Campaign Interaction Progress:* $\frac{\text{Target Companies with a 'Replied' Status}}{\text{Total Target Companies Initially Uploaded}} \times 100$


* **FR-6.2 (Sourcing Tool Performance Matrix):** The analytics screen must compile tracking pixel opens, click responses, bounces, and revenue fields to produce a side-by-side performance table evaluating `Apollo` vs. `Hunter` vs. `Lusha`.

---

## 3. Comprehensive Non-Functional Requirements (NFR)

### 3.1 Deliverability, Performance & Anti-Spam Guardrails

* **NFR-3.1.1 (Humanized Sequential Outbox Throttling):** Outbound message traffic must never be sent in bulk concurrent bursts. Outbound requests must be pushed to an isolated background task executor (e.g., `BullMQ` or `Agenda`). The queue must process items one by one, injecting a randomized, variable cooling delay between 60 and 100 seconds after every email sent to match real human behavior.
* **NFR-3.1.2 (Daily Output Cap Restriction):** To protect the corporate reputation of your primary workspace domains, the platform must enforce a hardcoded, unalterable limit of 150 cold outreach messages maximum per day per active mailbox profile.
* **NFR-3.1.3 (Localized Temporal Delivery Windows):** The message dispatcher must run exclusively during standard UAE business hours (Monday through Friday, between 08:30 AM and 05:30 PM Gulf Standard Time / UTC+4). Messages generated outside this window must sleep until the next valid morning window.
* **NFR-3.1.4 (Asynchronous Analytics Computation):** Multi-source calculation routines and deep cross-collection data aggregations must not run on live user page requests. Financial dashboards must use cached database results computed by a background cron job running once every 4 hours, keeping screen load times fast and highly responsive.

### 3.2 UI/UX Wizard Design Paradigm

* **NFR-3.2.1 (UI/UX Step-by-Step Wizard Architecture):** Complex tasks—such as launching a campaign, mapping custom spreadsheet headers, or building messaging stages—must be split into progressive step wizards using React Stepper layers instead of prolonged single-page forms. Visual indicators, helpful inline tips, clear system labels, and immediate error handling elements must guide operators smoothly through administrative sequences.

---

## 4. Normalized Technical Database Reference Schemas (MongoDB)

### 4.1 `companies` Collection Model

```json
{
  "validator": {
    "$jsonSchema": {
      "bsonType": "object",
      "required": ["companyName", "domain", "industry", "projectsAssociated", "globalStatus"],
      "properties": {
        "_id": { "bsonType": "objectId" },
        "companyName": { "bsonType": "string" },
        "domain": { "bsonType": "string" }, 
        "industry": { "bsonType": "string" },
        "boothNumber": { "bsonType": "string" },
        "projectsAssociated": {
          "bsonType": "array",
          "items": { "bsonType": "objectId" }
        },
        "globalStatus": { 
          "enum": ["Lead", "Active Prospect", "Client Partner", "Blacklisted"] 
        },
        "createdAt": { "bsonType": "date" },
        "updatedAt": { "bsonType": "date" }
      }
    }
  }
}

```

### 4.2 `leads` Collection Model

```json
{
  "validator": {
    "$jsonSchema": {
      "bsonType": "object",
      "required": ["companyId", "campaignId", "email", "name", "sources", "primarySource", "deliveryStatus"],
      "properties": {
        "_id": { "bsonType": "objectId" },
        "companyId": { "bsonType": "objectId" },
        "campaignId": { "bsonType": "objectId" },
        "email": { "bsonType": "string" },
        "name": { "bsonType": "string" },
        "designation": { "bsonType": "string" },
        "sources": {
          "bsonType": "array",
          "items": { "bsonType": "string" }
        },
        "primarySource": { "bsonType": "string" },
        "deliveryStatus": {
          "enum": ["Pending Inqueue", "Emailed Outbound", "Bounced / Invalid", "Opted Out", "Replied"]
        },
        "financialMetrics": {
          "bsonType": "object",
          "required": ["tokensConsumed", "calculatedAiCostUSD"],
          "properties": {
            "tokensConsumed": { "bsonType": "int" },
            "calculatedAiCostUSD": { "bsonType": "double" }
          }
        },
        "trackingMetrics": {
          "bsonType": "object",
          "required": ["emailsDeliveredCount", "isOpened", "totalOpenCount"],
          "properties": {
            "emailsDeliveredCount": { "bsonType": "int" },
            "isOpened": { "bsonType": "boolean" },
            "totalOpenCount": { "bsonType": "int" },
            "lastOpenTimestamp": { "bsonType": "date" }
          }
        }
      }
    }
  }
}

```

### 4.3 `campaigns` Collection Model

```json
{
  "validator": {
    "$jsonSchema": {
      "bsonType": "object",
      "required": ["projectName", "targetCompaniesCount", "companiesWithPocsFound", "companiesRespondedCount", "financialLedger", "status"],
      "properties": {
        "_id": { "bsonType": "objectId" },
        "projectName": { "bsonType": "string" },
        "targetCompaniesCount": { "bsonType": "int" },
        "companiesWithPocsFound": { "bsonType": "int" },
        "companiesRespondedCount": { "bsonType": "int" },
        "financialLedger": {
          "bsonType": "object",
          "required": ["allocatedToolBudget", "accumulatedOpenAiCost", "totalProjectCost", "validatedRevenueWon"],
          "properties": {
            "allocatedToolBudget": { "bsonType": "double" },
            "accumulatedOpenAiCost": { "bsonType": "double" },
            "totalProjectCost": { "bsonType": "double" },
            "validatedRevenueWon": { "bsonType": "double" }
          }
        },
        "status": { "enum": ["Active Planning", "Active Campaigning", "Completed", "Archived"] },
        "createdAt": { "bsonType": "date" }
      }
    }
  }
}

```

---

## 5. Production-Ready Tailwind CSS React Components

### 5.1 Status Badge & Sourcing Tag Renderer (`LeadTableComponents.jsx`)

```jsx
import React from 'react';
import { Mail, CheckCircle, AlertTriangle, XCircle, Send } from 'lucide-react';

export const DeliveryStatusBadge = ({ status }) => {
  const styles = {
    "Pending Inqueue": { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <Mail className="w-3.5 h-3.5 mr-1" /> },
    "Emailed Outbound": { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: <Send className="w-3.5 h-3.5 mr-1" /> },
    "Bounced / Invalid": { bg: "bg-red-50 text-red-700 border-red-200", icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" /> },
    "Opted Out": { bg: "bg-gray-100 text-gray-700 border-gray-300", icon: <XCircle className="w-3.5 h-3.5 mr-1" /> },
    "Replied": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> }
  };

  const current = styles[status] || { bg: "bg-gray-50 text-gray-600 border-gray-200", icon: null };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${current.bg}`}>
      {current.icon}
      {status}
    </span>
  );
};

export const SourceAttributionChips = ({ sources, primarySource }) => {
  const toolStyles = {
    Apollo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Hunter: "bg-orange-50 text-orange-700 border-orange-200",
    Lusha: "bg-cyan-50 text-cyan-700 border-cyan-200"
  };

  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((source) => {
        const isPrimary = source === primarySource;
        return (
          <span 
            key={source} 
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${toolStyles[source] || "bg-gray-50 text-gray-600"} ${isPrimary ? 'ring-1 ring-offset-1 ring-slate-400' : ''}`}
            title={isPrimary ? "Primary Discovery Source" : "Secondary Data Enricher"}
          >
            {source}
            {isPrimary && <span className="w-1 h-1 ml-1 bg-slate-700 rounded-full" />}
          </span>
        );
      })}
    </div>
  );
};

```

### 5.2 Campaign Segmented Lead Management Framework (`LeadTableContainer.jsx`)

```jsx
import React, { useState } from 'react';
import { Search, Filter, BarChart2, Layers } from 'lucide-react';
import { DeliveryStatusBadge, SourceAttributionChips } from './LeadTableComponents';

export default function LeadTableContainer({ leadsData, campaignsList }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [campaignFilter, setCampaignFilter] = useState('All');

  // Filter Pipeline Logic Cascades
  const filteredLeads = leadsData.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || lead.deliveryStatus === statusFilter;
    const matchesSource = sourceFilter === 'All' || lead.sources.includes(sourceFilter);
    const matchesCampaign = campaignFilter === 'All' || lead.campaignId === campaignFilter;
    
    return matchesSearch && matchesStatus && matchesSource && matchesCampaign;
  });

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Search & Comprehensive Segmented Filtering Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaign leads or target profiles..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* CAMPAIGN CATEGORIZATION SELECTOR */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Campaign Focus:</span>
            <select 
              className="bg-transparent focus:outline-none font-semibold text-slate-800"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
            >
              <option value="All">All Active Exhibitions</option>
              {campaignsList.map(camp => (
                <option key={camp._id} value={camp._id}>{camp.projectName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select 
              className="bg-transparent focus:outline-none font-semibold text-slate-800"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending Inqueue">Pending Inqueue</option>
              <option value="Emailed Outbound">Emailed Outbound</option>
              <option value="Bounced / Invalid">Bounced / Invalid</option>
              <option value="Opted Out">Opted Out</option>
              <option value="Replied">Replied</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Sourced Via:</span>
            <select 
              className="bg-transparent focus:outline-none font-semibold text-slate-800"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="All">All Extraction Tools</option>
              <option value="Apollo">Apollo</option>
              <option value="Hunter">Hunter</option>
              <option value="Lusha">Lusha</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Lead Dashboard Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Point of Contact</th>
              <th className="px-6 py-4">Target Account Name</th>
              <th className="px-6 py-4">Enrichment Sources</th>
              <th className="px-6 py-4">Outreach Funnel State</th>
              <th className="px-6 py-4 text-right">Accrued AI Cost</th>
              <th className="px-6 py-4 text-center">Engagement History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredLeads.map((lead) => (
              <tr key={lead._id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <div className="text-sm font-bold text-slate-800">{lead.name}</div>
                  <div className="text-xs text-slate-400 font-medium">{lead.designation || 'Corporate Decision Maker'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-slate-700">{lead.companyName}</div>
                  <div className="text-xs text-slate-400 font-mono">{lead.email}</div>
                </td>
                <td className="px-6 py-4">
                  <SourceAttributionChips sources={lead.sources} primarySource={lead.primarySource} />
                </td>
                <td className="px-6 py-4">
                  <DeliveryStatusBadge status={lead.deliveryStatus} />
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs text-slate-900 font-bold">
                  ${lead.financialMetrics.calculatedAiCostUSD.toFixed(4)}
                </td>
                <td className="px-6 py-4 text-center">
                  {lead.trackingMetrics.isOpened ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold">
                      {lead.trackingMetrics.totalOpenCount} Opens detected
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 font-medium">Unopened</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-8 text-sm text-slate-400 font-medium">
                  No records located within the selected campaign segmentation segment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

### 5.3 Integrated Workspace Inbox Panel (`UnifiedInboxWorkspace.jsx`)

```jsx
import React, { useState } from 'react';
import { Mail, MessageSquare, PhoneCall, AlertCircle, ShieldAlert } from 'lucide-react';
import ConversationThreadView from './ConversationThreadView';

export default function UnifiedInboxWorkspace({ initialReplies }) {
  const [activeThread, setActiveThread] = useState(initialReplies[0] || null);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex h-[calc(100vh-120px)] w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* LEFT COLUMN: Scrollable Reply Cards List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            Campaign Replies Inbox
          </h2>
          <input
            type="text"
            placeholder="Filter replies by company..."
            className="w-full mt-3 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {initialReplies.map((reply) => {
            const isSelected = activeThread?._id === reply._id;
            return (
              <div
                key={reply._id}
                onClick={() => setActiveThread(reply)}
                className={`p-4 cursor-pointer transition-colors relative ${isSelected ? 'bg-blue-50/60 border-l-4 border-blue-600' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-tight">{reply.campaignName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${reply.intent === 'Interested' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    {reply.intent}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">{reply.pocName}</h4>
                <p className="text-xs font-medium text-slate-700 truncate">{reply.companyName}</p>
                <p className="text-xs text-slate-400 truncate mt-1 italic">"{reply.latestMessageBody}"</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: The Interactive Workspace Canvas */}
      <div className="flex-1 flex flex-col bg-white">
        {activeThread ? (
          <ConversationThreadView activeThread={activeThread} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
            <p className="text-sm font-medium">Select a reply from the left panel to open the sales workspace.</p>
          </div>
        )}
      </div>

    </div>
  );
}

```

### 5.4 Conversational Feed & UAE Direct Action Hooks (`ConversationThreadView.jsx`)

```jsx
import React from 'react';
import { MessageSquare, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function ConversationThreadView({ activeThread }) {
  
  // Format phone parameters dynamically to configure direct UAE WhatsApp routing channels
  const openWhatsAppChat = (phone, name, company) => {
    const cleanPhone = phone.replace(/\D/g, ''); 
    const message = encodeURIComponent(`Hi ${name}, thanks for replying to our email regarding your custom footprint layout at the upcoming exhibition. Let's align execution vectors here!`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Workspace Context Header Banner */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900">{activeThread.pocName}</h3>
          <p className="text-xs text-slate-500 font-medium">{activeThread.designation} @ <span className="text-slate-800 font-semibold">{activeThread.companyName}</span></p>
        </div>
        <div>
          <span className="inline-block text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200">
            Campaign: {activeThread.campaignName}
          </span>
        </div>
      </div>

      {/* Message History Timeline Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
        {activeThread.history.map((msg, index) => {
          const isOutbound = msg.type === 'outbound';
          return (
            <div key={index} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl rounded-xl p-4 shadow-sm border ${isOutbound ? 'bg-white text-slate-700 border-slate-200' : 'bg-blue-600 text-white border-blue-700'}`}>
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100/20 text-[10px] font-semibold tracking-wider opacity-70">
                  <span>{isOutbound ? `OUTBOUND SEQUENCE (Step ${msg.step})` : 'INCOMING RECIPIENT REPLY'}</span>
                  <span>{new Date(msg.timestamp).toLocaleDateString('en-AE')}</span>
                </div>
                <p className="text-sm whitespace-pre-line leading-relaxed">{msg.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER: Direct Operational Action Keys */}
      <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => openWhatsAppChat(activeThread.phoneNumber, activeThread.pocName, activeThread.companyName)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Transition to UAE WhatsApp
          </button>
          
          <button className="inline-flex items-center px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Schedule Fit-out Briefing
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg border border-transparent hover:border-red-200 transition-all">
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
            Blacklist / Opt Out
          </button>
          <button className="inline-flex items-center px-3 py-2 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold rounded-lg border border-transparent hover:border-emerald-200 transition-all">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Mark Won / Close Deal
          </button>
        </div>
      </div>

    </div>
  );
}

```