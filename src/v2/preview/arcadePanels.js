// @ts-check
import { deriveWeaponStats } from '../domain/stats.js';
import { planNativeProjectiles } from '../domain/projectiles.js';

/** Display-only arcade prizes and paired firing lanes. Gameplay owns the candidates and equipped slots. */
const prizes=['parallel','local_deploy','quant_int4','rollback_emergency','batch','compress','cache','retry','temperature','collect','cooldown','offload','keepalive','redirect','backoff','distill','5h','failover','sandbox','hallucination','chain','context','hotplug','guard','prefill','toolchain','mirror','recursion','moe','speculate','window','agent','breaker'];

/** Create a toy, rarity-specific pedestal and aligned description from one live candidate.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Definition} definition
 * @param {number} rank
 * @returns {HTMLButtonElement}
 */
export function createPrizeButton(definition,rank){
  const button=document.createElement('button');button.type='button';button.className='prize-button';
  const rarity=String(definition.parameters.rarity??'common');
  button.dataset.rarity=rarity;button.dataset.pluginId=definition.id;
  const display=document.createElement('span');display.className='prize-display';
  const toy=document.createElement('i'),stand=document.createElement('i'),badge=document.createElement('b');
  toy.className='prize-toy';toy.ariaHidden='true';stand.className='prize-stand';stand.ariaHidden='true';badge.className='prize-grade';
  const index=prizes.indexOf(definition.id.replace(/^plugin_/,''));if(index>=0)toy.style.backgroundPosition=`${index%6*20}% ${Math.floor(index/6)*20}%`;
  badge.textContent=rarity==='legendary'?'棱彩':rarity==='advanced'?'黄金':'白银';
  display.append(stand,toy,badge);
  const name=document.createElement('strong');name.textContent=`${definition.displayName} · ${rank}级`;
  const desc=document.createElement('small');desc.textContent=String(/** @type {readonly string[]} */(definition.parameters.rankDescriptions??[])[rank-1]??'');
  button.append(display,name,desc);return button;
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
