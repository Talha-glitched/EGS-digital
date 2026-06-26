export default function SettingsFilterSelect({ label, value, onChange, options }) {
  return (
    <label className="crm-settings-filter-select">
      <span className="sr-only">{label}</span>
      <select className="crm-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
