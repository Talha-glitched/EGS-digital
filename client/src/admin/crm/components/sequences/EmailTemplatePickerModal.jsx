import { useState } from 'react';
import { Sparkles, Check, Eye, Layout, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { EMAIL_TEMPLATES } from '../../constants/emailTemplates.js';
import { cn } from '../ui/primitives.jsx';

export default function EmailTemplatePickerModal({
  open,
  onClose,
  selectedTemplateId = 'exhibitions',
  onSelectTemplate,
  onPreviewTemplate,
}) {
  const [includeCopy, setIncludeCopy] = useState(true);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose Email Template"
      subtitle="Select a tailored HTML email template matching EGS's website design and services."
      icon={Layout}
      size="xl"
    >
      <div className="space-y-4">
        {/* OPTION: POPULATE COPY TOGGLE */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="text-xs text-neutral-700">
              Apply high-converting industry copy & subject lines tailored to the chosen service
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCopy}
              onChange={(e) => setIncludeCopy(e.target.checked)}
              className="rounded border-neutral-300 text-brand focus:ring-brand"
            />
            <span className="text-xs font-semibold text-neutral-800">Auto-fill copy</span>
          </label>
        </div>

        {/* TEMPLATE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EMAIL_TEMPLATES.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <div
                key={tpl.id}
                className={cn(
                  'group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-white hover:shadow-md cursor-pointer',
                  isSelected
                    ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm'
                    : 'border-neutral-200/80 hover:border-neutral-300',
                )}
                onClick={() => {
                  onSelectTemplate?.(tpl.id, { applyCopy: includeCopy, template: tpl });
                  onClose();
                }}
              >
                {/* HERO IMAGE BANNER / PLACEHOLDER */}
                <div className="relative h-36 w-full bg-neutral-900 overflow-hidden">
                  {tpl.heroImage ? (
                    <img
                      src={tpl.heroImage}
                      alt={tpl.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-400">
                      <Layout className="h-10 w-10 opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/30 to-transparent" />

                  {/* BADGES */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider text-white shadow-xs"
                      style={{ backgroundColor: tpl.accentColor }}
                    >
                      {tpl.badge}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-neutral-300">{tpl.category}</p>
                    <h4 className="text-sm font-bold text-white leading-snug">{tpl.name}</h4>
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">{tpl.summary}</p>

                    {/* CAPABILITY TAGS */}
                    {tpl.capabilities && tpl.capabilities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tpl.capabilities.map((cap) => (
                          <span
                            key={cap.title}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-2xs font-medium text-neutral-700"
                          >
                            <span>{cap.icon}</span>
                            <span>{cap.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FOOTER ACTIONS */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewTemplate?.(tpl.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview design
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate?.(tpl.id, { applyCopy: includeCopy, template: tpl });
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-brand transition-colors"
                    >
                      <span>{isSelected ? 'Currently active' : 'Select template'}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
