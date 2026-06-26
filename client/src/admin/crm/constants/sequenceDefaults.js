export const GRADUATION_STEPS = [
  {
    stepOrder: 1,
    dayDelay: 0,
    subjectTemplate: '[University]: ceremony scale planning',
    bodyTemplate: `Hi [First],\n\nOne reason I am reaching out is that EGS has handled graduation work at UAE-wide scale. In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah and Fujairah for 4,500 graduates and 13,500 guests.\n\nBest Regards,\nMasuood-ul-Rasheed\nExhibit Graphic Sign`,
    useAiPersonalization: true,
    aiPrompt: 'Personalize the intro hook.',
  },
];

export function emptySequenceStep(order) {
  return {
    stepOrder: order,
    dayDelay: order === 1 ? 0 : 3,
    subjectTemplate: `{{company}} — stand execution support (Step ${order})`,
    bodyTemplate: `Hi {{name}},\n\nWe support regional companies with custom exhibition stands in Dubai & Abu Dhabi.\n\nWould you be open for a short call?\n\nBest,\nEGS Team`,
    useAiPersonalization: true,
    aiPrompt: '',
  };
}

export function isGraduationCampaign(projectName = '', milestone = '') {
  return (
    String(projectName).toLowerCase().includes('graduation') ||
    String(milestone).toLowerCase().includes('graduation')
  );
}

export const AUDIENCE_MODES = {
  CAMPAIGN: 'campaign',
  COMPANIES: 'companies',
  CONTACTS: 'contacts',
};
