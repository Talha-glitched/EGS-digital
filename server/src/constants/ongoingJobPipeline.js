export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Inquiry', probability: 10 },
  { name: 'Design', probability: 25 },
  { name: 'Quotation Sent', probability: 40 },
  { name: 'Waiting Adv/ PO', probability: 50 },
  { name: 'In Production', probability: 70 },
  { name: 'Installation', probability: 80 },
  { name: 'Ready', probability: 85 },
  { name: 'Waiting Balance Payment', probability: 90 },
  { name: 'Job Done', probability: 100 },
  { name: 'Job Lost', probability: 0 },
];

export const CLOSED_WON_STAGE = 'Job Done';
export const CLOSED_LOST_STAGE = 'Job Lost';

export function isClosedStage(stage) {
  return stage === 'Job Done' || stage === 'Job Lost' || stage === 'Closed Won' || stage === 'Closed Lost';
}

export function stageNames(stages = []) {
  return stages.map((stage) => stage.name);
}

export function probabilityForStage(stages, stageName) {
  const match = stages.find((stage) => stage.name === stageName);
  return match?.probability ?? 10;
}
