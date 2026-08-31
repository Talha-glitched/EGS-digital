import { useState, useMemo, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  Send,
  Code,
  Eye,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Mail,
  User,
  Building,
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { buildEmailHtml, EMAIL_TEMPLATES, getTemplateById } from '../../constants/emailTemplates.js';
import { crmApiFetch, fetchConfiguredEmailAccounts } from '../../crmApi.js';
import { cn } from '../ui/primitives.jsx';

const SAMPLE_PERSONAS = [
  {
    id: 'exhibition_lead',
    name: 'Sarah Jenkins',
    firstName: 'Sarah',
    first: 'Sarah',
    company: 'Philips Middle East',
    university: 'Philips Healthcare',
    email: 'sarah.jenkins@philips.com',
    role: 'Marketing & Events Director',
    category: 'Exhibition Exhibitor',
  },
  {
    id: 'graduation_lead',
    name: 'Dr. Tariq Al-Nuaimi',
    firstName: 'Dr. Tariq',
    first: 'Dr. Tariq',
    company: 'University of Sharjah',
    university: 'University of Sharjah',
    email: 'tariq.alnuaimi@sharjah.ac.ae',
    role: 'Dean of Student Affairs',
    category: 'University Leadership',
  },
  {
    id: 'fitout_lead',
    name: 'Omar Farooq',
    firstName: 'Omar',
    first: 'Omar',
    company: 'Velocity Real Estate Partners',
    university: 'Velocity Commercial',
    email: 'omar@velocitypartners.ae',
    role: 'Managing Director',
    category: 'Commercial Corporate',
  },
  {
    id: 'raw',
    name: '{{name}}',
    firstName: '{{first_name}}',
    first: '[First]',
    company: '{{company}}',
    university: '[University]',
    email: 'recipient@example.com',
    role: 'Raw Placeholders Mode',
    category: 'Raw Variables',
  },
];

export default function EmailPreviewModal({
  open,
  onClose,
  templateType = 'exhibitions',
  subject = '',
  body = '',
  aiPrompt = '',
  useAi = false,
  onApplyTemplate,
}) {
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'code'
  const [personaId, setPersonaId] = useState('exhibition_lead');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateType);
  const [copied, setCopied] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [testCompany, setTestCompany] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentStatus, setTestSentStatus] = useState(null);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [selectedFromEmail, setSelectedFromEmail] = useState('');

  useEffect(() => {
    if (templateType) setSelectedTemplateId(templateType);
  }, [templateType]);

  useEffect(() => {
    if (open) {
      fetchConfiguredEmailAccounts().then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setEmailAccounts(accounts);
          if (!selectedFromEmail) {
            const primary = accounts.find((a) => a.isPrimary) || accounts[0];
            setSelectedFromEmail(primary.email);
          }
        }
      }).catch(console.error);
    }
  }, [open]);

  // Match default persona to template category
  useEffect(() => {
    if (selectedTemplateId === 'graduations') setPersonaId('graduation_lead');
    else if (selectedTemplateId === 'fitouts') setPersonaId('fitout_lead');
    else if (selectedTemplateId === 'exhibitions') setPersonaId('exhibition_lead');
  }, [selectedTemplateId]);

  const activePersona = useMemo(() => {
    if (personaId === 'custom_test') {
      const cleanFirst = testName || 'Recipient';
      const cleanComp = testCompany || 'Your Organization';
      return {
        id: 'custom_test',
        name: cleanFirst,
        firstName: cleanFirst,
        first: cleanFirst,
        company: cleanComp,
        university: cleanComp,
        email: testEmail || 'recipient@example.com',
        role: 'Custom Test Recipient',
        category: 'Custom Test',
      };
    }
    return SAMPLE_PERSONAS.find((p) => p.id === personaId) || SAMPLE_PERSONAS[0];
  }, [personaId, testName, testCompany, testEmail]);

  const activeTemplate = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId],
  );

  const matchedSender = useMemo(() => {
    return emailAccounts.find((a) => a.email.toLowerCase() === String(selectedFromEmail).toLowerCase());
  }, [emailAccounts, selectedFromEmail]);

  const htmlContent = useMemo(() => {
    return buildEmailHtml({
      templateType: selectedTemplateId,
      subject,
      body,
      context: activePersona,
      baseUrl: window.location.origin,
      senderEmail: selectedFromEmail,
      senderName: matchedSender?.name,
      senderTitle: matchedSender?.title,
    });
  }, [selectedTemplateId, subject, body, activePersona, selectedFromEmail, matchedSender]);

  const handleEmailChange = (val) => {
    setTestEmail(val);
    if (val && val.includes('@')) {
      const [localPart, domainPart] = val.split('@');
      const cleanLocal = localPart.split(/[._-]/)[0];
      const derivedName = cleanLocal ? cleanLocal.charAt(0).toUpperCase() + cleanLocal.slice(1) : '';
      const domainName = domainPart ? domainPart.split('.')[0] : '';
      const derivedCompany =
        domainName && !['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'proton', 'live'].includes(domainName.toLowerCase())
          ? domainName.charAt(0).toUpperCase() + domainName.slice(1)
          : 'Your Organization';

      if (!testName) setTestName(derivedName);
      if (!testCompany) setTestCompany(derivedCompany);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmail || sendingTest) return;
    setSendingTest(true);
    setTestSentStatus(null);

    const rawPrefix = testEmail.split('@')[0] || 'Friend';
    const firstWord = rawPrefix.split(/[._-]/)[0] || 'Friend';
    const cleanFirstName = String(testName || '').trim() || (firstWord.charAt(0).toUpperCase() + firstWord.slice(1));
    const cleanCompany = String(testCompany || '').trim() || 'Your Organization';

    try {
      const res = await crmApiFetch('/api/admin/sequences/test-email', {
        method: 'POST',
        body: JSON.stringify({
          toEmail: testEmail,
          recipientName: cleanFirstName,
          recipientCompany: cleanCompany,
          subject: subject || activeTemplate.defaultSubject,
          body: body || activeTemplate.defaultBody,
          templateType: selectedTemplateId,
          fromEmail: selectedFromEmail || undefined,
          fromName: matchedSender?.name || undefined,
        }),
      });
      setTestSentStatus({
        ok: true,
        msg: `Test email sent from "${res?.fromEmail || selectedFromEmail}" to ${testEmail} addressed to "${res?.recipientName || cleanFirstName}" (${res?.recipientCompany || cleanCompany})!`,
      });
    } catch (err) {
      setTestSentStatus({ ok: false, msg: err.message || 'Failed to send test email.' });
    } finally {
      setSendingTest(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email Preview & Recipient View"
      subtitle={`Previewing "${activeTemplate.name}" with dynamic personalization.`}
      icon={Eye}
      size="xl"
    >
      <div className="flex flex-col gap-4">
        {/* TOP CONTROLS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
          {/* TEMPLATE PICKER */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Template:</span>
            <div className="flex flex-wrap gap-1">
              {EMAIL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    onApplyTemplate?.(tpl.id);
                  }}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer',
                    selectedTemplateId === tpl.id
                      ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                      : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200',
                  )}
                >
                  {tpl.name.split('&')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* VIEW CONTROLS */}
          <div className="flex items-center gap-2 ml-auto">
            {/* PERSONA SELECTOR */}
            <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2 py-1">
              <User className="h-3.5 w-3.5 text-neutral-400" />
              <select
                value={personaId}
                onChange={(e) => setPersonaId(e.target.value)}
                className="text-xs font-medium bg-transparent border-0 outline-none text-neutral-800 cursor-pointer"
                title="Select preview contact profile"
              >
                {testEmail && (
                  <option value="custom_test">
                    Custom Recipient: {testName || testEmail.split('@')[0]} ({testCompany || 'Your Org'})
                  </option>
                )}
                {SAMPLE_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.company})
                  </option>
                ))}
              </select>
            </div>

            {/* DEVICE TOGGLE */}
            <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer',
                  deviceMode === 'desktop'
                    ? 'bg-neutral-900 text-white font-medium shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer',
                  deviceMode === 'mobile'
                    ? 'bg-neutral-900 text-white font-medium shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>

            {/* VIEW MODE (VISUAL / CODE) */}
            <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className={cn(
                  'p-1 text-xs rounded-md transition-all cursor-pointer',
                  activeTab === 'visual'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
                title="Visual Preview"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={cn(
                  'p-1 text-xs rounded-md transition-all cursor-pointer',
                  activeTab === 'code'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
                title="HTML Source Code"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* EMAIL SUBJECT & SENDER INFO BAR */}
        <div className="flex flex-col gap-1 px-3 py-2 bg-neutral-100/70 border border-neutral-200/70 rounded-lg text-2xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-500 w-16">Subject:</span>
            <span className="font-medium text-neutral-900 truncate">
              {buildEmailHtml({
                templateType: selectedTemplateId,
                subject,
                body,
                context: activePersona,
                baseUrl: window.location.origin,
              }) ? (
                (subject || activeTemplate.defaultSubject)
                  .replace(/{{\s*(?:company|company_name)\s*}}/gi, activePersona.company)
                  .replace(/\[University\]/gi, activePersona.university)
                  .replace(/{{\s*(?:name|first_name)\s*}}/gi, activePersona.firstName)
                  .replace(/\[First\]/gi, activePersona.firstName)
              ) : 'Subject'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-500 w-16">From:</span>
            <span className="text-neutral-700">Exhibit Graphic Sign &lt;talha@exhibitgraphicsign.com&gt;</span>
            <span className="ml-auto text-neutral-400">To: {activePersona.name} &lt;{activePersona.email}&gt;</span>
          </div>
        </div>

        {/* PREVIEW CONTAINER */}
        {activeTab === 'visual' ? (
          <div className="relative flex justify-center items-start bg-neutral-100/50 p-4 rounded-xl border border-neutral-200/80 overflow-y-auto max-h-[620px]">
            {deviceMode === 'desktop' ? (
              /* Desktop Client Simulation */
              <div className="w-full max-w-[640px] bg-white rounded-xl shadow-md border border-neutral-200/90 overflow-hidden">
                <iframe
                  title="Email Preview Desktop"
                  srcDoc={htmlContent}
                  className="w-full min-h-[580px] h-[720px] border-0"
                  sandbox="allow-same-origin allow-popups"
                />
              </div>
            ) : (
              /* Mobile Phone Mockup Frame */
              <div className="w-[375px] shrink-0 bg-neutral-900 rounded-[40px] p-3.5 shadow-2xl border-4 border-neutral-800">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-28 h-4 bg-neutral-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-8 h-1 bg-neutral-700 rounded-full" />
                </div>
                <div className="w-full h-[580px] bg-white rounded-[28px] overflow-hidden">
                  <iframe
                    title="Email Preview Mobile"
                    srcDoc={htmlContent}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-popups"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CODE VIEW */
          <div className="relative bg-neutral-900 text-neutral-100 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[560px] leading-relaxed border border-neutral-800">
            <button
              type="button"
              onClick={handleCopyCode}
              className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all font-sans text-2xs font-semibold cursor-pointer border border-neutral-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied HTML' : 'Copy HTML'}
            </button>
            <pre className="whitespace-pre-wrap">{htmlContent}</pre>
          </div>
        )}

        {/* BOTTOM ACTION: SEND TEST EMAIL WITH DYNAMIC RECIPIENT REPLACEMENT */}
        <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2">
          <form onSubmit={handleSendTest} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-700 whitespace-nowrap">Send test:</span>
            {emailAccounts.length > 0 && (
              <select
                value={selectedFromEmail}
                onChange={(e) => setSelectedFromEmail(e.target.value)}
                className="crm-select !py-1 text-xs w-48 font-medium text-neutral-700"
                title="Select sender mailbox"
              >
                {emailAccounts.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    From: {acc.name ? `${acc.name} (${acc.email})` : acc.email}
                  </option>
                ))}
              </select>
            )}
            <input
              type="email"
              value={testEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="recipient@company.com"
              className="crm-input !py-1 text-xs flex-1 min-w-[170px]"
              required
            />
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="First Name (e.g. Talha)"
              className="crm-input !py-1 text-xs w-32"
              title="First name to replace {{name}} and [First]"
            />
            <input
              type="text"
              value={testCompany}
              onChange={(e) => setTestCompany(e.target.value)}
              placeholder="Company (e.g. EGS)"
              className="crm-input !py-1 text-xs w-32"
              title="Company name to replace {{company}} and [University]"
            />
            <button
              type="submit"
              disabled={!testEmail || sendingTest}
              className="crm-btn-primary !py-1 text-xs shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Send className="h-3 w-3" />
              {sendingTest ? 'Sending…' : 'Send Test'}
            </button>
            <button type="button" onClick={onClose} className="crm-btn-secondary !py-1 text-xs ml-auto">
              Done
            </button>
          </form>

          {testSentStatus && (
            <div className={cn('text-xs font-medium p-2 rounded-lg', testSentStatus.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200')}>
              {testSentStatus.msg}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
