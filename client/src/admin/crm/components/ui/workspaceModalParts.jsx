import { useState } from 'react';
import { cn } from './primitives.jsx';
import { Check, FileUp, Loader2 } from 'lucide-react';

export function ModalSegmentTabs({ options, value, onChange }) {
  return (
    <div className="crm-modal-segments" role="tablist" aria-label="Mode">
      {options.map((option) => {
        const active = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn('crm-modal-segment', active && 'is-active')}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ModalDropzone({
  icon: Icon = FileUp,
  title,
  hint,
  accept,
  multiple = false,
  busy = false,
  fileLabel,
  onSelect,
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    if (!fileList?.length) return;
    onSelect?.(multiple ? fileList : fileList[0]);
  }

  return (
    <label
      className={cn('crm-modal-dropzone', dragOver && 'is-dragover', busy && 'is-busy')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="crm-modal-dropzone-icon">
        {busy ? <Loader2 className="h-7 w-7 animate-spin text-brand" /> : <Icon className="h-7 w-7" strokeWidth={1.75} />}
      </div>
      <p className="crm-modal-dropzone-title">{fileLabel || title}</p>
      {hint ? <p className="crm-modal-dropzone-hint">{hint}</p> : null}
      <span className="crm-modal-dropzone-cta">Browse files</span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </label>
  );
}

export function ModalPreviewMetrics({ items }) {
  return (
    <div className="crm-modal-metrics">
      {items.map((item) => (
        <div key={item.label} className={cn('crm-modal-metric', item.tone && `is-${item.tone}`)}>
          <p className="crm-modal-metric-value">{item.value}</p>
          <p className="crm-modal-metric-label">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ModalActionFooter({ children, className }) {
  return <div className={cn('crm-modal-action-footer', className)}>{children}</div>;
}

export function ModalStack({ children, className }) {
  return <div className={cn('crm-modal-stack', className)}>{children}</div>;
}

export function ModalSection({ title, description, children, className }) {
  return (
    <section className={cn('crm-modal-section', className)}>
      {title ? <h3 className="crm-modal-section-title">{title}</h3> : null}
      {description ? <p className="crm-modal-section-desc">{description}</p> : null}
      {children}
    </section>
  );
}

export function ModalFieldList({ children, className }) {
  return <div className={cn('crm-modal-field-list', className)}>{children}</div>;
}

export function ModalStepRail({ steps, current }) {
  return (
    <ol className="crm-modal-steps" aria-label="Progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const done = stepNumber < current;
        const active = stepNumber === current;
        return (
          <li
            key={step.id || step.label}
            className={cn('crm-modal-step', done && 'is-done', active && 'is-active')}
          >
            <span className="crm-modal-step-dot" aria-hidden="true">
              {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : stepNumber}
            </span>
            <span className="crm-modal-step-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
