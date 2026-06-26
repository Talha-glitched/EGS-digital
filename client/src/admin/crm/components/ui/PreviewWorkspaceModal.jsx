import { Sparkles } from 'lucide-react';
import { Modal } from './Modal.jsx';

const STORAGE_KEY = 'crm-preview-notice-dismissed';

export function isPreviewNoticeDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function PreviewWorkspaceModal({ open, onClose }) {
  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    onClose?.();
  }

  return (
    <Modal open={open} onClose={dismiss} title="Preview workspace" size="md">
      <div className="space-y-5">
        <div className="crm-preview-notice-body">
          <div className="crm-preview-notice-icon">
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </div>
          <p className="text-sm leading-relaxed text-sky-950">
            Sample pipeline and follow-up data is shown until your team creates live opportunities and tasks.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--color-line)] pt-4">
          <button type="button" className="crm-btn-primary" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}
