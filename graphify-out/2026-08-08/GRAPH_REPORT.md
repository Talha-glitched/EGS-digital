# Graph Report - .  (2026-08-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2851 nodes · 7874 edges · 155 communities (123 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d132ac5e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- crmApiFetch
- employeeOperationsService.js
- Lead.js
- LoadingState
- cn
- adminRoutes.js
- Alert
- OutreachDrawer.jsx
- projectService.js
- design_system.py
- campaignCleanupInventory.js
- CrmApp.jsx
- PortfolioFablePage.jsx
- HomePage.jsx
- ingestionService.js
- app.js
- contactEmails.js
- dependencies
- taskUtils.js
- RetailPage.jsx
- TasksPage.jsx
- interactionService.js
- dependencies
- sequenceFlow.js
- GalleryApp
- sendWorker.js
- EmptyState
- ProjectsPage.jsx
- RelationshipsPage.jsx
- usePageLifecycle
- ProjectDetailWorkspace.jsx
- useTableFilters
- LogInteractionModal.jsx
- SequenceNodeEditorModal.jsx
- productionExecutionService.js
- salesService.js
- db/index.js
- ExhibitionsPage.jsx
- contactInquiry.js
- OngoingJob.js
- mailTransport.js
- writeAuditLog
- ProjectDatabaseTable.jsx
- imapWatcherService.js
- AdvancedFilterPopover.jsx
- completedJobService.js
- supplierProcurementService.js
- filterSchemas.js
- auditDatabaseMigrationRisks.js
- profileDatabaseForSqlMigration.js
- jobDeliveryService.js
- resourceTimeService.js
- EmailHubPage.jsx
- Drawer.jsx
- contactTimelineService.js
- jobCommercialArtifactService.js
- jobCostingService.js
- unwrapBson
- inventoryService.js
- jobMemoryService.js
- leadResponse.js
- OngoingJobsPage.jsx
- analyticsCronService.js
- sequenceFlowExecutor.js
- CommunicationJobModal.jsx
- LeadTableView.jsx
- Company
- auditService.js
- jobCloseoutService.js
- jobSettlementService.js
- SequenceInspector.jsx
- fieldExecutionService.js
- CaseStudiesPage.jsx
- _sync_all.py
- resendAutoSyncService.js
- JobActivationModal.jsx
- dailyReview.test.js
- tableSortAccessors.js
- Navbar.jsx
- scripts
- restoreEmailThreadsFromStaging.js
- restoreWorkContextFromStaging.js
- getPipelineStages
- SpotlightSearch.jsx
- JobProductionPanel.jsx
- CompaniesPage.jsx
- SequenceBuilderWorkspace.jsx
- TodayPage.jsx
- getMailConfigStatus
- JobProcurementPanel.jsx
- useStandPreview.js
- openaiService.js
- SendDeliveryIssuesWorkspace.jsx
- auditPostgresMigrationReadOnly.js
- fixGisecLeadNames.js
- resendService.js
- restoreCampaignContextFromStaging.js
- seedDemoOperationalJob.js
- seedJobsFromSheet.mjs
- ServicesV2.jsx
- restoreContactContextFromStaging.js
- auditBusinessSemanticsReadOnly.js
- main
- recoverRuntimeInboundContext.js
- src/constants/pocQualification.js
- sendDeliveryErrors.js
- SequenceStudio.jsx
- client/vercel.json
- 03_migrate_staged_campaigns_sequences.js
- repairOpportunityValues.js
- repairRuntimeReplyTasks.js
- runPhase0Init.js
- runSchemaInit.js
- vercel.json
- RetailReassuranceSection.jsx
- backupDatabase.js
- runCampaignContactCoordinationBackfill.js
- runCampaignContactCoordinationMigration.js
- runCommunicationJobActionsMigration.js
- runEmployeeOperationsMigration.js
- runEmployeeUserSyncMigration.js
- runFieldExecutionMigration.js
- runInventoryBarcodeMigration.js
- runJobActivationMigration.js
- runJobCloseoutMigration.js
- runJobCommercialArtifactsMigration.js
- runJobCostingMigration.js
- runJobDeliveryMigration.js
- runJobMemoryMigration.js
- runProductionExecutionMigration.js
- runResourcePlanningMigration.js
- runResourcesAndTimeMigration.js
- runSequenceExecutionEngineMigration.js
- runStructuredQuoteLinesMigration.js
- runSupplierProcurementMigration.js
- runUnifiedTasksMigration.js
- test_real_receiving_id.mjs
- verifyJobCommercialArtifactsReadOnly.js
- verifyJobDeliveryReadOnly.js
- recalculateCampaignMetrics.js
- repairImapInboundContext.js
- verifyCrmRepairReadOnly.js
- verifyJobMemoryReadOnly.js

## God Nodes (most connected - your core abstractions)
1. `crmApiFetch()` - 200 edges
2. `cn()` - 172 edges
3. `Alert()` - 61 edges
4. `LoadingState()` - 48 edges
5. `writeAuditLog()` - 45 edges
6. `EmptyState()` - 43 edges
7. `Badge()` - 42 edges
8. `Modal()` - 38 edges
9. `normalizeId()` - 38 edges
10. `Lead` - 37 edges

## Surprising Connections (you probably didn't know these)
- `runJobSeeding()` --indirect_call--> `line()`  [INFERRED]
  server/scripts/seedJobsFromSheet.mjs → client/src/utils/contactInquiry.js
- `main()` --indirect_call--> `line()`  [INFERRED]
  server/scripts/02_ingest_mongo_staging.js → client/src/utils/contactInquiry.js
- `LoginPanel()` --calls--> `crmApiFetch()`  [EXTRACTED]
  client/src/admin/crm/CrmApp.jsx → client/src/admin/crm/crmApi.js
- `IntentPill()` --calls--> `cn()`  [EXTRACTED]
  client/src/admin/crm/components/inbox/UnifiedInboxWorkspace.jsx → client/src/admin/crm/components/ui/primitives.jsx
- `NavItem()` --calls--> `cn()`  [EXTRACTED]
  client/src/admin/crm/components/layout/Sidebar.jsx → client/src/admin/crm/components/ui/primitives.jsx

## Import Cycles
- None detected.

## Communities (155 total, 32 thin omitted)

### Community 0 - "crmApiFetch"
Cohesion: 0.04
Nodes (99): CommunicationSourceDrawer(), when(), DECISION_LABELS, JobArtifactsPanel(), VersionCard(), when(), EVIDENCE_LABELS, JobCloseoutPanel() (+91 more)

### Community 1 - "employeeOperationsService.js"
Cohesion: 0.06
Nodes (76): ALL_READ, ALL_WRITE, DENY_PERMISSION, getPermissionsForRole(), isValidRole(), permissionForRequest(), ROLE_LABELS, ROLE_PERMISSIONS (+68 more)

### Community 2 - "Lead.js"
Cohesion: 0.07
Nodes (49): __dirname, __filename, runAudit(), __dirname, __filename, parseEmailAndName(), runBackfill(), cleanTextString() (+41 more)

### Community 3 - "LoadingState"
Cohesion: 0.08
Nodes (41): ActionBadge(), TONES, ACTION_SUMMARY(), ActivityDetailDrawer(), ChangeTypeBadge(), TONES, CredentialResultModal(), FieldDiffList() (+33 more)

### Community 4 - "cn"
Cohesion: 0.08
Nodes (46): CampaignVendorPerformanceGrid(), SOURCE_DOT, SOURCE_DOT, VendorPerformanceGrid(), DailyReviewConsistency(), DashboardKeyRelationshipsSection(), DashboardLeadsSection(), DashboardOngoingJobsSection() (+38 more)

### Community 5 - "adminRoutes.js"
Cohesion: 0.05
Nodes (61): activityEvidenceUpload, blockedJobMemoryExtensions, fieldPhotoUpload, handleBulkDeleteOngoingJobs, handleCreateCompletedJob, handleCreateOngoingJob, handleDeleteCompletedJob, handleDeleteOngoingJob (+53 more)

### Community 6 - "Alert"
Cohesion: 0.07
Nodes (35): AddCompanyModal(), EMPTY, AddContactModal(), EMPTY, emptyStep(), GRADUATION_STEPS, ProjectSequenceMindMap(), ActivityResourcePlanningModal() (+27 more)

### Community 7 - "OutreachDrawer.jsx"
Cohesion: 0.06
Nodes (42): collectOutreachEmailOptions(), contactInitials(), OutreachDrawer(), populateFromLead(), RelationshipStatusPill(), TABS, toDateTimeLocal(), PocQualificationEditor() (+34 more)

### Community 8 - "projectService.js"
Cohesion: 0.06
Nodes (52): run(), requiredColumns, assertAccount(), getAccountWorkspace(), STATUS_BY_ASSESSMENT, applyReferralFocus(), coordinateReplyFocus(), holdAccountSending() (+44 more)

### Community 9 - "design_system.py"
Cohesion: 0.06
Nodes (42): BM25, detect_domain(), _load_csv(), Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query (+34 more)

### Community 10 - "campaignCleanupInventory.js"
Cohesion: 0.09
Nodes (41): main(), main(), pad(), __dirname, main(), XLSX_PATH, run(), run() (+33 more)

### Community 11 - "CrmApp.jsx"
Cohesion: 0.05
Nodes (43): BASE_NAV_GROUPS, NavItem(), Sidebar(), useSpotlightShortcut(), TopNavbar(), isPreviewNoticeDismissed(), PreviewWorkspaceModal(), PageHeader() (+35 more)

### Community 12 - "PortfolioFablePage.jsx"
Cohesion: 0.07
Nodes (40): ABOUT_SLIDES, BOTTOM_NAV_ITEMS, GRADUATION_SERVICE_HEADINGS, pad2(), PortfolioFablePage(), ALL_CLIENTS, CATEGORIES, { clients: SHORTLIST_CLIENTS, categoriesMap } (+32 more)

### Community 13 - "HomePage.jsx"
Cohesion: 0.07
Nodes (27): BlurText(), buildKeyframes(), proofItems, Footer(), homeFaqs, HomeFAQSection(), HomeHCTSection(), HomeProcessSection() (+19 more)

### Community 14 - "ingestionService.js"
Cohesion: 0.11
Nodes (37): main(), findOrCreateCampaign(), main(), markCampaignEmailed(), parseArgs(), PRESERVE_STATUSES, blendAndIngestLeads(), buildCompanyRows() (+29 more)

### Community 15 - "app.js"
Cohesion: 0.07
Nodes (37): app, clientDistDir, clientIndexPath, __dirname, __filename, projectRoot, serverRoot, uploadsDir (+29 more)

### Community 16 - "contactEmails.js"
Cohesion: 0.13
Nodes (36): run(), run(), extractEmailAddress(), extractResendId(), handleBounce(), handleReply(), freezeLeadSequence(), purgeLeadFromQueue() (+28 more)

### Community 17 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, gsap, lucide-react, motion, ogl, react, react-dom, react-redux (+32 more)

### Community 18 - "taskUtils.js"
Cohesion: 0.09
Nodes (28): FormattedEmailViewer(), parseEmailBodyToOutlookHtml(), stripLatestSubjectPrefix(), ContactFollowUpTasksSection(), CHANNEL_OPTIONS, ContactLeadTasksSection(), HUMAN_OUTCOMES, ContactUnifiedFollowUpsSection() (+20 more)

### Community 19 - "RetailPage.jsx"
Cohesion: 0.08
Nodes (29): failurePoints, RetailFailurePointsSection(), RetailProofSection(), RetailScopeSection(), scopeItems, MinimalCTASection(), MinimalFAQSection(), MinimalProcessSection() (+21 more)

### Community 20 - "TasksPage.jsx"
Cohesion: 0.14
Nodes (24): DEMO_ONGOING_JOB_TASKS, OngoingJobTasksPanel(), TaskTable(), buildOwnerOptions(), isDemoTask(), loadOwnerOptions(), TaskWorkspaceModal(), buildTaskFilterSchema() (+16 more)

### Community 21 - "interactionService.js"
Cohesion: 0.11
Nodes (31): run(), defaultTitleForType(), INTERACTION_DIRECTION_LABELS, INTERACTION_DIRECTIONS, INTERACTION_OUTCOME_LABELS, INTERACTION_OUTCOMES, INTERACTION_TYPE_LABELS, INTERACTION_TYPES (+23 more)

### Community 22 - "dependencies"
Cohesion: 0.06
Nodes (34): bcrypt, cors, dotenv, express, imapflow, mongoose, multer, nodemailer (+26 more)

### Community 23 - "sequenceFlow.js"
Cohesion: 0.18
Nodes (26): appendConditionWithBranches(), appendNode(), connectNodes(), createConditionNode(), createEdge(), createEmailNode(), createStartNode(), createWaitNode() (+18 more)

### Community 24 - "GalleryApp"
Cohesion: 0.10
Nodes (9): autoBind(), CircularGallery(), createTextTexture(), debounce(), GalleryApp, getFontSize(), lerp(), Media (+1 more)

### Community 25 - "sendWorker.js"
Cohesion: 0.11
Nodes (30): capResendBatchSize(), RESEND_MAX_EMAILS_PER_REQUEST, getBaseUrl(), getFromIdentity(), isPublicTrackableUrl(), AUTO_LOCKED_STATUSES, deriveAutoCampaignStatus(), syncAutoCampaignStatus() (+22 more)

### Community 26 - "EmptyState"
Cohesion: 0.08
Nodes (29): EmployeeCreateModal(), EMPLOYMENT_LABELS, generatePassword(), initial, EmployeeUserSyncModal(), JobCostingPanel(), LABELS, money() (+21 more)

### Community 27 - "ProjectsPage.jsx"
Cohesion: 0.10
Nodes (22): CampaignStageControl(), EmailOutboxWorkspace(), formatLaunchDate(), STATUS_CONFIG, StatusBadge(), DEADLINE_TONE_STYLES, NONE_OPTION, CAMPAIGN_FILTER_SCHEMA (+14 more)

### Community 28 - "RelationshipsPage.jsx"
Cohesion: 0.14
Nodes (24): formatDate(), SequenceListPanel(), ClickableTableRow(), stopRowClick(), TableHeaderLabel(), PageToolbar(), ToolbarCount(), SortableTableHeader() (+16 more)

### Community 29 - "usePageLifecycle"
Cohesion: 0.10
Nodes (21): CrmApp(), App(), SITE_ORIGIN, siteUrl(), hydrateMarquees(), hydrateReveals(), setCanonicalLink(), setMetaTag() (+13 more)

### Community 30 - "ProjectDetailWorkspace.jsx"
Cohesion: 0.06
Nodes (42): CoverageMetricsBanner(), MetricCard(), ContactBlenderModal(), EMAIL_FIELDS, FALLBACK_SOURCES, FIELD_LABELS, ExhibitorImportModal(), FIELD_LABELS (+34 more)

### Community 31 - "useTableFilters"
Cohesion: 0.17
Nodes (24): ConversationThreadView(), IntentPill(), UnifiedInboxWorkspace(), AdvancedFilterChips(), AdvancedFilterPopover(), applyTableFilters(), countActiveFilters(), countActiveFiltersByGroup() (+16 more)

### Community 32 - "LogInteractionModal.jsx"
Cohesion: 0.14
Nodes (24): TimelineEventCard(), directionTone(), formatRelativeWhen(), formatWhen(), isTeamActor(), resolveDirectionLabel(), resolveInteractionBody(), resolveInteractionDirection() (+16 more)

### Community 33 - "SequenceNodeEditorModal.jsx"
Cohesion: 0.14
Nodes (20): BRANCH_TYPES, getConditionLabel(), nodeIcon(), NodeInspector(), BRANCH_ACTIONS, CONDITION_TYPES, ConditionEditor(), NODE_META (+12 more)

### Community 34 - "productionExecutionService.js"
Cohesion: 0.16
Nodes (25): from, now, to, ACTIVITY_STATUSES, ACTIVITY_TYPES, addActivityUpdate(), archiveJobActivity(), assertJob() (+17 more)

### Community 35 - "salesService.js"
Cohesion: 0.10
Nodes (24): CLOSED_LOST_STAGE, CLOSED_WON_STAGE, isClosedStage(), probabilityForStage(), stageNames(), bulkSoftDelete(), CHANNEL_TO_INTERACTION_TYPE, createOpportunity (+16 more)

### Community 36 - "db/index.js"
Cohesion: 0.12
Nodes (17): getClient(), getPool(), query(), getCommunicationsWorkspace(), positiveInt(), getEmployeeOperationsWorkspace(), activateJobDelivery(), assertContext() (+9 more)

### Community 37 - "ExhibitionsPage.jsx"
Cohesion: 0.11
Nodes (17): ExhibitionsAdaptationSection(), ExhibitionsCTASection(), exhibitionFaqs, ExhibitionsFAQSection(), ExhibitionsHeroSection(), exhibitionSublineItems, ExhibitionsProcessSection(), processSteps (+9 more)

### Community 38 - "contactInquiry.js"
Cohesion: 0.14
Nodes (21): InquiryModal(), buildInquiryMailto(), composeInquiryEmail(), createEmptyInquiryForm(), CTA_LABELS, DEADLINE_OPTIONS, EGS_EMAIL, GUEST_SCALE_OPTIONS (+13 more)

### Community 39 - "OngoingJob.js"
Cohesion: 0.14
Nodes (18): run(), __dirname, __filename, runMigration(), STAGE_MAPPING, COMPLETED_JOB_CATEGORIES, CompletedJob, completedJobSchema (+10 more)

### Community 40 - "mailTransport.js"
Cohesion: 0.17
Nodes (18): client, users, client, client, identity, transporter, appendOutboundCopyToSent(), compileOutboundMessage() (+10 more)

### Community 41 - "writeAuditLog"
Cohesion: 0.21
Nodes (22): writeAuditLog(), addTaskEvidence(), createUnifiedTask(), displayPriority(), displayStatus(), getTaskJobContext(), getUnifiedTask(), listUnifiedTasks() (+14 more)

### Community 42 - "ProjectDatabaseTable.jsx"
Cohesion: 0.14
Nodes (14): CHANNEL_LABELS, DeliveryStatusBadge(), ResponseStatusBadge(), SOURCE_STYLES, STATUS_CONFIG, PocQualificationBadge(), TONE_CLASSES, SEND_JOB_STATUS_CONFIG (+6 more)

### Community 43 - "imapWatcherService.js"
Cohesion: 0.16
Nodes (20): run(), activeSyncs, decodeQuotedPrintable(), findLeadForMessage(), getInboxThread(), handleBounceMessage(), handleHumanReply(), listInboxThreads() (+12 more)

### Community 44 - "AdvancedFilterPopover.jsx"
Cohesion: 0.13
Nodes (9): FilterCategoryNav(), TRI_OPTIONS, hasOpenNestedOverlay(), openIds, registerNestedOverlay(), SearchableCombobox(), SearchableMultiSelect(), summarizeSelection() (+1 more)

### Community 45 - "completedJobService.js"
Cohesion: 0.13
Nodes (20): cleanNumber(), COMPLETED_JOB_CATEGORIES, createCompletedJob(), createCompletedJobFromOngoingJob(), createJob, createJobFromOpportunity, deleteCompletedJob(), deleteJob (+12 more)

### Community 46 - "supplierProcurementService.js"
Cohesion: 0.25
Nodes (21): addSupplierCommitmentUpdate(), assertJob(), assertWorkPackage(), audit(), COMMITMENT_STATUSES, createSupplier(), createSupplierCommitment(), createSupplierQuote() (+13 more)

### Community 47 - "filterSchemas.js"
Cohesion: 0.11
Nodes (19): applyFieldOptions(), buildLeadFilterSchema(), buildOpportunityFilterSchema, CAMPAIGN_COMPANY_FILTER_SCHEMA, CAMPAIGN_LEAD_FILTER_SCHEMA, CAMPAIGN_ROI_FILTER_SCHEMA, CAMPAIGN_STATUSES, COMPANY_FILTER_SCHEMA (+11 more)

### Community 48 - "auditDatabaseMigrationRisks.js"
Cohesion: 0.26
Nodes (18): add(), auditCampaignCounters(), auditCompanies(), auditJobs(), auditLeads(), auditMessages(), auditOpportunities(), auditOutreachConsistency() (+10 more)

### Community 49 - "profileDatabaseForSqlMigration.js"
Cohesion: 0.21
Nodes (19): addCandidate(), bsonType(), collectValue(), CONTROLLED_VALUE_PATHS, countOrphans(), getFieldStat(), main(), normalizeEmail() (+11 more)

### Community 50 - "jobDeliveryService.js"
Cohesion: 0.33
Nodes (19): archiveJobLocation(), archiveJobPhase(), archiveWorkPackage(), assertJob(), audit(), createJobLocation(), createJobPhase(), createWorkPackage() (+11 more)

### Community 51 - "resourceTimeService.js"
Cohesion: 0.28
Nodes (19): addAvailabilityBlock(), assignResource(), audit(), AVAILABILITY_TYPES, correctTimeEntry(), createManualTimeEntry(), createResource(), getResourceWorkspace() (+11 more)

### Community 52 - "EmailHubPage.jsx"
Cohesion: 0.18
Nodes (16): AttentionRow(), CommunicationsOverview(), LinkedCommunicationsWorkspace(), MessageRow(), when(), ACTIVE, OUTCOMES, ReplyReviewModal() (+8 more)

### Community 53 - "Drawer.jsx"
Cohesion: 0.20
Nodes (13): audienceToApiParams(), AudiencePreviewModal(), trimEmail(), CampaignListImportModal(), STATUS_FILTERS, SequenceStudioToast(), TONE_STYLES, WIDTHS (+5 more)

### Community 54 - "contactTimelineService.js"
Cohesion: 0.27
Nodes (16): main(), run(), decodeHtmlEntities(), decodeQuotedPrintable(), event(), extractCleanEmail(), extractMimePlainText(), getCompanyTimeline() (+8 more)

### Community 55 - "jobCommercialArtifactService.js"
Cohesion: 0.27
Nodes (18): addDesignVersion(), addQuoteVersion(), assertJob(), audit(), cleanText(), createDesignSet(), createQuote(), dateOnly() (+10 more)

### Community 56 - "jobCostingService.js"
Cohesion: 0.33
Nodes (18): archiveCostEstimate(), audit(), confirmJobCosts(), createCostEstimate(), createOtherActualCost(), ESTIMATE_CATEGORIES, getJobCosting(), money() (+10 more)

### Community 57 - "unwrapBson"
Cohesion: 0.16
Nodes (13): apply, date(), number(), oid(), pool, scriptDir, apply, asDate() (+5 more)

### Community 58 - "inventoryService.js"
Cohesion: 0.31
Nodes (17): addPackingLine(), audit(), createInventoryAsset(), createInventoryItem(), createInventoryLocation(), createInventoryReservation(), createPackingList(), getInventoryWorkspace() (+9 more)

### Community 59 - "jobMemoryService.js"
Cohesion: 0.22
Nodes (16): assertJob(), createJobMemoryEntry(), JOB_MEMORY_TYPES, listJobMemory(), listJobMemoryVersions(), loadEntry(), mapAttachment(), mapEntry() (+8 more)

### Community 60 - "leadResponse.js"
Cohesion: 0.23
Nodes (13): buildEarliestInboundByLead(), buildLatestInteractionByLead(), earliestDate(), enrichCompaniesWithResponse(), enrichLeadsWithResponse(), enrichLeadWithResponse(), getCompanyResponseMeta(), getLeadLastInteractionAt() (+5 more)

### Community 61 - "OngoingJobsPage.jsx"
Cohesion: 0.19
Nodes (15): buildOngoingJobFilterSchema(), deleteOngoingJobs(), deleteOngoingJobWithUndo(), CompletedJobsPage(), DEFAULT_STAGES, formatShortDate(), getExecutionSummary(), LATE_STAGES (+7 more)

### Community 62 - "analyticsCronService.js"
Cohesion: 0.20
Nodes (12): findCampaign(), main(), PRESERVE_STATUSES, run(), run(), computeGlobalSnapshot(), computeProjectSnapshot(), computeVendorMatrix() (+4 more)

### Community 63 - "sequenceFlowExecutor.js"
Cohesion: 0.25
Nodes (14): DELAY_UNITS, delayToMs(), formatStepDelay(), normalizeDelayUnit(), parseStepDelay(), evaluateCondition(), findFlowNode(), getNextNodeId() (+6 more)

### Community 64 - "CommunicationJobModal.jsx"
Cohesion: 0.23
Nodes (13): ACTIONS, CommunicationJobModal(), localDue(), stamp(), EmailDetailsDrawer(), formatTime(), STATUS_CONFIG, StatusBadge() (+5 more)

### Community 65 - "LeadTableView.jsx"
Cohesion: 0.18
Nodes (10): LeadFilterToolbar(), SourceAttributionChips(), initials(), LeadTableView(), VendorEmailColumns(), VendorEmailHeaders(), PAGE_SIZE_OPTIONS, TablePagination() (+2 more)

### Community 66 - "Company"
Cohesion: 0.23
Nodes (11): findCampaign(), main(), normLi(), normName(), parseExcel(), run(), run(), run() (+3 more)

### Community 67 - "auditService.js"
Cohesion: 0.23
Nodes (12): AuditLog, auditLogSchema, getAuditLogById(), getUserActivitySummary(), listAuditLogs(), ACTIONS, communicationContext(), createCommunicationJobAction() (+4 more)

### Community 68 - "jobCloseoutService.js"
Cohesion: 0.30
Nodes (15): assertJob(), audit(), createJobSnag(), EVIDENCE_TYPES, getJobCloseout(), IMAGE_TYPES, safeName(), saveJobHandover() (+7 more)

### Community 69 - "jobSettlementService.js"
Cohesion: 0.30
Nodes (15): amount(), audit(), deleteMilestone(), DELIVERY_STATES, getJobSettlement(), getSettlementQueues(), MILESTONE_LABELS, MILESTONE_STATES (+7 more)

### Community 70 - "SequenceInspector.jsx"
Cohesion: 0.21
Nodes (10): audienceWithImportedCampaign(), buildAudienceSummary(), buildImportedListLabels(), EMPTY_AUDIENCE, normalizeCampaignId(), MailboxUsagePopover(), AudienceAddRow(), CONDITION_TYPES (+2 more)

### Community 71 - "fieldExecutionService.js"
Cohesion: 0.24
Nodes (13): coverage, ACTIONS, currentResource(), dayBounds(), getTodayWorkspace(), PHOTO_TYPES, safeName(), serviceDir (+5 more)

### Community 73 - "CaseStudiesPage.jsx"
Cohesion: 0.15
Nodes (7): PLACEHOLDER_COPY, PlaceholderPage(), caseFaqs, caseProofCards, cases, CaseStudiesPage(), caseStudiesRevealSelector

### Community 74 - "_sync_all.py"
Cohesion: 0.29
Nodes (13): blend(), derive_row(), derive_ui_reasoning(), h2r(), is_dark(), lum(), on_color(), r2h() (+5 more)

### Community 75 - "resendAutoSyncService.js"
Cohesion: 0.27
Nodes (11): startAnalyticsCron(), initializeCrmRuntime(), startImapWatcher(), recalculateAllCampaignCoverageStats(), classifyInboundEmail(), parseEmailAndName(), startResendAutoSyncCron(), stopResendAutoSyncCron() (+3 more)

### Community 76 - "JobActivationModal.jsx"
Cohesion: 0.22
Nodes (9): dayLabel(), JobActivationModal(), scheduled(), STEPS, today(), when(), JobDeliveryPanel(), PROGRESS_LABELS (+1 more)

### Community 77 - "dailyReview.test.js"
Cohesion: 0.32
Nodes (10): DailyReviewRecord, DailyReviewRecordSchema, completeDailyReview(), getDashboardWorkingViewData(), getDubaiBusinessDate(), getMonthlyReviewHistory(), getTodayReviewStatus(), parseDubaiYearMonth() (+2 more)

### Community 78 - "tableSortAccessors.js"
Cohesion: 0.17
Nodes (11): campaignCompanySortAccessors, campaignRoiSortAccessors, campaignSortAccessors, companySortAccessors, leadSortAccessors, ongoingJobSortAccessors, opportunitySortAccessors, relationshipSortAccessors (+3 more)

### Community 79 - "Navbar.jsx"
Cohesion: 0.26
Nodes (9): InquiryBriefCard(), CardNav(), defaultItems, getLinkIconStyle(), MobileNavLink(), Navbar(), InquiryModalContext, InquiryModalProvider() (+1 more)

### Community 80 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:client, dev:server, start (+2 more)

### Community 81 - "restoreEmailThreadsFromStaging.js"
Cohesion: 0.20
Nodes (8): apply, asDate(), clean(), lower(), oid(), pool, scriptDir, withSchema

### Community 82 - "restoreWorkContextFromStaging.js"
Cohesion: 0.18
Nodes (6): apply, asDate(), oid(), pool, scriptDir, withSchema

### Community 83 - "getPipelineStages"
Cohesion: 0.27
Nodes (11): appendActivity(), cleanNumber(), createOngoingJob(), getOngoingJob(), getOngoingJobTimeline(), getPipelineConfig(), getPipelineStages(), normalizeStages() (+3 more)

### Community 84 - "SpotlightSearch.jsx"
Cohesion: 0.36
Nodes (9): filterNav(), filterProjects(), matchesQuery(), mergeGroups(), normalize(), QUICK_NAV, SpotlightSearch(), TYPE_ICONS (+1 more)

### Community 85 - "JobProductionPanel.jsx"
Cohesion: 0.25
Nodes (5): JobProductionPanel(), STATUS_LABELS, TYPE_LABELS, UPDATE_LABELS, when()

### Community 86 - "CompaniesPage.jsx"
Cohesion: 0.53
Nodes (8): ProjectDatabaseTable(), buildDistinctFieldOptions(), buildDistinctFieldOptionsFromArrays(), withFieldOptions(), deleteCompanies(), deleteCompanyWithUndo(), deleteLeadWithUndo(), CompaniesPage()

### Community 87 - "SequenceBuilderWorkspace.jsx"
Cohesion: 0.42
Nodes (6): buildAudienceQuery(), SequenceBuilderWorkspace(), AUDIENCE_MODES, emptySequenceStep(), GRADUATION_STEPS, isGraduationCampaign()

### Community 88 - "TodayPage.jsx"
Cohesion: 0.33
Nodes (7): ActivityCard(), dateValue(), FieldActionModal(), GROUPS, STATUS_TONE, TodayPage(), when()

### Community 89 - "getMailConfigStatus"
Cohesion: 0.33
Nodes (7): SystemSettings, systemSettingsSchema, getMailConfigStatus(), getCrmAdminStatus(), getSystemSettings(), updateSystemSettings(), getEmailDeliveryStatus()

### Community 90 - "JobProcurementPanel.jsx"
Cohesion: 0.32
Nodes (5): amount(), JobProcurementPanel(), STATUS_LABELS, UPDATE_LABELS, when()

### Community 91 - "useStandPreview.js"
Cohesion: 0.36
Nodes (4): buildCubeEdges(), buildStand(), getCssVariable(), useStandPreview()

### Community 92 - "openaiService.js"
Cohesion: 0.54
Nodes (7): calculateTokenCost(), chatCompletion(), classifyReplyIntent(), generateSequenceEmail(), getCostPer1kTokens(), isOpenAiConfigured(), personalizeTemplate()

### Community 93 - "SendDeliveryIssuesWorkspace.jsx"
Cohesion: 0.43
Nodes (6): DeliveryIssueDetail(), formatWhen(), IssueBadge(), SendDeliveryIssuesWorkspace(), SequenceDeliveryAlert(), severityTone()

### Community 94 - "auditPostgresMigrationReadOnly.js"
Cohesion: 0.33
Nodes (5): pool, report, rows(), scalar(), scriptDir

### Community 95 - "fixGisecLeadNames.js"
Cohesion: 0.52
Nodes (5): findCampaign(), main(), fixMojibakeName(), MOJIBAKE_REPLACEMENTS, nameNeedsMojibakeFix()

### Community 96 - "resendService.js"
Cohesion: 0.52
Nodes (5): run(), extractCleanEmail(), extractTextFromEml(), getResendMetrics(), syncResendHistory()

### Community 97 - "restoreCampaignContextFromStaging.js"
Cohesion: 0.29
Nodes (4): apply, oid(), pool, scriptDir

### Community 98 - "seedDemoOperationalJob.js"
Cohesion: 0.48
Nodes (6): days(), DEMO_TAG, findDemo(), remove(), seed(), verify()

### Community 99 - "seedJobsFromSheet.mjs"
Cohesion: 0.43
Nodes (6): cleanNum(), __dirname, __filename, parseCsvLine(), parseDate(), runJobSeeding()

### Community 100 - "ServicesV2.jsx"
Cohesion: 0.47
Nodes (4): chapterProgress(), PAGE_THEMES, ServicesV2(), smoothstep()

### Community 101 - "restoreContactContextFromStaging.js"
Cohesion: 0.33
Nodes (4): apply, assessmentByStatus, pool, scriptDir

### Community 102 - "auditBusinessSemanticsReadOnly.js"
Cohesion: 0.40
Nodes (3): pool, report, scriptDir

### Community 103 - "main"
Cohesion: 0.80
Nodes (4): convertTextToOutlookHtml(), main(), stripHtmlTags(), stripLatestSubjectPrefix()

### Community 104 - "recoverRuntimeInboundContext.js"
Cohesion: 0.40
Nodes (3): apply, pool, scriptDir

### Community 105 - "src/constants/pocQualification.js"
Cohesion: 0.40
Nodes (3): POC_QUALIFICATION_DESCRIPTIONS, POC_QUALIFICATION_LABELS, POC_QUALIFICATION_STATUSES

### Community 106 - "sendDeliveryErrors.js"
Cohesion: 0.60
Nodes (4): describeSendDeliveryError(), ERROR_RULES, formatDeliveryIssueRow(), STATUS_LABELS

### Community 108 - "SequenceStudio.jsx"
Cohesion: 0.25
Nodes (11): disconnectEdge(), flowGraphFromState(), buildSequenceMeta(), formatWhen(), SequenceSidebar(), buildAudienceParams(), SequenceStudio(), useStudioToast() (+3 more)

### Community 109 - "client/vercel.json"
Cohesion: 0.50
Nodes (3): headers, redirects, rewrites

### Community 111 - "repairOpportunityValues.js"
Cohesion: 0.50
Nodes (3): apply, pool, scriptDir

### Community 112 - "repairRuntimeReplyTasks.js"
Cohesion: 0.50
Nodes (3): apply, pool, scriptDir

### Community 115 - "vercel.json"
Cohesion: 0.50
Nodes (3): headers, redirects, rewrites

## Knowledge Gaps
- **536 isolated node(s):** `name`, `private`, `type`, `dev`, `build` (+531 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `line()` connect `contactInquiry.js` to `seedJobsFromSheet.mjs`?**
  _High betweenness centrality (0.364) - this node is a cross-community bridge._
- **Why does `runJobSeeding()` connect `seedJobsFromSheet.mjs` to `adminRoutes.js`, `contactInquiry.js`, `OngoingJob.js`?**
  _High betweenness centrality (0.363) - this node is a cross-community bridge._
- **Why does `crmApiFetch()` connect `crmApiFetch` to `LoadingState`, `cn`, `Alert`, `OutreachDrawer.jsx`, `CrmApp.jsx`, `taskUtils.js`, `TasksPage.jsx`, `EmptyState`, `ProjectsPage.jsx`, `RelationshipsPage.jsx`, `usePageLifecycle`, `ProjectDetailWorkspace.jsx`, `useTableFilters`, `ProjectDatabaseTable.jsx`, `EmailHubPage.jsx`, `Drawer.jsx`, `OngoingJobsPage.jsx`, `CommunicationJobModal.jsx`, `LeadTableView.jsx`, `JobActivationModal.jsx`, `SpotlightSearch.jsx`, `JobProductionPanel.jsx`, `CompaniesPage.jsx`, `SequenceBuilderWorkspace.jsx`, `TodayPage.jsx`, `JobProcurementPanel.jsx`, `SequenceStudio.jsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `name`, `private`, `type` to the rest of the system?**
  _536 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `crmApiFetch` be split into smaller, more focused modules?**
  _Cohesion score 0.043369474562135114 - nodes in this community are weakly interconnected._
- **Should `employeeOperationsService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05787545787545788 - nodes in this community are weakly interconnected._
- **Should `Lead.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06522522522522523 - nodes in this community are weakly interconnected._