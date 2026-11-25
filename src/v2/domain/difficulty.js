// @ts-check
/**
 * 难度累计集合、档位福利和模型阶段解析。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
export const ENDLESS_STAGE_TICKS = 7200;
import * as dependency2 from './random.js';

/**
 * 一次性解析0–15/API、静态倍率、完整累计机制和独立Pro福利。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：API使用M(15)；常驻机制不能轮换丢失；Pro自带5h仅1–5。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StartRequest} request
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').DifficultySnapshot>}
 */
export function resolveDifficultySnapshot(request, catalog) {
  const level = request.difficulty;
  if (level !== 'api' && (!Number.isInteger(level) || level < 0 || level > 15) || (level === 'api') !== (request.mode === 'api') || (level === 0) !== (request.mode === 'tutorial')) return { ok: false, code: 'INVALID_DIFFICULTY', message: 'Difficulty must match the selected mode' };
  const d = level === 'api' ? 15 : level;
  const api = level === 'api';
  const stage = api ? 3 : d <= 5 ? 0 : d <= 10 ? 1 : 2;
  const mechanics = catalog.mechanics.filter(mechanic => mechanic.unlockAt >= 1 && mechanic.unlockAt <= d);
  return { ok: true, value: { level, petTiers: 'benchmark', mode: request.mode, mechanicIds: mechanics.map(mechanic => mechanic.id),
    difficultyPerkIds: d >= 1 && d <= 5 && !api ? ['plugin_5h'] : [],
    modelProfileIds: { claude: ['claude_haiku', 'claude_sonnet', 'claude_opus', 'claude_fable'][stage], gpt: ['gpt_luna', 'gpt_sol', 'gpt_astra', 'gpt_terra'][stage], grok: 'grok_bot' },
    hpMultiplier: d === 0 ? 0.6 : 1 + 0.06 * (d - 1), damageMultiplier: d === 0 ? 0.5 : 1 + 0.035 * (d - 1), spawnBudgetMultiplier: d === 0 ? 0.5 : 1 + 0.035 * (d - 1),
  } };
}

/**
 * 选择Haiku/Sonnet/Opus/Fable或Mythos及Luna/Sol/Astra/Terra对应阶段。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/random.js#drawRandom
 * @param {import('../contracts.d.ts').DifficultySnapshot} difficulty
 * @param {import('../contracts.d.ts').Faction} faction
 * @param {import('../contracts.d.ts').RandomState} random
 * @returns {import('../contracts.d.ts').Result<{ profileId: import('../contracts.d.ts').Id; next: import('../contracts.d.ts').RandomState }>}
 */
export function resolveModelProfileId(difficulty, faction, random) {
  const profileId = difficulty.modelProfileIds[faction];
  if (!profileId) return { ok: false, code: 'UNKNOWN_FACTION', message: 'No model profile for faction' };
  if (faction !== 'claude' || difficulty.level !== 'api') return { ok: true, value: { profileId, next: { ...random } } };
  const draw = dependency2.drawRandom(random);
  return { ok: true, value: { profileId: draw.value < 0.5 ? 'claude_fable' : 'claude_mythos', next: draw.next } };
}

/**
 * 按出生时API有效分钟计算强化，检查数值溢出；不突然给活敌加血。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Tick} elapsedTicks
 * @returns {import('../contracts.d.ts').Result<{ hp: number; damage: number; budget: number }>}
 */
export function resolveApiSpawnMultipliers(elapsedTicks) {
  if (!Number.isSafeInteger(elapsedTicks) || elapsedTicks < 0) return { ok: false, code: 'INVALID_API_TIME', message: 'API ticks must be a nonnegative safe integer' };
  const minutes = Math.floor(elapsedTicks / 3600);
  const hp = 1.84 * 1.06 ** minutes, damage = 1.49 * 1.035 ** minutes, budget = Math.min(2.5, 1.49 + 0.03 * minutes);
  if (![hp, damage, budget].every(Number.isFinite)) return { ok: false, code: 'API_STRENGTH_OVERFLOW', message: 'API strength exceeds numeric range' };
  return { ok: true, value: { hp, damage, budget } };
}

/** Keep the API curve and scale numeric Endless from its own Benchmark.
 * @calls domain/difficulty.js#resolveApiSpawnMultipliers
 * @param {import('../contracts.d.ts').DifficultySnapshot} difficulty
 * @param {import('../contracts.d.ts').Tick} elapsedTicks
 * @returns {import('../contracts.d.ts').Result<{hp:number;damage:number;budget:number}>}
 */
export function resolveSurvivalSpawnMultipliers(difficulty, elapsedTicks) {
  const strength = resolveApiSpawnMultipliers(elapsedTicks);
  if (!strength.ok || difficulty.mode === 'api') return strength;
  const minutes = Math.floor(elapsedTicks / 3600);
  return { ok:true, value:{
    hp: strength.value.hp / 1.84 * difficulty.hpMultiplier,
    damage: strength.value.damage / 1.49 * difficulty.damageMultiplier,
    budget: Math.min(2.5, difficulty.spawnBudgetMultiplier + 0.03 * minutes),
  } };
}
