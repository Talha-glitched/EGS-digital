import ContactLeadTasksSection from './ContactLeadTasksSection.jsx';
import ContactFollowUpTasksSection from './ContactFollowUpTasksSection.jsx';

export default function ContactUnifiedFollowUpsSection({
  leadId,
  companyId,
  contactName,
  pocQualification,
  leadStage = 'contact',
  ownerDefault = '',
  onTimelineRefresh,
}) {
  const isRightPoc = pocQualification?.status === 'Confirmed';

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Follow-up Tasks</h4>
        <span className="text-[10px] font-semibold text-neutral-500">
          {isRightPoc ? 'Confirmed Right POC' : 'Lead Outreach'}
        </span>
      </div>

      {!isRightPoc ? (
        /* Before Right POC: Reply reviews, full classification, lead stage, and lead follow-ups */
        <div className="space-y-4">
          <ContactLeadTasksSection
            leadId={leadId}
            companyId={companyId}
            contactName={contactName}
            leadStage={leadStage}
            ownerDefault={ownerDefault}
            onTimelineRefresh={onTimelineRefresh}
          />
          <ContactFollowUpTasksSection
            leadId={leadId}
            companyId={companyId}
            contactName={contactName}
            ownerDefault={ownerDefault}
            onTimelineRefresh={onTimelineRefresh}
          />
        </div>
      ) : (
        /* After Right POC: ONLY Follow-up Tasks, next scheduled follow-up, last interaction, and owner */
        <div className="space-y-4">
          <ContactFollowUpTasksSection
            leadId={leadId}
            companyId={companyId}
            contactName={contactName}
            ownerDefault={ownerDefault}
            onTimelineRefresh={onTimelineRefresh}
          />
        </div>
      )}
    </div>
  );
}
