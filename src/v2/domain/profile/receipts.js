// @ts-check
/** 对局小票与产生它的档案变更一起入账。 */
import { RESET_ACHIEVEMENT } from '../../content/achievements.js';

/** Record only what this transaction awarded. A replay reads the original payment.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} before
 * @param {import('../../contracts.d.ts').Profile} after
 * @param {string} runId
 * @param {import('../../contracts.d.ts').Settlement} [settlement]
 * @returns {import('../../contracts.d.ts').Profile}
 */
export function recordRunReceipt(before, after, runId, settlement) {
  const ledger = before.receipts ?? { legacyDiscoveryCount: before.discoveryLedger.length, runs: [] };
  const receipts = ledger.runs;
  const previous = receipts.find(row => row.runId === runId);
  if (previous?.payment) return after;
  const earned = new Set();
  for (const key of /** @type {const} */ (['discovered', 'unlockedWeapons', 'unlockedSkills', 'unlockedCompanions', 'unlockedDsh'])) {
    const owned = new Set(before[key]);
    for (const id of after[key]) if (!owned.has(id)) earned.add(id);
  }
  if (after.highestDifficulty > before.highestDifficulty && after.highestDifficulty < 15) {
    earned.add(`benchmark:${after.highestDifficulty + 1}`);
  }
  if (after.apiUnlocked && !before.apiUnlocked) earned.add('api');
  const priorUnlocks = new Set(before.unlockLedger);
  for (const entry of after.unlockLedger) {
    if (!priorUnlocks.has(entry) && (entry === RESET_ACHIEVEMENT.ledgerId || entry.startsWith('endlessClear:'))) earned.add(entry);
  }
  if (!earned.size && !settlement) return before.receipts ? after : { ...after, receipts: ledger };

  const receipt = /** @type {import('../../contracts.d.ts').RunReceipt} */ ({
    runId, unlocks: [...new Set([...(previous?.unlocks ?? []), ...earned])]
  });
  if (settlement) {
    receipt.payment = {
      outcome: settlement.outcome, gpuFragments: settlement.gpuFragments,
      parts: settlement.parts, gpuCards: after.gpuCards - before.gpuCards
    };
  }
  const runs = previous ? receipts.map(row => row === previous ? receipt : row) : [...receipts, receipt];
  return { ...after, receipts: { ...ledger, runs } };
}
