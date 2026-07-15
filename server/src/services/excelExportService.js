import XLSX from 'xlsx';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';

export async function exportCampaignToBuffer(projectId) {
  const project = await ProjectCampaign.findById(projectId).lean();
  if (!project) throw new Error('Project not found.');

  // Fetch Companies
  const companies = await Company.find({ projectsAssociated: projectId, deletedAt: null }).sort({ companyName: 1 }).lean();
  
  // Fetch Leads
  const leads = await Lead.find({ campaignId: projectId, deletedAt: null }).sort({ createdAt: -1 }).lean();
  const companyMap = new Map(companies.map(c => [String(c._id), c]));

  // Build Companies Sheet
  const companyRows = [];
  companies.forEach((comp, idx) => {
    const pocsCount = leads.filter(l => String(l.companyId) === String(comp._id)).length;
    companyRows.push({
      '#': idx + 1,
      'Company Name': comp.companyName,
      'Website': comp.domain,
      'City': comp.city || '',
      'Country': comp.country || '',
      'Generic Email': (comp.genericEmails || []).join('; '),
      'Phone': comp.genericPhone || '',
      'POCs Found': pocsCount,
      'Status': comp.globalStatus || 'Lead',
      'Notes': comp.notes || '',
    });
  });

  // Build POCs Sheet
  const pocRows = [];
  leads.forEach((lead, idx) => {
    const comp = companyMap.get(String(lead.companyId));
    
    pocRows.push({
      'POC ID': idx + 1,
      'Full Name': lead.name || '',
      'Salutation': '',
      'Title': lead.designation || '',
      'Company': comp ? comp.companyName : '',
      'LinkedIn URL': lead.linkedinUrl || '',
      
      // LinkedIn Sales Nav Fields
      'Conn. Degree': '',
      'InMail Sent?': lead.linkedinOutreach?.inmailSent ? 'Yes' : 'No',
      'InMail Date': lead.linkedinOutreach?.inmailDate || '',
      'InMail Responded?': lead.linkedinOutreach?.inmailResponded ? 'Yes' : 'No',
      'InMail Resp. Date': '',
      'InMail Resp. Days': '',
      'Req. Sent?': lead.linkedinOutreach?.connSent ? 'Yes' : 'No',
      'Req. Date': lead.linkedinOutreach?.connDate || '',
      'Accepted?': lead.linkedinOutreach?.accepted ? 'Yes' : 'No',
      'Accepted Date': lead.linkedinOutreach?.acceptDate || '',
      'Days to Accept': '',
      'DM Sent?': lead.linkedinOutreach?.dmSent ? 'Yes' : 'No',
      'DM Date': lead.linkedinOutreach?.dmDate || '',
      'DM Responded?': lead.linkedinOutreach?.dmResponded ? 'Yes' : 'No',
      'DM Resp. Date': '',
      'DM Resp. Days': '',
      'LI Notes': lead.linkedinOutreach?.notes || '',

      // Apollo
      'Email (Apollo)': lead.emailApollo || '',
      'Quality': '',
      'Sent?': lead.primarySource === 'Apollo' && lead.deliveryStatus !== 'Pending Inqueue' ? 'Yes' : 'No',
      'Sent Date': '',
      'Bounced?': lead.primarySource === 'Apollo' && lead.deliveryStatus === 'Bounced / Invalid' ? 'Yes' : 'No',
      'Responded?': lead.primarySource === 'Apollo' && lead.deliveryStatus === 'Replied' ? 'Yes' : 'No',
      'Resp. Date': '',
      'Resp. Days': '',

      // Hunter
      'Email (Hunter)': lead.emailHunter || '',
      'Sent? (Hunter)': lead.primarySource === 'Hunter' && lead.deliveryStatus !== 'Pending Inqueue' ? 'Yes' : 'No',
      'Sent Date (Hunter)': '',
      'Bounced? (Hunter)': lead.primarySource === 'Hunter' && lead.deliveryStatus === 'Bounced / Invalid' ? 'Yes' : 'No',
      'Responded? (Hunter)': lead.primarySource === 'Hunter' && lead.deliveryStatus === 'Replied' ? 'Yes' : 'No',
      'Resp. Date (Hunter)': '',
      'Resp. Days (Hunter)': '',
      'Other contact info': '',

      // Lusha
      'Email (Lusha)': lead.emailLusha || '',
      'Personal / private email': lead.emailPersonal || '',
      'Phone 1': lead.phoneLusha1 || '',
      'Phone 2': lead.phoneLusha2 || '',
      'WhatsApp': lead.whatsappNumber || '',

      // Discovery
      'Time since job change?': '',
      'Email Sent?': lead.deliveryStatus !== 'Pending Inqueue' ? 'Yes' : 'No',
      'Email Date': '',
      'Email Bounced?': lead.deliveryStatus === 'Bounced / Invalid' ? 'Yes' : 'No',
      'Email Resp?': lead.deliveryStatus === 'Replied' ? 'Yes' : 'No',
      'Email Resp. Date': lead.repliedAt || '',
      'Email Resp. Days': '',
      'Call Made?': lead.coldCall?.made ? 'Yes' : 'No',
      'Call Date': lead.coldCall?.date || '',
      'Call Resp?': lead.coldCall?.response || '',
      'Call Notes': lead.coldCall?.notes || '',
      'WA Sent?': lead.whatsapp?.sent ? 'Yes' : 'No',
      'WA Date': lead.whatsapp?.date || '',
      'WA Resp?': lead.whatsapp?.response || '',
      'WA Resp. Date': '',
      'WA Resp. Days': '',
      'First Found Via': lead.primarySource || '',
      'Date Added': lead.createdAt || '',
      'Added By': 'CRM',
      'Notes': lead.coldCall?.notes || lead.linkedinOutreach?.notes || '',

      // Aggregate
      'Email for Outreach': lead.outreachEmail || '',
      'Phone for Outreach': lead.phone || '',
      'Touch Count': lead.trackingMetrics?.emailsDeliveredCount || 0,
      'Last Touch': lead.updatedAt || '',
      'Days Since': '',
      'Any Response?': lead.deliveryStatus === 'Replied' ? 'Yes' : 'No',
      'Days to 1st Resp.': '',
      'Outcome': lead.outcome || 'Pending',
    });
  });

  const wb = XLSX.utils.book_new();

  // Create worksheets
  const wsCompanies = XLSX.utils.json_to_sheet(companyRows);
  const wsPocs = XLSX.utils.json_to_sheet(pocRows);

  XLSX.utils.book_append_sheet(wb, wsCompanies, 'Companies');
  XLSX.utils.book_append_sheet(wb, wsPocs, 'POCs');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
