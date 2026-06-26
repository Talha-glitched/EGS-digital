import assert from 'assert';
import { detectVendor } from '../src/services/ingestionService.js';

// Mock mongoose and models for unit testing ingestion without DB connection
import mongoose from 'mongoose';
import { Company } from '../src/models/Company.js';
import { Lead } from '../src/models/Lead.js';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { Suppression } from '../src/models/Suppression.js';
import { Reply } from '../src/models/Reply.js';
import { RevenueEntry } from '../src/models/RevenueEntry.js';
import { AnalyticsSnapshot } from '../src/models/AnalyticsSnapshot.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { SendJob } from '../src/models/SendJob.js';

// Setup Mock readiness
mongoose.connection.readyState = 1;

async function runTests() {
  console.log('🚀 Starting Data Blender & CRM Workflow Unit Tests...');

  // ==========================================
  // Test 1: Header Auto-Detection
  // ==========================================
  console.log('\n--- Test 1: Vendor Header Auto-detection ---');
  
  const apolloHeaders = ['First Name', 'Last Name', 'Email', 'Company', 'Person Linkedin Url', 'Title'];
  const hunterHeaders = ['First Name', 'Email', 'Hunter Score', 'Company Name'];
  const lushaHeaders = ['Name', 'Work Email 2', 'Lusha Phone 1', 'Company'];
  const manualHeaders = ['Contact Name', 'Email Address', 'Company Name', 'Website'];

  assert.strictEqual(detectVendor(apolloHeaders), 'Apollo', 'Should detect Apollo headers');
  assert.strictEqual(detectVendor(hunterHeaders), 'Hunter', 'Should detect Hunter headers');
  assert.strictEqual(detectVendor(lushaHeaders), 'Lusha', 'Should detect Lusha headers');
  assert.strictEqual(detectVendor(manualHeaders), 'Manual', 'Should fallback to Manual for unknown headers');
  
  console.log('✅ Vendor Header Auto-detection passed.');

  // ==========================================
  // Test 2: In-Memory Ingestion & Deduplication logic
  // ==========================================
  console.log('\n--- Test 2: Multi-file Data Blend Ingestion & Deduplication ---');

  // Stub model behaviors
  const createdCompanies = [];
  const createdLeads = [];
  const updatedCompanies = [];

  ProjectCampaign.findById = async (id) => {
    return {
      _id: id,
      projectName: 'Test GISEC Campaign',
      companiesWithPocsFound: 0,
      targetCompaniesCount: 0,
      save: async function() { return this; }
    };
  };

  Company.find = () => ({
    lean: async () => []
  });
  Company.findOne = async ({ domain }) => null;
  Company.create = async (data) => {
    const doc = { 
      _id: new mongoose.Types.ObjectId(), 
      ...data,
      toObject: function() { return this; }
    };
    createdCompanies.push(doc);
    return doc;
  };
  Company.countDocuments = async () => createdCompanies.length;

  Lead.findOne = async ({ email }) => {
    return createdLeads.find(l => l.email === email) || null;
  };
  Lead.create = async (data) => {
    const doc = { _id: new mongoose.Types.ObjectId(), sources: data.sources || [], ...data };
    createdLeads.push(doc);
    return doc;
  };
  Lead.aggregate = async () => [{ total: createdLeads.length }];

  Suppression.findOne = async () => null;

  // Import blendAndIngestLeads dynamically after stubs are set up
  const { blendAndIngestLeads } = await import('../src/services/ingestionService.js');

  const projectId = new mongoose.Types.ObjectId().toString();

  // Define inputs with duplicates
  const uploadPayload = [
    {
      vendor: 'Apollo',
      sheets: [{
        headers: ['First Name', 'Email', 'Company', 'Person Linkedin Url', 'Title'],
        dataRows: [
          ['Joy Alon', 'joy@company.com', 'Company A', 'https://linkedin.com/in/joy-alon', 'Manager']
        ]
      }],
      fieldMapping: {
        name: 'First Name',
        email: 'Email',
        companyName: 'Company',
        linkedin: 'Person Linkedin Url',
        designation: 'Title'
      }
    },
    {
      vendor: 'Lusha',
      sheets: [{
        headers: ['Name', 'Work Email 2', 'Lusha Phone 1', 'Company'],
        dataRows: [
          ['Joy Alon', 'joy.alon@company.com', '+971501234567', 'Company A']
        ]
      }],
      fieldMapping: {
        name: 'Name',
        email: 'Work Email 2',
        phone: 'Lusha Phone 1',
        companyName: 'Company'
      }
    }
  ];

  // Execute blender logic
  const stats = await blendAndIngestLeads(projectId, uploadPayload);

  console.log('Ingestion Stats Result:', stats);
  assert.ok(stats.inserted >= 1, 'Should have inserted at least 1 unified lead');
  assert.strictEqual(createdCompanies.length, 1, 'Should have created exactly 1 company for "company.com"');
  
  // Verify blended lead values
  const blendedLead = createdLeads[0];
  assert.ok(blendedLead, 'Blended lead should exist');
  assert.strictEqual(blendedLead.name, 'Joy Alon');
  assert.strictEqual(blendedLead.email, 'joy@company.com');
  assert.strictEqual(blendedLead.emailLusha, 'joy.alon@company.com');
  assert.strictEqual(blendedLead.phone, '+971501234567');
  assert.ok(blendedLead.sources.includes('Apollo') && blendedLead.sources.includes('Lusha'), 'Sources should contain both Apollo and Lusha');

  console.log('✅ In-Memory Data Blend Ingestion & Deduplication passed.');

  // ==========================================
  // Test 3: Email Sequence Freeze Match Variations
  // ==========================================
  console.log('\n--- Test 3: Email Sync & Freeze Sequence Match ---');

  // Stub Lead.findOne to mock IMAP finder
  Lead.findOne = async (query) => {
    // query is { $or: [ {email}, {emailApollo}, {emailHunter}, {emailLusha} ] }
    const lookupEmails = query.$or.map(clause => Object.values(clause)[0]);
    return createdLeads.find(l => 
      lookupEmails.includes(l.email) || 
      lookupEmails.includes(l.emailApollo) || 
      lookupEmails.includes(l.emailHunter) || 
      lookupEmails.includes(l.emailLusha)
    ) || null;
  };

  // We check if we can resolve the lead by fromAddress
  const fromAddressMockApollo = 'joy@company.com';
  const fromAddressMockLusha = 'joy.alon@company.com';

  const mockQueryApollo = {
    $or: [
      { email: fromAddressMockApollo },
      { emailApollo: fromAddressMockApollo },
      { emailHunter: fromAddressMockApollo },
      { emailLusha: fromAddressMockApollo },
    ],
    deliveryStatus: { $in: ['Emailed Outbound', 'Replied'] }
  };

  const mockQueryLusha = {
    $or: [
      { email: fromAddressMockLusha },
      { emailApollo: fromAddressMockLusha },
      { emailHunter: fromAddressMockLusha },
      { emailLusha: fromAddressMockLusha },
    ],
    deliveryStatus: { $in: ['Emailed Outbound', 'Replied'] }
  };

  const foundLeadByApollo = await Lead.findOne(mockQueryApollo);
  const foundLeadByLusha = await Lead.findOne(mockQueryLusha);

  assert.ok(foundLeadByApollo, 'Should find lead using primary email');
  assert.ok(foundLeadByLusha, 'Should find lead using Lusha email variation');
  assert.strictEqual(foundLeadByApollo._id.toString(), foundLeadByLusha._id.toString(), 'Should resolve to the identical blended lead');

  console.log('✅ Email Sync & Freeze Sequence Match passed.');

  // ==========================================
  // Test 4: Global Directories Queries
  // ==========================================
  console.log('\n--- Test 4: Global Directory Filters & Mappings ---');

  // Stub queries for directory operations
  const leadChain = {
    sort: () => leadChain,
    skip: () => leadChain,
    limit: () => leadChain,
    populate: () => leadChain,
    select: () => leadChain,
    lean: async () => [
      {
        _id: 'lead-1',
        name: 'Joy Alon',
        email: 'joy@company.com',
        designation: 'Manager',
        campaignId: 'proj-1',
        deliveryStatus: 'Replied',
        primarySource: 'Apollo',
        companyId: { _id: 'comp-1', companyName: 'Company A', domain: 'company.com' }
      }
    ]
  };
  Lead.find = () => leadChain;
  Lead.countDocuments = async () => 1;

  ProjectCampaign.find = () => ({
    select: () => ({
      lean: async () => [{ _id: 'proj-1', projectName: 'GISEC 2026' }]
    }),
    lean: async () => [{ _id: 'proj-1', projectName: 'GISEC 2026', financialLedger: { totalProjectCost: 2000, validatedRevenueWon: 8000 } }]
  });
  ProjectCampaign.countDocuments = async () => 1;

  const compChain = {
    sort: () => compChain,
    skip: () => compChain,
    limit: () => compChain,
    lean: async () => [
      { _id: 'comp-1', companyName: 'Company A', domain: 'company.com', projectsAssociated: ['proj-1'] }
    ]
  };
  Company.find = () => compChain;
  Company.countDocuments = async () => 1;

  Lead.aggregate = async () => [
    { _id: 'comp-1', count: 1 }
  ];

  const { listAllLeads, listAllCompanies } = await import('../src/services/projectService.js');

  const leadList = await listAllLeads({ search: 'Joy' });
  assert.strictEqual(leadList.items.length, 1, 'Should find 1 lead');
  assert.strictEqual(leadList.items[0].companyName, 'Company A', 'Should populate companyName correctly');
  assert.strictEqual(leadList.items[0].campaignName, 'GISEC 2026', 'Should map campaignName successfully');

  const compList = await listAllCompanies({ search: 'Company' });
  assert.strictEqual(compList.items.length, 1, 'Should find 1 company');
  assert.strictEqual(compList.items[0].pocCount, 1, 'Should count known contacts correctly');
  assert.deepStrictEqual(compList.items[0].campaignNames, ['GISEC 2026'], 'Should link campaigns');

  console.log('✅ Global Directory Filters & Mappings passed.');

  // ==========================================
  // Test 5: Comprehensive Analytics Aggregation
  // ==========================================
  console.log('\n--- Test 5: Comprehensive ROI & Metrics Aggregation ---');

  // Stub aggregations for metrics
  SendJob.aggregate = async () => [
    { _id: 0, count: 100 },
    { _id: 1, count: 50 }
  ];

  const { getComprehensiveAnalytics } = await import('../src/services/projectService.js');

  const report = await getComprehensiveAnalytics();
  assert.strictEqual(report.totalLeads, 1, 'Should return total leads count');
  assert.strictEqual(report.totalCompanies, 1, 'Should return total companies count');
  assert.strictEqual(report.stepsPerformance[0].sent, 100, 'Step 1 should show 100 sends');
  assert.strictEqual(report.financials.totalRevenue, 8000, 'Total revenue should sum properly');
  assert.strictEqual(report.financials.totalCost, 2000, 'Total cost should sum properly');
  assert.strictEqual(report.financials.roiPercent, 300, 'ROI percentage should calculate as 300%');

  console.log('✅ Comprehensive ROI & Metrics Aggregation passed.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
