import { formatAuditValue } from './settingsUtils.js';

export default function FieldDiffList({ changes = [], emptyLabel = 'No field-level changes recorded.' }) {
  if (!changes.length) {
    return <p className="crm-settings-empty-copy">{emptyLabel}</p>;
  }

  return (
    <div className="crm-settings-diff-list">
      {changes.map((change, index) => (
        <div key={`${change.field}-${index}`} className="crm-settings-diff-row">
          <p className="crm-settings-diff-field">{change.field}</p>
          <div className="crm-settings-diff-values">
            <div className="crm-settings-diff-cell is-from">
              <span className="crm-settings-diff-label">Before</span>
              <pre className="crm-settings-diff-value">{formatAuditValue(change.from)}</pre>
            </div>
            <div className="crm-settings-diff-cell is-to">
              <span className="crm-settings-diff-label">After</span>
              <pre className="crm-settings-diff-value">{formatAuditValue(change.to)}</pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
