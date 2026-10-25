import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readV2SourceModel } from './v2-source-model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sourceRoot=path.join(root,'src/v2');
const filename=path.join(sourceRoot,'architecture-manifest.json'),manifest=JSON.parse(await fs.readFile(filename,'utf8'));
const sourceModel=await readV2SourceModel(sourceRoot),previous=new Map(manifest.modules.map(module=>[module.path,module]));
const descriptions={createDefaultProfile:'构造零余额、默认泡泡/断开连接/饭团及饭碗/航海桌的新档；不赠永久资源。',createStateChange:'将有类型的数据转换为独立、有限的计划载荷，统一StateChange创建。',createEntityState:'按稳定ID和来源建立完整实体默认值；调用者提供出生参数快照。',createInitialGameState:'构造未发布的初始对局；当前仅允许显式core-preview，不开放完整冒险。',resolveBodyDestination:'实体沿圆形阻挡扫掠并滑动，遵守地图边界与Grok穿障矩阵。',planNativeProjectiles:'按MCP参数生成原生弹体，每枚弹有独立attackId，同次射击共享chainId。',planMeleeEnemy:'处理近身追赶、缓存寻路、接触；棕蟹额外拥有0.9秒预警重钳。',advancePreviewWorldTick:'执行受范围限制的预览世界步，逐阶段应用计划、排队效果、声明死亡与掉落，最后只提交一次。',advancePreviewUiCommands:'处理训练/插件/暂停命令；按advanceClock选择是否推进独立LoRA UI步，不推进世界时间。',toJson:'在参数边界验证并复制规范纯JSON数据。',getPreviewCamera:'按画面尺寸计算相机与比例，绘制和鼠标映射使用同一投影。',renderPreviewFrame:'只读绘制实体、米粒、弱点/攻击预警与伤害数字，不模拟战斗。',mountCombatPreview:'组装独立浏览器战斗试作、键鼠/双摇杆、固定帧、菜单和隔离检查点；返回完整清理函数。'};
const scoped=new Set(['createGameSession','restoreGameSession','stepSessionWorld','stepSessionUi','enqueueSessionCommand','validateGameCommand','planGameCommand','planFlowTransition','planPause','planResume','createMapPlan','planEnemyAi','planEventHooks','evaluateEffectRequest','drainEffectQueue','planWeaponFire','planSkillCast','planLoadoutChange','planNativeProjectiles','dispatchWeaponsHandler','dispatchSkillsHandler','dispatchEnemiesHandler','advancePreviewWorldTick','advancePreviewUiCommands','createInitialGameState','mountCombatPreview','planDeathRewards','planTokenCollection','planPlayerMovement','planEntityMotion','planPickupMotion','planCollisionEffects','planWeaponBubble','planWeaponFan','planSkillCache','planSkillDisconnect','planEnemyClaudeGuard','planEnemyGrokBot','createRenderSnapshot','renderPreviewFrame','getPreviewCamera']);
manifest.modules=[];
for(const module of sourceModel){
 const old=previous.get(module.path);const contract={path:module.path,layer:old?.layer??(module.path.startsWith('preview/')?'host':module.path.startsWith('content/')?'content':module.path.startsWith('engine/')?'engine':'domain'),purpose:old?.purpose??module.source.split('\n').find(line=>line.startsWith('/**'))?.replace(/^\/\*\*\s*/,'').replace(/\*\/$/,'')??module.path,dependencies:module.dependencies,functions:[]};
 contract.purpose=contract.purpose.trim();
 if(module.path==='content/handlers/weapons.js')contract.purpose='六把MCP的真实行为入口，共用经过模板校验的弹体管线。';
 if(module.path==='domain/projectiles.js')contract.purpose='原生/并行弹体工厂、行为快照与一次爆破计划。';
 if(module.path==='domain/equipment.js')contract.purpose='探索中MCP交互、满槽预览与实例保留交换。';
 let source=module.source;
 for(const fn of module.functions){
  const original=old?.functions.find(item=>item.name===fn.name);const item={...(original??{description:descriptions[fn.name]??fn.name,rule:'',ownership:'只读输入、返回值/计划；不得写调用者状态',phase:'query',callMode:'sequence'}),name:fn.name,args:fn.args,result:fn.result,implementation:fn.implementation};
  item.calls=fn.implementation==='implemented'?fn.actualCalls:(original?.calls??[]);
  if(scoped.has(fn.name))item.implementationScope='core-preview';
  const previewDescriptions={createMapPlan:'生成固定的连续战斗演练海域/礁石/检查点与15只普通敌人；正式区域/事件/目标地图尚未实现。',planEnemyAi:'当前只分派棕蟹与基础Bot，不执行未实现的GPT/模型/累计机制处理器。',planWeaponFire:'在预览中按当前泡泡/扇面冷却与手动瞄准开火，保持每把武器自己的冷却。',planSkillCast:'当前只施放缓存护盾/断开连接，检查冷却与技能封禁后成功才发SkillCast。',planLoadoutChange:'当前只支持Q切枪与0.3秒切换锁，地面换装明确拒绝。',planGameCommand:'预览分派移动/战斗/暂停及插件选择、重抽、跳过；校验后确认单调序号。',validateGameCommand:'校验战斗与成长命令、choiceId/候选、一次重抽上限、单调序号、时钟域与阶段。',evaluateEffectRequest:'预览处理damage/heal/shield/collect；其他效果类型明确拒绝，不假装生成或控制已完成。',planEventHooks:'预览分派蒸馏死亡/受伤钩子；其他三插件由属性/额度/拾取消费者处理；仅接受LoRA/更新重置两种试装DSH，完整机制仍拒绝。',planFlowTransition:'预览只开放战斗→暂停/终态与暂停→原战斗状态；保留暂停前面板及其原世界返回阶段。',planResume:'恢复战斗或LoRA/插件面板原阶段，保留指针和原世界返回位置，不补跑墙钟。',planDeathRewards:'当前按阵营生成大白饭并按死亡来源ID去重；正式精英群箱/材料/Boss永久解锁仍待实现。',planTokenCollection:'接触后消费米粒/材料拾取，装备类拾取明确拒绝；不直接持久化。',createGameSession:'只创建显式core-preview/0级范围的私有Session，校验内容/初始世界后才发布句柄。',restoreGameSession:'验证检查点后构建新的暂停预览Session；完整冒险范围明确拒绝。',stepSessionWorld:'消费到期世界命令，调用独立预览世界步并原子提交；正式世界tick仍未实现。',stepSessionUi:'消费预览暂停/继续与插件选择/重抽/跳过，结算后续等级；可选择独立UI步推进LoRA，命令flush不推进指针。',createRenderSnapshot:'投影实体/米粒/预警、蒸馏虚影/追击泡、生命/武器/冷却；成长面板由宿主读取Session快照，LoRA未接入。'};
  if(previewDescriptions[fn.name])item.description=previewDescriptions[fn.name];
  const sliceFunctions=new Set(['createAdventureMapPlan','planClaudeEncounter','planMapExploration','planWorldInteraction','planObjectiveAdvance','planObjectiveCompletion','planWorldReward','planSpawnSchedule','planReinforcementGroup','planEnemySpawn','validateSpawnLocation','planBossAi','planClaudeBoss','planClaudeBan']);
  const sharedSlices=new Set(['createGameSession','restoreGameSession','stepSessionWorld','stepSessionUi','createMapPlan','createInitialGameState','advancePreviewWorldTick','mountCombatPreview','planEventHooks','evaluateEffectRequest','planDeathRewards','createRenderSnapshot']);
  if(sliceFunctions.has(fn.name))item.implementationScope='adventure-slice';
  if(sharedSlices.has(fn.name))item.implementationScope='core-preview + adventure-slice';
  const currentDescriptions={
   createAdventureMapPlan:'构建Pro1连续地图：三信标、两检查点、资源箱、驻守敌人与有限追兵预算。',
   planClaudeEncounter:'任意两个信标完成后，以稳定ID创建一次Claude首领并切换boss阶段。',
   createInitialGameState:'创建Free或Pro1初态，验证树前置/DSH槽/模组锁并一次应用永久基础属性；full仍拒绝。',
   createMapPlan:'按运行范围生成Free演练或Pro1三信标地图；不假装完整区域生成已完成。',
   createGameSession:'校验内容与初始世界后发布Free/Pro1私有Session；模组仅允许Free练习。',
   restoreGameSession:'校验版本、模组锁及状态后构建暂停Session；失败保留原检查点。',
   stepSessionWorld:'消费到期世界命令，执行Free/Pro1固定世界步并原子提交。',
   advancePreviewWorldTick:'执行Free/Pro1固定世界步，推进探索/追兵/Claude/效果/掉落与成长后统一提交。',
   mountCombatPreview:'组装Free/Pro1、键鼠/双摇杆、Profile事务结算及本地模组菜单；返回完整清理函数。',
   evaluateEffectRequest:'处理damage/heal/shield/collect/control；未实现效果明确拒绝。',
   planEventHooks:'分派蒸馏、封印破坏和并行调用事件；其余首批插件由明确数据消费者处理。',
   planDeathRewards:'按死亡来源稳定去重生成经验；Claude首领提供材料与永久击败事实，普通封印无奖励。',
   createRenderSnapshot:'只读投影战斗实体、掉落、探索格、Claude预警与首领生命，供Canvas绘制。',
   computeCameraBounds:'以当前逻辑位置、地图与世界单位视野推导同一相机边界，渲染和出生检查共用。',
   planSealRelease:'封印被主武器击碎时解除对应技能封禁，不重置冷却，不发掉落。',
   planClaudeBoss:'实现Pro1重钳禁锢、技能封印与半血三条带扫击；真实伙伴封禁弹和高难连招仍待接通。',
   planBossAi:'仅分派当前Claude首领，GPT/Grok首领明确拒绝。',
   planMapExploration:'按玩家位置揭示160单位网格，只有新格子才生成修改计划。',
   planWorldInteraction:'就近交互资源箱或已解锁首领门；首次扇面发现生成持久化事实。',
   planObjectiveAdvance:'仅在探索阶段且进入120范围时推进一个信标；离开不清零，35秒完成。',
   planObjectiveCompletion:'稳定去重完成信标、生成80经验/2碎片/3零件，完成两个后开放首领门。',
   planWorldReward:'为当前信标/资源箱生成稳定ID的拾取物，永久收入由事务结算处理。',
   planSpawnSchedule:'推进有限预算分组追兵、延迟预警、错峰出生；首领战不新增追兵。',
   planReinforcementGroup:'按阶段压力和屏幕外规则预留一组Bot预算，不积累补刷债务。',
   planEnemySpawn:'仅消费到期且位置合法的出生请求；实际出生才把预留预算转为已使用。',
   validateSpawnLocation:'共享逻辑相机，要求视野外128余量、距玩家420、合法地形和数量上限。',
   parseModPackage:'校验SDK1.0/1.1清单、补丁和独立MCP配方；限制模板、命名空间、参数边界与大小。',
   resolveModLoadOrder:'检查精确依赖版本与冲突，生成稳定拓扑顺序，拒绝依赖环。',
   composeModCatalog:'从原版复制并组装声明式模组；重复字段报错，生成内容指纹和存档锁。',
   mountModManager:'提供本地JSON安装、启停、移除与持久化菜单，只影响下次Free出发。'
  };
  if(currentDescriptions[fn.name])item.description=currentDescriptions[fn.name];
  const nestDescriptions={
   isTreeSnapshotValid:'校验出发树ID去重、真实前置与DSH基础树消费门槛。',
   createTreeBaseStats:'一次构造初始生命/护甲/移速；MCP专属输出由武器派生消费，不影响全部技能。',
   resolveTreeSurvival:'实际生命伤害更新无伤时钟；低血治疗一次，致死保命一次并给2秒保护，返回结果不改状态。',
   planTreeWeaponSwitch:'切换成功时规划下一发+25%与1秒移速；分别保存5秒/8秒内置冷却。',
   executeNestAction:'读取最新Profile，拒绝活动冒险，规划购买/退款/建设/解锁/DSH并事务提交；CAS冲突最多重算三次。',
   prepareAdventureStart:'验证永久拥有与已实现能力，复制树/DSH/基础品质装备为Pro1出发快照。',
   mountNestManager:'组装27节点、设施、装备、DSH和收藏小窝UI；所有消费经应用用例，不接触GameState。',
   resolveWeaponTemplate:'解析原版MCP或拥有已锁定模组注册的独立配方，只允许已实现泡泡/扇面模板。',
   listRuntimeWeapons:'列出实际可运行的原版与社区MCP，供练习出发选择。',
   mountCombatPreview:'组装Free/Pro1、输入、正式小窝消费与配装、事务结算和本地模组；返回完整清理函数。'
  };
  if(nestDescriptions[fn.name])item.description=nestDescriptions[fn.name];
  const equipmentDescriptions={
   createWeaponProjectile:'按原生模板建立独立弹体实例；主弹/并行次级弹共用去回程、爆破与品质快照，不重乘输出。',
   planNativeProjectiles:'六把MCP按真实参数产弹；每枚独立attackId，每次原生射击仅一个WeaponFired。',
   planProjectileBurst:'在碰撞或射程到期点结算一次非暴击范围伤害，生成12tick可视涟漪；不冒充基础命中。',
   planEquipmentInteraction:'探索中F就近拾取地面MCP；空槽立即填入，满槽发可放弃的替换预览事件。',
   planWeaponPickup:'距离/阶段/槽位复核后原子交换实例，原武器留地；品质/冷却/更新有效期不重置；稳定发现事件。',
   planLoadoutChange:'处理Q切枪与探索地面实例替换；各自保留CD，实际换到当前槽才触发永久换枪效果。',
   planEntityMotion:'统一移动并推进回旋分段/回追/接回、到期爆破及可视效果清理；不跨墙或离线补跑。',
   planCollisionEffects:'连续碰撞产去重伤害；回旋碰墙下一步换程，保留本步去程命中；爆破首碰只爆一次。',
   planWorldInteraction:'探索交互优先处理附近MCP，再处理补给/首领门；Boss不打开换装面板。',
   resolveWeaponTemplate:'原版六MCP或已锁定社区配方解析为真实原生行为，不执行任意脚本。',
   parseModPackage:'校验SDK1.0–1.2、精确依赖、补丁与六种原生模板配方；按版本开放模板并验证参数边界。',
   planWeaponFire:'按当前六种MCP/社区配方的独立CD与手动瞄准开火，消费一次换枪下一发加成。',
   planTokenCollection:'只消费接触的大白饭/材料；装备走F和实例交换，不自动吸入、不变为资源。'
  };
  if(equipmentDescriptions[fn.name])item.description=equipmentDescriptions[fn.name];
  if(['planWeaponVector','planWeaponStream','planWeaponReturn','planWeaponBatch','planWeaponPickup','planEquipmentInteraction','createWeaponProjectile','planProjectileBurst'].includes(fn.name))item.implementationScope='core-preview + adventure-slice';

  if(fn.name==='executeNestAction'){item.ownership='只经注入StoragePort事务修改Profile，不写Session';item.phase='profile-command';item.rule='仅无活动检查点的小窝可执行；冲突重读重算';}
  if(fn.name==='mountNestManager')item.ownership='宿主只读Profile副本，经应用服务消费；不修改GameState';

  if(fn.name==='loadContentCatalog')item.description='返回来源于设计表格的正式版本化内容副本；数据存在不表示其处理器已经实现。';
  if(fn.name==='createHandlerRegistry')item.description='返回95项设计绑定与显式implementedIds能力集合，不把未实现条目声明为可运行。';
  if(fn.name==='validateContentCatalog')item.description='校验原版目录数量、社区MCP注册与锁、稳定ID/引用、160点树前置DAG及运行能力声明。';
  if(fn.name==='mountCombatPreview')item.ownership='宿主入口，只持Session句柄与输入/表现/存储；不直接写GameState';
  const index=source.indexOf(`export ${fn.async?'async ':''}function ${fn.name}(`);
  const start=source.lastIndexOf('/**',index);
  if(start>=0){let comment=source.slice(start,index).replace(/^ \* @calls.*\n/gm,'').replace(/^ \* @implementationScope.*\n/gm,'');if(fn.implementation==='implemented')comment=comment.replace(/^ \* @throws \{Error\} TODO placeholder until Grok implements this contract\.\n/gm,'');const scopeText=item.implementationScope?` * @implementationScope ${item.implementationScope}\n`:'';const callText=scopeText+(item.calls.map(call=>` * @calls ${call}\n`).join('')||' * @calls 无内部公开函数。\n');
   if(comment.includes(' * @param'))comment=comment.replace(' * @param',callText+' * @param');else if(comment.includes(' * @returns'))comment=comment.replace(' * @returns',callText+' * @returns');else comment=comment.replace(' */',callText+' */');
   source=source.slice(0,start)+comment+source.slice(index);}
  contract.functions.push(item);
 }
 manifest.modules.push(contract);await fs.writeFile(path.join(sourceRoot,module.path),source);
}
manifest.status='combat-preview-available';manifest.previewEntry='preview/host.js#mountCombatPreview';
manifest.externalEntrypoints=[...new Set([...manifest.externalEntrypoints,'mountCombatPreview'])];
manifest.rules=manifest.rules.filter(rule=>!rule.includes('No V2 entry is wired')&&!rule.includes('Core helpers are implemented'));
manifest.rules.push('V2 combat preview is opt-in through v2.html; full adventure bootstrap and remaining TODO content stay unavailable. Legacy main remains separate.');
manifest.rules=[...new Set(manifest.rules)];
const fns=manifest.modules.flatMap(module=>module.functions),implemented=fns.filter(fn=>fn.implementation==='implemented').length;
manifest.counts={modules:manifest.modules.length,functions:fns.length,implemented,placeholders:fns.length-implemented};
await fs.writeFile(filename,JSON.stringify(manifest,null,2)+'\n');
const esc=value=>value.replaceAll('|','\\|').replaceAll('\n',' '),rows=['# 12 · 全部函数目录与调用契约','',`当前${manifest.counts.modules}个JS模块、${fns.length}个公开函数：${implemented}个有实现，${fns.length-implemented}个明确TODO。core-preview为Free练习，adventure-slice为Pro1短途；均不能当完整规格已完成。参见[进度与边界](13-development-status.md)。`,'','调用图包含模块私有辅助函数转达的公开调用。TODO列出预定契约；已实现函数列出真实公开依赖。dispatch按内容ID选分支；顺序仍受适用条件约束。',''];
for(const module of manifest.modules){rows.push(`## ${module.path}`,'',module.purpose,'',`[源码](../../src/v2/${module.path})；层：\`${module.layer}\`。`,'',`直接依赖：${module.dependencies.map(dep=>'`'+dep+'`').join('、')||'无'}。`,'','| 函数签名 | 返回 | 状态/范围 | 功能与约束 |','|---|---|---|---|');
 for(const fn of module.functions)rows.push(`| \`${esc(fn.name+'('+fn.args.map(arg=>arg.name+': '+arg.type+(arg.default!==undefined?' = '+arg.default:'')).join(', ')+')')}\` | \`${esc(fn.result)}\` | ${fn.implementation==='implemented'?'已实现':'TODO'}${fn.implementationScope?' / '+fn.implementationScope:''} | ${esc(fn.description+'；'+fn.rule+'；状态权限：'+fn.ownership)} |`);
 rows.push('','公开函数下游：','');for(const fn of module.functions)rows.push(`- \`${fn.name}\` → ${fn.calls.map(call=>'`'+call+'`').join('、')||'无内部公开函数'}。`);
 rows.push('','公开函数上游：','');for(const fn of module.functions){const id=module.path+'#'+fn.name,callers=manifest.modules.flatMap(owner=>owner.functions.filter(fn=>fn.calls.includes(id)).map(fn=>owner.path+'#'+fn.name));rows.push(`- \`${fn.name}\` ← ${callers.map(call=>'`'+call+'`').join('、')||'宿主/工具入口或待编排'}。`);}rows.push('');
}
rows.push('## 内容处理器绑定','','| 分类 | 稳定ID | 处理器 |','|---|---|---|');for(const binding of manifest.bindings)rows.push(`| ${binding.kind} | \`${binding.id}\` | \`${binding.module}#${binding.function}\` |`);
rows.push('','## 声明式数据消费者','','27个技能树节点和6项设施列于manifest.dataDefinitions；来源与参数见content/catalogData.js。数值落表不表示树购买、局外应用或全部运行效果已经实现。','');
await fs.writeFile(path.join(root,'docs/design-v2/12-function-catalog.md'),rows.join('\n'));
console.log(manifest.counts);
