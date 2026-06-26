export default function SettingsPageHeader({ title, subtitle, action }) {
  return (
    <div className="crm-settings-page-head">
      <div className="min-w-0 flex-1">
        <h1 className="crm-settings-title">{title}</h1>
        {subtitle ? <p className="crm-settings-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="crm-settings-header-action">{action}</div> : null}
    </div>
  );
}
