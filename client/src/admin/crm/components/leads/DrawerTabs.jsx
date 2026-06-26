import { cn } from '../ui/primitives.jsx';

export default function DrawerTabs({ tabs, active, onChange }) {
  return (
    <div className="crm-drawer-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={cn('crm-drawer-tab', active === tab.id && 'is-active')}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className="crm-drawer-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
