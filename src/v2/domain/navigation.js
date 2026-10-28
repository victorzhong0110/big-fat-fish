// @ts-check
/**
 * 可达性/寻路与碰撞共享规则。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './collision.js';
import * as dependency2 from './geometry.js';

/**
 * 按实体碰撞profile寻路，Bot不能路径与物理不一致。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/collision.js#canTraverseObstacle
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#intersectSweptCircles
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').NavigationQuery} query
 * @returns {import('../contracts.d.ts').NavigationResult}
 */
export function findNavigationPath(context, query) {
  const entity = context.state.world.entities[query.entityId];
  if (!entity) return { reachable: false, path: [] };
  const obstacles = Object.values(context.state.world.entities).filter(obstacle => obstacle.kind === 'obstacle' && !dependency1.canTraverseObstacle(entity, obstacle, context.catalog)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const visible = (/** @type {import('../contracts.d.ts').Vec2} */ a, /** @type {import('../contracts.d.ts').Vec2} */ b) => !obstacles.some(obstacle => {
    const t = dependency2.intersectSweptCircles(a, b, entity.radius + 0.1, obstacle.position, obstacle.radius);
    return t !== null && t < 1 - 1e-8;
  });
  if (visible(query.origin, query.destination)) return { reachable: true, path: [{ ...query.destination }] };
  const points = [{ ...query.origin }, { ...query.destination }];
  for (const obstacle of obstacles) for (let side = 0; side < 12; side++) {
    const angle = side * Math.PI / 6, distance = (obstacle.radius + entity.radius + 0.2) / Math.cos(Math.PI / 12) + 1;
    const point = { x: obstacle.position.x + Math.cos(angle) * distance, y: obstacle.position.y + Math.sin(angle) * distance };
    const map = context.state.world.map;
    if (point.x < entity.radius || point.y < entity.radius || point.x > map.width - entity.radius || point.y > map.height - entity.radius || obstacles.some(other => dependency2.distanceSquared(point, other.position) <= (other.radius + entity.radius) ** 2)) continue;
    points.push(point);
  }
  const distances = points.map(() => Number.MAX_VALUE), parents = points.map(() => -1), visited = new Set(); distances[0] = 0;
  for (let pass = 0; pass < points.length; pass++) {
    let current = -1;
    for (let index = 0; index < points.length; index++) if (!visited.has(index) && (current < 0 || distances[index] < distances[current])) current = index;
    if (current < 0 || distances[current] === Number.MAX_VALUE) break;
    if (current === 1) {
      const route = []; let index = current;
      while (index !== 0 && index >= 0) { route.unshift(points[index]); index = parents[index]; }
      return { reachable: true, path: route };
    }
    visited.add(current);
    for (let next = 0; next < points.length; next++) if (!visited.has(next) && visible(points[current], points[next])) {
      const distance = distances[current] + Math.sqrt(dependency2.distanceSquared(points[current], points[next]));
      if (distance < distances[next]) { distances[next] = distance; parents[next] = current; }
    }
  }
  return { reachable: false, path: [] };
}

/**
 * 关闭捷径前验证主线、检查点和出口仍可达。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/navigation.js#findNavigationPath
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} obstacleId
 * @returns {boolean}
 */
export function canCloseMapPassage(context, obstacleId) {
  const state=context.state,obstacle=state.world.entities[obstacleId],player=state.world.entities[state.player.entityId];if(!obstacle||obstacle.kind!=='obstacle'||!player||dependency2.distanceSquared(player.position,obstacle.position)<=(player.radius+obstacle.radius)**2)return false;
  const prospective=/** @type {import('../contracts.d.ts').GameState} */(structuredClone(state));prospective.world.entities[obstacleId].runtime={...obstacle.runtime,solid:true};const next={...context,state:prospective};
  const ids=[...state.world.map.checkpointIds,...state.world.map.exitIds,...state.world.objectives.filter(o=>o.active&&!o.completed).map(o=>o.id)];
  return ids.every(id=>{const target=state.world.entities[id];return !!target&&findNavigationPath(next,{entityId:player.id,origin:player.position,destination:target.position,collisionProfileId:player.collisionProfileId}).reachable;});
}

/**
 * 选择GPT后撤/保护位置，无遮挡合法点才移动。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/collision.js#canTraverseObstacle
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/navigation.js#findNavigationPath
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} entityId
 * @param {number} maxDistance
 * @returns {import('../contracts.d.ts').Vec2 | null}
 */
export function chooseRetreatPoint(context, entityId, maxDistance) {
  const state=context.state,entity=state.world.entities[entityId],player=state.world.entities[state.player.entityId];if(!entity||!player||!Number.isFinite(maxDistance)||maxDistance<=0)return null;
  const angle=Math.atan2(entity.position.y-player.position.y,entity.position.x-player.position.x),map=state.world.map,candidates=[];
  for(const fraction of [1,.5])for(let n=0;n<16;n++){const a=angle+(n%2?1:-1)*Math.ceil(n/2)*Math.PI/8,point={x:entity.position.x+Math.cos(a)*maxDistance*fraction,y:entity.position.y+Math.sin(a)*maxDistance*fraction};
   if(point.x<entity.radius||point.y<entity.radius||point.x>map.width-entity.radius||point.y>map.height-entity.radius||dependency2.distanceSquared(point,player.position)<=dependency2.distanceSquared(entity.position,player.position))continue;
   if(Object.values(state.world.entities).some(o=>o.kind==='obstacle'&&!dependency1.canTraverseObstacle(entity,o,context.catalog)&&dependency2.distanceSquared(point,o.position)<=(o.radius+entity.radius)**2))continue;
   const path=findNavigationPath(context,{entityId,origin:entity.position,destination:point,collisionProfileId:entity.collisionProfileId});let previous=entity.position,length=0;for(const step of path.path){length+=Math.sqrt(dependency2.distanceSquared(previous,step));previous=step;}if(path.reachable&&length<=maxDistance+1e-6)candidates.push(point);
  }
  return candidates.sort((a,b)=>dependency2.distanceSquared(b,player.position)-dependency2.distanceSquared(a,player.position)||a.x-b.x||a.y-b.y)[0]??null;
}
