import { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  FolderKanban,
  Sparkles,
  Sliders,
  Users,
  Target,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { cn } from '../ui/primitives.jsx';

export const EXHIBITOR_PROMPT_TEXT = `Go to [PASTE EXHIBITION WEBSITE URL HERE] and extract the complete exhibitor list.

The exhibitor list may use multiple pages, “load more” buttons, dynamic scrolling, or an API. Continue until every exhibitor has been collected. Keep all filters and categories in the default “show all” state.

For each exhibitor, extract these 6 fields:

Company Name — official company name.

Website — official company website as a full URL beginning with https://.

City — city of the company’s headquarters or main office.

Country — country of the company’s headquarters or main office.

Generic Email — all verified, publicly listed company contact email addresses.

Generic Phone — all verified, publicly listed company contact numbers. Include the international country code when it can be verified.

RESEARCH:

Do not rely only on the exhibitor list or the links provided there.

For every missing field, independently search the company’s official website and the internet before leaving it blank. Search using the company name together with identifying details such as country, products, brands, industry, booth information, or exhibition name.

If several companies have the same or similar name, identify the correct one using the exhibitor profile, country, industry, products, brands, address, and other available evidence.

If the exhibitor profile has no website link, independently search for the company’s official website.

Prefer information from:

1. The official exhibitor profile
2. The company’s official website
3. Official company social or business profiles
4. Reliable public business directories and other verifiable sources

Do not use a directory, marketplace, social-media page, or exhibition profile as the Website value when an official company website can be found.

Only leave a field blank after checking the exhibitor information, the company’s official website, and independent search results. Do not invent, infer, or guess information.

DEDUPLICATION:

If the same company appears multiple times, include it only once.

Match companies case-insensitively and ignore minor differences in punctuation, spacing, legal suffixes, and forms such as “Ltd” versus “Limited.”

Do not merge companies solely because their names are identical or similar. Keep them separate when their country, website, products, address, or other evidence shows they are different organizations.

PROGRESS REPORTING:

Every 100 companies processed, print a single status line in this exact format:

"[Status] Processed N of approximately M companies — page X of Y"

Do NOT print anything else during processing.

OUTPUT:

Output the results as a tab-separated table AND save them as a .tsv file in the current folder.

Use these exact headers in this exact order:

Company Name\tWebsite\tCity\tCountry\tGeneric Email\tGeneric Phone

Rules:

One row per company, exactly 6 columns.

Use tab characters as separators.

No text before or after the table in the file output.

Do not add extra columns.

Do not place notes, explanations, citations, or status messages inside the .tsv file.

If a value is unavailable, leave that cell blank while preserving all 6 columns.

If multiple verified emails or phone numbers are found, place them in the same cell separated by semicolons (;).

Do not invent data. Only use information verified from the exhibitor page or public sources.

Use UTF-8 encoding to preserve non-English characters.

Before finishing, validate that every row has exactly 6 tab-separated columns.`;

export const APOLLO_SEARCH_TEXT = `("Events Manager" OR "Event Manager" OR "Event Marketing Manager" OR "Senior Event Manager" OR "Head of Events" OR "Director of Events" OR "Corporate Events Manager" OR "Global Events Manager" OR "Regional Events Manager" OR "Industry Events Manager" OR "Conference Manager" OR "Trade Show Manager" OR "Tradeshow Manager" OR "Exhibition Manager" OR "Exhibitions Manager" OR "Expo Manager" OR "Experiential Marketing Manager" OR "Brand Experience Manager" OR "Activation Manager" OR "Brand Activation Manager" OR "Field Marketing Manager" OR "Marketing Manager" OR "Senior Marketing Manager" OR "Head of Marketing" OR "Marketing Director" OR "Director of Marketing" OR "Regional Marketing Manager" OR "Regional Marketing Director" OR "Country Marketing Manager" OR "International Marketing Manager" OR "MENA Marketing Manager" OR "MEA Marketing Manager" OR "Middle East Marketing Manager" OR "GCC Marketing Manager" OR "EMEA Marketing Manager" OR "Brand Manager" OR "Senior Brand Manager" OR "Head of Brand" OR "Brand Director" OR "Brand Marketing Manager" OR "Trade Marketing Manager" OR "Head of Trade Marketing" OR "Trade Marketing Director" OR "Marketing Communications Manager" OR "Marcom Manager" OR "Communications Manager" OR "Corporate Communications Manager" OR "Head of Communications" OR "Communications Director" OR "Director of Communications" OR "Strategic Communications Manager" OR "Public Relations Manager" OR "PR Manager" OR "Head of Public Relations" OR "Public Relations Director" OR "Corporate Affairs Manager" OR "Public Affairs Manager" OR "External Communications Manager" OR "External Relations Manager" OR "Government Relations Manager" OR "Protocol Manager" OR "Partnerships Manager" OR "Strategic Partnerships Manager" OR "Commercial Director" OR "Sales Director" OR "Head of Sales" OR "Business Development Director" OR "Country Manager" OR "General Manager" OR "Managing Director" OR "Regional Director" OR "MENA Director" OR "MEA Director" OR "Middle East Director" OR "GCC Director" OR "EMEA Director" OR "Procurement Manager" OR "Purchasing Manager" OR "Sourcing Manager" OR "Vendor Manager" OR "Indirect Procurement Manager" OR "Marketing Procurement Manager" OR "Operations Manager" OR "Logistics Manager") AND NOT (Intern OR Assistant OR Student OR Recruiter OR Accountant OR Developer OR Engineer OR "Customer Support" OR "Graphic Designer" OR "HR Manager" OR "Finance Manager" OR IT OR Digital)`;

export const LUSHA_ROLES_INCLUDED_TEXT = `Events Manager
Event Manager
Event Marketing Manager
Senior Event Manager
Head of Events
Director of Events
Corporate Events Manager
Global Events Manager
Regional Events Manager
Industry Events Manager
Conference Manager
Trade Show Manager
Tradeshow Manager
Exhibition Manager
Exhibitions Manager
Expo Manager
Experiential Marketing Manager
Brand Experience Manager
Activation Manager
Brand Activation Manager
Field Marketing Manager
Marketing Manager
Senior Marketing Manager
Head of Marketing
Marketing Director
Director of Marketing
Regional Marketing Manager
Regional Marketing Director
Country Marketing Manager
International Marketing Manager
MENA Marketing Manager
MEA Marketing Manager
Middle East Marketing Manager
GCC Marketing Manager
EMEA Marketing Manager
Brand Manager
Senior Brand Manager
Head of Brand
Brand Director
Brand Marketing Manager
Trade Marketing Manager
Head of Trade Marketing
Trade Marketing Director
Marketing Communications Manager
Marcom Manager
Communications Manager
Corporate Communications Manager
Head of Communications
Communications Director
Director of Communications
Strategic Communications Manager
Public Relations Manager
PR Manager
Head of Public Relations
Public Relations Director
Corporate Affairs Manager
Public Affairs Manager
External Communications Manager
External Relations Manager
Government Relations Manager
Protocol Manager
Partnerships Manager
Strategic Partnerships Manager
Commercial Director
Sales Director
Head of Sales
Business Development Director
Country Manager
General Manager
Managing Director
Regional Director
MENA Director
MEA Director
Middle East Director
GCC Director
EMEA Director
Procurement Manager
Purchasing Manager
Sourcing Manager
Vendor Manager
Indirect Procurement Manager
Marketing Procurement Manager
Operations Manager
Logistics Manager`;

export const LUSHA_ROLES_EXCLUDED_TEXT = `Intern
Assistant
Student
Recruiter
Accountant
Developer
Engineer
Customer Support
Graphic Designer
HR Manager
Finance Manager
IT
Engineering
Digital`;

export const HUNTER_SEARCH_TEXT = `Marketing
Sales
Executive`;

export default function ProjectResourcesModal({ open, onClose, projectName }) {
  const [activeTab, setActiveTab] = useState('exhibitor');
  const [copiedKey, setCopiedKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  async function handleCopy(key, title, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setToastMessage(`Copied ${title} to clipboard`);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2500);
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  }

  const tabs = [
    { id: 'exhibitor', label: 'Exhibitor Prompt', icon: Sparkles, badge: 'Extraction' },
    { id: 'apollo', label: 'Apollo', icon: Sliders, badge: 'Search String' },
    { id: 'lusha', label: 'Lusha', icon: Users, badge: 'Role Filters' },
    { id: 'hunter', label: 'Hunter', icon: Target, badge: 'Departments' },
    { id: 'all', label: 'All Resources', icon: Layers, badge: 'Full Overview' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Campaign Resources & Scraper Prompts"
      subtitle={projectName ? `${projectName} — copy-ready search strings, role filters & prompts` : 'Copy-ready search strings, role filters & prompts'}
      icon={FolderKanban}
      accent="brand"
      size="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-line bg-neutral-50/80 p-1.5 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 shrink-0 select-none',
                  active
                    ? 'bg-white text-brand shadow-sm ring-1 ring-neutral-200/80'
                    : 'text-neutral-600 hover:bg-white/60 hover:text-ink'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 transition-colors', active ? 'text-brand' : 'text-neutral-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 transition-all duration-300 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[420px] transition-all duration-300">
          {(activeTab === 'exhibitor' || activeTab === 'all') && (
            <ResourceCard
              title="1. Exhibitor Extraction Prompt"
              subtitle="Read & copy-only prompt for AI web scrapers or assistants to extract 6-column TSV exhibitor lists."
              badge="Prompt"
              copied={copiedKey === 'exhibitor'}
              onCopy={() => handleCopy('exhibitor', 'Exhibitor Extraction Prompt', EXHIBITOR_PROMPT_TEXT)}
              text={EXHIBITOR_PROMPT_TEXT}
              rows={14}
            />
          )}

          {(activeTab === 'apollo' || activeTab === 'all') && (
            <ResourceCard
              title="2. Apollo Search String"
              subtitle="Copy-ready boolean search filter for Apollo contact discovery and decision-maker targeting."
              badge="Apollo"
              copied={copiedKey === 'apollo'}
              onCopy={() => handleCopy('apollo', 'Apollo Search String', APOLLO_SEARCH_TEXT)}
              text={APOLLO_SEARCH_TEXT}
              rows={8}
              className={activeTab === 'all' ? 'mt-6' : ''}
            />
          )}

          {(activeTab === 'lusha' || activeTab === 'all') && (
            <div className={cn('flex flex-col gap-4', activeTab === 'all' ? 'mt-6' : '')}>
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div>
                  <h4 className="text-sm font-bold text-ink">3. Lusha Role Filters</h4>
                  <p className="mt-0.5 text-xs text-neutral-500">Target job roles for Lusha search — separate filters for Included and Excluded titles.</p>
                </div>
                <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  Lusha
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ResourceCard
                  title="Roles Included"
                  subtitle="72 included target titles"
                  copied={copiedKey === 'lusha_included'}
                  onCopy={() => handleCopy('lusha_included', 'Lusha Roles Included', LUSHA_ROLES_INCLUDED_TEXT)}
                  text={LUSHA_ROLES_INCLUDED_TEXT}
                  rows={12}
                  compact
                />
                <ResourceCard
                  title="Roles Excluded"
                  subtitle="14 excluded titles"
                  copied={copiedKey === 'lusha_excluded'}
                  onCopy={() => handleCopy('lusha_excluded', 'Lusha Roles Excluded', LUSHA_ROLES_EXCLUDED_TEXT)}
                  text={LUSHA_ROLES_EXCLUDED_TEXT}
                  rows={12}
                  compact
                />
              </div>
            </div>
          )}

          {(activeTab === 'hunter' || activeTab === 'all') && (
            <ResourceCard
              title="4. Hunter Departments"
              subtitle="Target department categories for Hunter domain search & email finder."
              badge="Hunter"
              copied={copiedKey === 'hunter'}
              onCopy={() => handleCopy('hunter', 'Hunter Departments', HUNTER_SEARCH_TEXT)}
              text={HUNTER_SEARCH_TEXT}
              rows={5}
              className={activeTab === 'all' ? 'mt-6' : ''}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function ResourceCard({
  title,
  subtitle,
  badge,
  copied,
  onCopy,
  text,
  rows = 10,
  compact = false,
  className = '',
}) {
  return (
    <div className={cn('crm-card overflow-hidden transition-all duration-200 hover:border-neutral-300', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-neutral-50/50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className={cn('font-bold text-ink', compact ? 'text-xs' : 'text-sm')}>{title}</h4>
            {badge && (
              <span className="rounded-md bg-neutral-200/60 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 select-none shadow-sm',
            copied
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-brand text-white hover:bg-brand/90 active:scale-95'
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3 bg-neutral-900/95">
        <textarea
          readOnly
          value={text}
          rows={rows}
          spellCheck={false}
          className="w-full resize-y rounded-md bg-transparent font-mono text-[12px] leading-relaxed text-neutral-100 placeholder-neutral-500 focus:outline-none scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent selection:bg-brand selection:text-white"
          onClick={(e) => e.target.select()}
        />
      </div>
    </div>
  );
}
