// @ts-check
import { distanceSquared } from '../geometry.js';
import { createEmptyPlan, createStateChange } from '../plans.js';

export const EXTRACTION_ID = 'extraction:exit';
export const EXTRACTION_TICKS = 180;

/** Duration in world ticks for this departure snapshot.
 * @calls 无内部公开函数。
 * @param {readonly string[]} nodes
 * @returns {number}
 */
export function extractionDuration(nodes) {
  return nodes.includes('tree_explore_extract') ? 120 : EXTRACTION_TICKS;
}

/** A live player must hold position inside the extraction zone without firing.
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {boolean}
 */
export function canExtract({ state }) {
  if (state.start.difficulty.mode !== 'exploration' || state.flow.phase !== 'exploring') return false;
  const player = state.world.entities[state.player.entityId], exit = state.world.entities[EXTRACTION_ID];
  return !!exit && !player.dead && player.hp > 0 && !state.input.firing && !state.input.move.x
    && !state.input.move.y && distanceSquared(player.position, exit.position) <= exit.radius ** 2;
}

/** Start, cancel or advance a withdrawal on the world clock. Combat resolves before advancement.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/extraction.js#canExtract
 * @calls domain/world/extraction.js#extractionDuration
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {'StartWithdrawal'|'CancelWithdrawal'|'advance'} action
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planExtraction(context, action) {
  const { state } = context;
  if (state.start.difficulty.mode !== 'exploration') return createEmptyPlan();
  const hold = state.extractionHold;
  const player = state.world.entities[state.player.entityId];
  if (action === 'StartWithdrawal') {
    if (hold || !canExtract(context)) return createEmptyPlan();
    return { ...createEmptyPlan(), changes: [createStateChange('runtime', EXTRACTION_ID, 'setExtractionHold', {
      hold: { startedAt: state.tick, position: player.position, hpDamageTotal: Number(player.runtime.hpDamageTotal ?? 0) },
    })] };
  }
  if (!hold) return createEmptyPlan();
  const interrupted = action === 'CancelWithdrawal' || !canExtract(context)
    || distanceSquared(player.position, hold.position) > 0.01
    || Number(player.runtime.hpDamageTotal ?? 0) !== hold.hpDamageTotal;
  if (!interrupted && state.tick - hold.startedAt < extractionDuration(state.start.treeNodeIds)) return createEmptyPlan();
  const changes = [createStateChange('runtime', EXTRACTION_ID, 'setExtractionHold', { hold: null })];
  if (!interrupted) {
    changes.push(createStateChange('flow', 'phase', 'setFlowPhase', { phase: 'withdrawal', resumePhase: null }));
  }
  return { ...createEmptyPlan(), changes };
}
