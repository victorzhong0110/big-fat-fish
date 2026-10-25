// @ts-check
/** Canonical entity constructor; callers provide stable identity and source snapshots. */
/**
 * @calls 无内部公开函数。
 * @param {string} id
 * @param {string} definitionId
 * @param {import('../contracts.d.ts').EntityState['kind']} kind
 * @param {import('../contracts.d.ts').EntityState['team']} team
 * @param {import('../contracts.d.ts').Vec2} position
 * @param {Partial<import('../contracts.d.ts').EntityState>} overrides
 * @returns {import('../contracts.d.ts').EntityState}
 */
export function createEntityState(id, definitionId, kind, team, position, overrides = {}) {
  return { id, definitionId, kind, team, faction: null, position: { ...position }, previousPosition: { ...position }, velocity: { x: 0, y: 0 }, facingRadians: 0, radius: 16, hp: 1, maxHp: 1, armor: 0, shieldIds: [], statusIds: [], modelProfileId: null, shell: null, collisionProfileId: 'body', sourceId: id, creditOwner: team === 'player' ? 'player' : team === 'enemy' ? 'enemy' : 'none', attackId: null, rewardPolicy: 'none', distillEligible: false, dying: false, dead: false, expiresAt: null, timers: {}, runtime: {}, ...structuredClone(overrides) };
}
