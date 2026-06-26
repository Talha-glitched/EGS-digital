export default function DrawerLoadingSkeleton() {
  return (
    <div className="crm-drawer-skeleton" aria-hidden="true">
      <div className="crm-drawer-skeleton-hero">
        <div className="crm-drawer-skeleton-avatar" />
        <div className="flex-1 space-y-2">
          <div className="crm-drawer-skeleton-line w-2/3" />
          <div className="crm-drawer-skeleton-line w-1/2" />
          <div className="crm-drawer-skeleton-chips">
            <div className="crm-drawer-skeleton-chip" />
            <div className="crm-drawer-skeleton-chip" />
          </div>
        </div>
      </div>
      <div className="crm-drawer-skeleton-tabs">
        <div className="crm-drawer-skeleton-tab" />
        <div className="crm-drawer-skeleton-tab" />
        <div className="crm-drawer-skeleton-tab" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="crm-drawer-skeleton-block h-24" />
        <div className="crm-drawer-skeleton-block h-32" />
        <div className="crm-drawer-skeleton-block h-20" />
      </div>
    </div>
  );
}
