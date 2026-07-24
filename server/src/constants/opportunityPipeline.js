export { DEFAULT_PIPELINE_STAGES } from '../models/PipelineConfig.js';

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
