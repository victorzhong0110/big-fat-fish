// @ts-check
import { deriveWeaponStats } from '../domain/stats.js';
import { planNativeProjectiles } from '../domain/projectiles.js';

// Cell numbers are coordinates in the published 6 × 6 sheet.
const prizeCells = new Map([
  ['plugin_parallel', 0], ['plugin_local_deploy', 1], ['plugin_quant_int4', 2],
  ['plugin_rollback_emergency', 3], ['plugin_batch', 4], ['plugin_compress', 5],
  ['plugin_cache', 6], ['plugin_retry', 7], ['plugin_temperature', 8],
  ['plugin_collect', 9], ['plugin_cooldown', 10], ['plugin_offload', 11],
  ['plugin_keepalive', 12], ['plugin_redirect', 13], ['plugin_backoff', 14],
  ['plugin_distill', 15], ['plugin_5h', 16], ['plugin_failover', 17],
  ['plugin_sandbox', 18], ['plugin_hallucination', 19], ['plugin_chain', 20],
  ['plugin_context', 21], ['plugin_hotplug', 22], ['plugin_guard', 23],
  ['plugin_prefill', 24], ['plugin_toolchain', 25], ['plugin_mirror', 26],
  ['plugin_recursion', 27], ['plugin_moe', 28], ['plugin_speculate', 29],
  ['plugin_window', 30], ['plugin_agent', 31], ['plugin_breaker', 32],
]);
const gradeLabels = new Map([['common', '白银'], ['advanced', '黄金'], ['legendary', '棱彩']]);

/** Resolve a prize toy by plugin id. Catalog order and rarity never choose the cell.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Definition} definition
 * @param {number} rank
 * @returns {{cell:number|'generic';rarity:string;badge:string;name:string;effect:string}}
 */
export function resolvePrizePresentation(definition, rank) {
  const rarity = String(definition.parameters.rarity ?? 'common');
  const effects = /** @type {readonly string[]|undefined} */ (definition.parameters.rankDescriptions);
  return {
    cell: prizeCells.get(definition.id) ?? 'generic',
    rarity, badge: gradeLabels.get(rarity) ?? '白银',
    name: `${definition.displayName} · ${rank}级`, effect: String(effects?.[rank - 1] ?? '')
  };
}

/** @param {number|'generic'} cell */
function prizeToy(cell) {
  const toy = document.createElement('i');
  toy.className = 'prize-toy';
  toy.ariaHidden = 'true';
  if (cell === 'generic') toy.classList.add('generic');
  else toy.style.backgroundPosition = `${cell % 6 * 20}% ${Math.floor(cell / 6) * 20}%`;
  return toy;
}

/** Build a candidate from its live rank and content definition.
 * @calls preview/arcadePanels.js#resolvePrizePresentation
 * @param {import('../contracts.d.ts').Definition} definition
 * @param {number} rank
 * @returns {HTMLButtonElement}
 */
export function createPrizeButton(definition, rank) {
  const prize = resolvePrizePresentation(definition, rank);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prize-button';
  button.dataset.rarity = prize.rarity;
  button.dataset.pluginId = definition.id;
  button.dataset.prizeCell = String(prize.cell);

  const display = document.createElement('span');
  display.className = 'prize-display';
  const stand = document.createElement('i');
  stand.className = 'prize-stand';
  stand.ariaHidden = 'true';
  const badge = document.createElement('b');
  badge.className = 'prize-grade';
  badge.textContent = prize.badge;
  display.append(stand, prizeToy(prize.cell), badge);

  const name = document.createElement('strong');
  name.textContent = prize.name;
  const effect = document.createElement('small');
  effect.textContent = prize.effect;
  button.append(display, name, effect);
  return button;
}

/** Show the same toy when choosing an occupied slot to give up.
 * @calls preview/arcadePanels.js#resolvePrizePresentation
 * @param {import('../contracts.d.ts').Definition} definition
 * @param {number} rank
 * @returns {HTMLButtonElement}
 */
export function createReplacementButton(definition, rank) {
  const prize = resolvePrizePresentation(definition, rank);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prize-slot';
  button.dataset.replacePlugin = definition.id;
  button.append(prizeToy(prize.cell), document.createTextNode(prize.name));
  return button;
}

/** Draw stationary targets and preview a planned native volley without applying its changes.
 * @calls domain/projectiles.js#planNativeProjectiles
 * @calls domain/stats.js#deriveWeaponStats
 * @param {string} label
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').WeaponState} weapon
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {HTMLElement}
 */
export function createShotLane(label,state,weapon,catalog){
  const lane=document.createElement('section');
  lane.className='shot-lane';
  const name=document.createElement('strong'),tag=document.createElement('small');
  tag.textContent=label;name.textContent=catalog.definitions[weapon.definitionId].displayName;
  const track=document.createElement('div');
  track.className='shot-track';track.ariaHidden='true';
  // Both lanes use the same 480-unit field and muzzle, including when comparing modded equipment.
  const fieldWidth=480,muzzle=14,targets=[230,344];
  for(const distance of targets){
    const target=document.createElement('i');target.className='shot-target';
    target.style.left=(muzzle+distance/fieldWidth*100)+'%';track.append(target);
  }
  const stats=deriveWeaponStats(state,weapon,catalog);
  const volley=planNativeProjectiles({state,weapon,catalog,aim:{x:1,y:0},random:state.random.combat,event:null,entityId:null});
  for(const change of volley.changes){
    if(change.operation!=='putEntity')continue;
    const projectile=/** @type {import('../contracts.d.ts').EntityState} */(/** @type {unknown} */(change.payload));
    const template=String(projectile.runtime.weaponTemplate);
    lane.dataset.template=template;
    const speed=Math.max(1,Math.hypot(projectile.velocity.x,projectile.velocity.y));
    const dx=projectile.velocity.x/speed,dy=projectile.velocity.y/speed;
    const returning=template==='mcp_return';
    const hits=targets.filter(x=>dx>0&&Math.abs(x*dy/dx)<=20+projectile.radius);
    const stop=returning?undefined:hits[stats.maxHits-1];
    const distance=returning?Number(projectile.runtime.returnDistance):Math.min(stats.range,stop===undefined?fieldWidth*.86:stop/dx);
    const flight=distance/speed;
    const blast=template==='mcp_batch' && stop!==undefined ? 0.16 : 0;
    const duration=flight*(returning?2:1)+blast;
    const copies=Math.max(1,Math.min(48,Math.ceil(duration/stats.interval)));
    const period=Math.max(duration,copies*stats.interval,.001);
    const impact=flight/period*100,end=duration/period*100;
    const motion=returning?`linear(0,1 ${impact}%,0 ${end}%,0)`:`linear(0,1 ${impact}%,1)`;
    for(let i=0;i<copies;i++){
      const shot=document.createElement('i');shot.className='lane-shot';
      shot.style.setProperty('--end-x',(muzzle+dx*distance/fieldWidth*100)+'%');
      shot.style.setProperty('--end-y',(dy*distance/fieldWidth*100)+'cqw');
      shot.style.setProperty('--flight',motion);
      shot.style.setProperty('--visible',`linear(1,1 ${end}%,0 ${end}%,0)`);
      shot.style.setProperty('--burst',blast?`linear(0,0 ${impact}%,1 ${end}%,1)`:'linear(0,0)');
      shot.style.animationDuration=period+'s';
      shot.style.animationDelay=(-i*stats.interval)+'s';
      track.append(shot);
    }
  }
  lane.append(tag,name,track);return lane;
}
