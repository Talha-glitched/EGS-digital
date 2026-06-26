import { AdvancedFilterPopover } from '../ui/advancedFilter/index.js';

export default function LeadFilterToolbar({
  advancedSchema,
  advancedFilters,
  advancedMatchMode,
  onAdvancedFiltersChange,
  className = '',
}) {
  if (!advancedSchema) return null;

  return (
    <div className={className}>
      <AdvancedFilterPopover
        schema={advancedSchema}
        filters={advancedFilters}
        matchMode={advancedMatchMode}
        onChange={onAdvancedFiltersChange}
      />
    </div>
  );
}
