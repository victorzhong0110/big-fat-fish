// @ts-check
import {createInitialGameState} from '../domain/initial.js';
import {resolveDifficultySnapshot} from '../domain/difficulty.js';
import {createEntityState} from '../domain/entities.js';
import {advanceWorldTick} from './tick.js';


/** Start an isolated target lane. Only expose render data and discard persistence intents.
 * @calls domain/difficulty.js#resolveDifficultySnapshot
 * @calls domain/entities.js#createEntityState
 * @calls domain/initial.js#createInitialGameState
 * @calls engine/tick.js#advanceWorldTick
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {string[]} equipped
 * @returns {{weapon:()=>string,switchWeapon:()=>void,step:(firing:boolean)=>{damage:number,projectiles:{x:number,y:number,radius:number,template:string}[]}}}
 */
export function createShootingRange(catalog,profile,equipped){
  const weaponIds=[...new Set([...equipped,'mcp_bubble'])];
  const request={mode:/** @type {const} */('short'),difficulty:1,seed:1,weaponIds,skillId:'skill_disconnect',companionId:null};
  const difficulty=resolveDifficultySnapshot(request,catalog);if(!difficulty.ok)throw Error(difficulty.message);
  let state=createInitialGameState({runtimeProfile:'adventure-slice',runId:'nest-range',difficulty:difficulty.value,treeNodeIds:profile.purchasedTree,dsh:[],...(catalog.modLock?.length?{moddedAdventure:true,modLock:catalog.modLock}:{}),loadout:{weapons:weaponIds.map(id=>({definitionId:id,instanceId:id,originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null})),activeWeaponIndex:0,skillId:request.skillId,companionId:null,companionCooldown:0,skillCooldown:0,dashCooldown:0}},1,catalog);
  state.spawnDirectorNextAt=Number.MAX_SAFE_INTEGER;
  const dummy=createEntityState('dummy','enemy_grok_bot','enemy','enemy',{x:450,y:270},{hp:1000000,maxHp:1000000,radius:26,runtime:{noAi:true}});
  state.world.entities={...state.world.entities,dummy};
  return {
    weapon:()=>weaponIds[state.player.loadout.activeWeaponIndex],
    switchWeapon(){state.player.loadout.activeWeaponIndex=(state.player.loadout.activeWeaponIndex+1)%weaponIds.length;},
    step(firing){
      state.input.firing=firing;
      const next=advanceWorldTick(state,[],catalog).next;
      const damage=state.world.entities.dummy.hp-next.world.entities.dummy.hp;
      next.world.entities.dummy.hp=dummy.maxHp;
      state=next;
      const projectiles=Object.values(state.world.entities).filter(e=>e.kind==='projectile').map(e=>({
        x:e.position.x,y:e.position.y,radius:e.radius,template:String(e.runtime.weaponTemplate)
      }));
      return {damage,projectiles};
    }
  };
}
