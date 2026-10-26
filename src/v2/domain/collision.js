// @ts-check
/**
 * 实体碰撞与Grok部分穿障的唯一规则。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './geometry.js';

/**
 * 读取同一碰撞矩阵，只有指定Grok/虚影穿低矮障碍，高墙/锁门优先阻挡。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} entity
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} obstacle
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {boolean}
 */
export function canTraverseObstacle(entity, obstacle, catalog) {
  if (obstacle.kind !== 'obstacle' || obstacle.dead || obstacle.runtime.solid === false) return true;
  // Closed gates, safety boundaries and connectivity-critical obstacles always take precedence.
  if (obstacle.runtime.highWall === true || obstacle.runtime.boundary === true || obstacle.runtime.locked === true || obstacle.runtime.connectivityCritical === true) return false;
  const bot = entity.definitionId === 'enemy_grok_bot' || entity.runtime.distilledGrok === true;
  if (bot && (entity.kind !== 'projectile' || entity.runtime.distilledGrok === true) && obstacle.runtime.grok_passable === true && obstacle.runtime.low === true) return true;
  return false;
}

/**
 * 生成稳定排序的连续碰撞结果，不直接改血或销毁实体。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/collision.js#canTraverseObstacle
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/geometry.js#normalizeVector
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').CollisionResult}
 */
export function detectCollisions(context) {
  const state = context.state;
  const entities = Object.values(state.world.entities).filter(entity => !entity.dead && !entity.dying);
  const hits = /** @type {import('../contracts.d.ts').Collision[]} */ ([]);
  for (const projectile of entities.filter(entity => entity.kind === 'projectile' && (entity.expiresAt === null || entity.expiresAt >= state.tick))) {
    for (const target of entities) {
      if(target.runtime.untargetable===true)continue;
      if (target.id === projectile.id || target.id === projectile.sourceId || target.kind === 'projectile' || target.kind === 'pickup' || target.kind === 'companion') continue;
      if (target.kind === 'obstacle') {
        if (canTraverseObstacle(projectile, target, context.catalog)) continue;
      } else if (target.team === projectile.team || target.team === 'neutral' || target.hp <= 0) continue;
      // Sweep in target-relative coordinates: moving targets can cross a fast projectile.
      const relativeFrom = { x: projectile.previousPosition.x - target.previousPosition.x, y: projectile.previousPosition.y - target.previousPosition.y };
      const relativeTo = { x: projectile.position.x - target.position.x, y: projectile.position.y - target.position.y };
      const time = dependency1.intersectSweptCircles(relativeFrom, relativeTo, projectile.radius, { x: 0, y: 0 }, target.radius);
      if (time === null) continue;
      const projectileCenter = { x: projectile.previousPosition.x + (projectile.position.x - projectile.previousPosition.x) * time, y: projectile.previousPosition.y + (projectile.position.y - projectile.previousPosition.y) * time };
      const targetCenter = { x: target.previousPosition.x + (target.position.x - target.previousPosition.x) * time, y: target.previousPosition.y + (target.position.y - target.previousPosition.y) * time };
      const outward = dependency1.normalizeVector({ x: projectileCenter.x - targetCenter.x, y: projectileCenter.y - targetCenter.y });
      hits.push({ id: `collision:${JSON.stringify([projectile.id, target.id, state.tick])}`, sourceId: projectile.id, targetId: target.id, timeOfImpact: time,
        contact: { x: targetCenter.x + outward.x * target.radius, y: targetCenter.y + outward.y * target.radius },
        incomingDirection: dependency1.normalizeVector({ x: projectile.position.x - projectile.previousPosition.x, y: projectile.position.y - projectile.previousPosition.y }),
      });
    }
  }
  return { hits: hits.sort((a, b) => (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0) || a.timeOfImpact - b.timeOfImpact || (a.targetId < b.targetId ? -1 : a.targetId > b.targetId ? 1 : 0)), diagnostics: [] };
}

/**
 * 检查视野外、最小距离、可通行与局部/全局数量上限。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/collision.js#canTraverseObstacle
 * @calls domain/geometry.js#computeCameraBounds
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').SpawnRequest} request
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').Vec2>}
 */
export function validateSpawnLocation(context, request) {
  const state=context.state,player=state.world.entities[state.player.entityId],viewport=state.input.viewport,view=viewport?dependency1.computeCameraBounds(player.position,state.world.map,viewport):null,definition=context.catalog.definitions[request.enemyId];
  const fail=(/** @type {string} */ message)=>({ok:/** @type {const} */ (false),code:'SPAWN_DEFERRED',message});
  if(!definition||definition.kind!=='enemy'||!view)return fail('Missing enemy definition or explicit camera bounds');
  const radius=Number(definition.parameters.radius),point=request.position;
  if(![point.x,point.y,radius].every(Number.isFinite)||point.x<radius||point.y<radius||point.x>state.world.map.width-radius||point.y>state.world.map.height-radius)return fail('Spawn lies outside legal map bounds');
  if(dependency1.distanceSquared(point,player.position)<420**2)return fail('Spawn is too close to the player');
  if(point.x+radius>=view.x-128&&point.x-radius<=view.x+view.width+128&&point.y+radius>=view.y-128&&point.y-radius<=view.y+view.height+128)return fail('Spawn would be visible');
  const enemies=Object.values(state.world.entities).filter(entity=>entity.kind==='enemy'&&!entity.dead&&entity.runtime.noAi!==true);
  if(enemies.length>=(state.start.difficulty.mode==='expedition'?100:80)||request.enemyId==='enemy_grok_bot'&&enemies.filter(entity=>entity.definitionId===request.enemyId).length>=24)return fail('Alive capacity is full');
  const temporary={...player,definitionId:request.enemyId,kind:/** @type {const} */ ('enemy'),runtime:{}};
  if(state.world.map.obstacleIds.some(id=>{const obstacle=state.world.entities[id];return obstacle&&!canTraverseObstacle(temporary,obstacle,context.catalog)&&dependency1.distanceSquared(point,obstacle.position)<(radius+obstacle.radius)**2;}))return fail('Spawn intersects blocking terrain');
  return {ok:true,value:{...point}};
}
