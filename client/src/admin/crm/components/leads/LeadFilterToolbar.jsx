import { Search } from 'lucide-react';

export default function LeadFilterToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  campaignFilter,
  onCampaignChange,
  campaignsList = [],
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-neutral-50/50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search name, company, or email…"
          className="crm-input py-2 pl-9"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {campaignsList.length > 1 && (
          <select className="crm-select w-auto py-2 text-[13px] font-medium" value={campaignFilter} onChange={(e) => onCampaignChange(e.target.value)}>
            <option value="All">All projects</option>
            {campaignsList.map((camp) => (
              <option key={camp._id} value={camp._id}>
                {camp.projectName}
              </option>
            ))}
          </select>
        )}

        <select className="crm-select w-auto py-2 text-[13px] font-medium" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="All">All statuses</option>
          <option value="Pending Inqueue">Pending</option>
          <option value="Emailed Outbound">Emailed</option>
          <option value="Bounced / Invalid">Bounced</option>
          <option value="Opted Out">Opted out</option>
          <option value="Replied">Replied</option>
        </select>

        <select className="crm-select w-auto py-2 text-[13px] font-medium" value={sourceFilter} onChange={(e) => onSourceChange(e.target.value)}>
          <option value="All">All sources</option>
          <option value="Apollo">Apollo</option>
          <option value="Hunter">Hunter</option>
          <option value="Lusha">Lusha</option>
          <option value="Manual">Manual</option>
        </select>
      </div>
    </div>
  );
}
