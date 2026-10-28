// @ts-check
/**
 * 普通Claude四阶段外壳与唯一破壳事件。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './geometry.js';

/**
 * 按模型朝向/弱点判定壳伤，非弱点0伤，溢出不伤本体。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：范围中心重合时用入射方向反向；API背部120°，Opus侧后270°。
 * @calls domain/geometry.js#isContactWithinArc
 * @calls domain/shells.js#planShellBreak
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {import('../contracts.d.ts').ShellResolution}
 */
export function resolveShellContact(context, request) {
  const entity = context.state.world.entities[request.targetId];
  if (!entity) throw new Error('Unknown shell target');
  const shell = entity.shell;
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  if (!shell || shell.broken || shell.hp <= 0) return { blocked: false, damage: 0, broke: false, plan: empty };
  let contact = request.contact;
  if (contact.x === entity.position.x && contact.y === entity.position.y) contact = { x: entity.position.x - request.incomingDirection.x, y: entity.position.y - request.incomingDirection.y };
  const vulnerable = shell.weakArcDegrees === 360 || dependency1.isContactWithinArc(entity.position, entity.facingRadians, contact, shell.weakArcDegrees);
  if (!vulnerable) return { blocked: true, damage: 0, broke: false, plan: empty };
  const damage = Math.min(shell.hp, request.baseDamage);
  const broke = shell.hp - damage <= 0;
  const breakPlan = broke ? planShellBreak(context, entity.id) : empty;
  return { blocked: true, damage, broke, plan: { ...breakPlan, changes: [
    { target: 'entity', id: entity.id, operation: 'setShell', payload: { ...shell, hp: shell.hp - damage } }, ...breakPlan.changes,
  ] } };
}

/**
 * 只一次破壳：Sonnet/Opus晕后加速，API直接加速不眩晕。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} entityId
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planShellBreak(context, entityId) {
  const entity = context.state.world.entities[entityId];
  if (!entity?.shell || entity.shell.broken) return { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  const apiModel = entity.modelProfileId === 'claude_fable' || entity.modelProfileId === 'claude_mythos';
  return {
    changes: [{target:'entity',id:entityId,operation:'setEntityRadius',payload:{radius:apiModel?30:22}},{ target: 'entity', id: entityId, operation: 'setShell', payload: { ...entity.shell, hp: 0, broken: true, stunRemaining: apiModel ? 0 : 0.8, enraged: apiModel } }],
    effects: [], persistence: [], diagnostics: [],
    events: [{ id: `shellBroken:${entityId}`, runId: context.state.runId, tick: context.state.tick, seq: 0, type: 'ShellBroken', sourceId: entityId, targetId: entityId, payload: { apiModel } }],
  };
}
