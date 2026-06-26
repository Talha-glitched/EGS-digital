export { DEFAULT_PIPELINE_STAGES } from '../models/PipelineConfig.js';

export const CLOSED_WON_STAGE = 'Closed Won';
export const CLOSED_LOST_STAGE = 'Closed Lost';

export function isClosedStage(stage) {
  return stage === CLOSED_WON_STAGE || stage === CLOSED_LOST_STAGE;
}

export function stageNames(stages = []) {
  return stages.map((stage) => stage.name);
}

export function probabilityForStage(stages, stageName) {
  const match = stages.find((stage) => stage.name === stageName);
  return match?.probability ?? 10;
}
