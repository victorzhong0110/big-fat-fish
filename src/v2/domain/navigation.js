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
 * @calls domain/navigation.js#findNavigationPath
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} obstacleId
 * @returns {boolean}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function canCloseMapPassage(context, obstacleId) {
  throw new Error('TODO V2: domain/navigation.js#canCloseMapPassage');
}

/**
 * 选择GPT后撤/保护位置，无遮挡合法点才移动。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/navigation.js#findNavigationPath
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} entityId
 * @param {number} maxDistance
 * @returns {import('../contracts.d.ts').Vec2 | null}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function chooseRetreatPoint(context, entityId, maxDistance) {
  throw new Error('TODO V2: domain/navigation.js#chooseRetreatPoint');
}
