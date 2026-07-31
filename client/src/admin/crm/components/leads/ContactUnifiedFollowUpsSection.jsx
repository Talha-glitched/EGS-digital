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
      {!isRightPoc ? (
        /* Before Right POC: Reply reviews, full classification, lead stage, and lead follow-ups */
        <ContactLeadTasksSection
          leadId={leadId}
          companyId={companyId}
          contactName={contactName}
          leadStage={leadStage}
          ownerDefault={ownerDefault}
          onTimelineRefresh={onTimelineRefresh}
        />
      ) : (
        /* After Right POC: ONLY Follow-up Tasks */
        <ContactFollowUpTasksSection
          leadId={leadId}
          companyId={companyId}
          contactName={contactName}
          ownerDefault={ownerDefault}
          onTimelineRefresh={onTimelineRefresh}
        />
      )}
    </div>
  );
}

