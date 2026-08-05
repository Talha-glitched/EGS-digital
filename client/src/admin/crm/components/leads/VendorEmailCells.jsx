/** Compact vendor email cell for CRM people tables. */
export function VendorEmailCell({ value, isConfirmed = false }) {
  const emails = String(value || '')
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!emails.length) {
    return <span className="text-neutral-300">—</span>;
  }
  const first = emails[0];
  const extra = emails.length - 1;
  return (
    <span
      className={`block max-w-[140px] truncate font-mono text-[11px] ${
        isConfirmed ? 'font-semibold text-emerald-700' : 'text-neutral-500'
      }`}
      title={emails.join('\n')}
    >
      {first}{extra > 0 ? ` +${extra}` : ''}
    </span>
  );
}

export function VendorEmailColumns({ lead }) {
  // SQL keeps one canonical address. Use it when legacy vendor-specific fields
  // are unavailable instead of rendering an empty or opaque value.
  const outreach = String(lead.outreachEmail || lead.email || '').trim();
  return (
    <>
      <td className="px-3 py-2.5">
        <VendorEmailCell value={lead.emailApollo} isConfirmed={outreach && lead.outreachEmailSource === 'Apollo'} />
      </td>
      <td className="px-3 py-2.5">
        <VendorEmailCell value={lead.emailHunter} isConfirmed={outreach && lead.outreachEmailSource === 'Hunter'} />
      </td>
      <td className="px-3 py-2.5">
        <VendorEmailCell value={lead.emailLusha} isConfirmed={outreach && lead.outreachEmailSource === 'Lusha'} />
      </td>
      <td className="px-3 py-2.5">
        <VendorEmailCell value={lead.emailPersonal} isConfirmed={outreach && lead.outreachEmailSource === 'Personal'} />
      </td>
      <td className="px-3 py-2.5">
        <VendorEmailCell value={lead.outreachEmail} isConfirmed={Boolean(outreach)} />
      </td>
    </>
  );
}

export function VendorEmailHeaders({ sortKey, sortDir, toggleSort, SortableTableHeader }) {
  return (
    <>
      <SortableTableHeader label="Apollo" sortKey="emailApollo" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-3 py-2.5" />
      <SortableTableHeader label="Hunter" sortKey="emailHunter" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-3 py-2.5" />
      <SortableTableHeader label="Lusha" sortKey="emailLusha" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-3 py-2.5" />
      <SortableTableHeader label="Personal" sortKey="emailPersonal" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-3 py-2.5" />
      <SortableTableHeader label="Outreach" sortKey="outreachEmail" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-3 py-2.5" />
    </>
  );
}
