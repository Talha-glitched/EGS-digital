/** Compact vendor email cell for CRM people tables. */
export function VendorEmailCell({ value, isConfirmed = false }) {
  const email = String(value || '').split(/[;,]/)[0]?.trim();
  if (!email) {
    return <span className="text-neutral-300">—</span>;
  }
  return (
    <span
      className={`block max-w-[140px] truncate font-mono text-[11px] ${
        isConfirmed ? 'font-semibold text-emerald-700' : 'text-neutral-500'
      }`}
      title={email}
    >
      {email}
    </span>
  );
}

export function VendorEmailColumns({ lead }) {
  const outreach = String(lead.outreachEmail || '').trim();
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
      <SortableTableHeader label="Outreach" sortKey="outreachEmail" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-3 py-2.5" />
    </>
  );
}
