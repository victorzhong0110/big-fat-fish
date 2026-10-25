import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readV2SourceModel } from './v2-source-model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sourceRoot=path.join(root,'src/v2');
const filename=path.join(sourceRoot,'architecture-manifest.json'),manifest=JSON.parse(await fs.readFile(filename,'utf8'));
const sourceModel=await readV2SourceModel(sourceRoot),previous=new Map(manifest.modules.map(module=>[module.path,module]));
const descriptions={createStateChange:'将有类型的数据转换为独立、有限的计划载荷，统一StateChange创建。',createEntityState:'按稳定ID和来源建立完整实体默认值；调用者提供出生参数快照。',createInitialGameState:'构造未发布的初始对局；当前仅允许显式core-preview，不开放完整冒险。',resolveBodyDestination:'实体沿圆形阻挡扫掠并滑动，遵守地图边界与Grok穿障矩阵。',planNativeProjectiles:'按MCP参数生成原生弹体，每枚弹有独立attackId，同次射击共享chainId。',planMeleeEnemy:'处理近身追赶、缓存寻路、接触；棕蟹额外拥有0.9秒预警重钳。',advancePreviewWorldTick:'执行受范围限制的预览世界步，逐阶段应用计划、排队效果、声明死亡与掉落，最后只提交一次。',advancePreviewUiCommands:'不推进已暂停时钟，立即处理暂停/恢复命令。',toJson:'在参数边界验证并复制规范纯JSON数据。',getPreviewCamera:'按画面尺寸计算相机与比例，绘制和鼠标映射使用同一投影。',renderPreviewFrame:'只读绘制实体、米粒、弱点/攻击预警与伤害数字，不模拟战斗。',mountCombatPreview:'组装独立浏览器战斗试作、键鼠/双摇杆、固定帧、菜单和隔离检查点；返回完整清理函数。'};
const scoped=new Set(['createGameSession','restoreGameSession','stepSessionWorld','stepSessionUi','enqueueSessionCommand','validateGameCommand','planGameCommand','planFlowTransition','planPause','planResume','createMapPlan','planEnemyAi','planEventHooks','evaluateEffectRequest','drainEffectQueue','planWeaponFire','planSkillCast','planLoadoutChange','planNativeProjectiles','dispatchWeaponsHandler','dispatchSkillsHandler','dispatchEnemiesHandler','advancePreviewWorldTick','advancePreviewUiCommands','createInitialGameState','mountCombatPreview','planDeathRewards','planTokenCollection','planPlayerMovement','planEntityMotion','planPickupMotion','planCollisionEffects','planWeaponBubble','planWeaponFan','planSkillCache','planSkillDisconnect','planEnemyClaudeGuard','planEnemyGrokBot','createRenderSnapshot','renderPreviewFrame','getPreviewCamera']);
manifest.modules=[];
for(const module of sourceModel){
 const old=previous.get(module.path);const contract={path:module.path,layer:old?.layer??(module.path.startsWith('preview/')?'host':module.path.startsWith('content/')?'content':module.path.startsWith('engine/')?'engine':'domain'),purpose:old?.purpose??module.source.split('\n').find(line=>line.startsWith('/**'))?.replace(/^\/\*\*\s*/,'').replace(/\*\/$/,'')??module.path,dependencies:module.dependencies,functions:[]};
 contract.purpose=contract.purpose.trim();
 let source=module.source;
 for(const fn of module.functions){
  const original=old?.functions.find(item=>item.name===fn.name);const item={...(original??{description:descriptions[fn.name]??fn.name,rule:'',ownership:'只读输入、返回值/计划；不得写调用者状态',phase:'query',callMode:'sequence'}),name:fn.name,args:fn.args,result:fn.result,implementation:fn.implementation};
  item.calls=fn.implementation==='implemented'?fn.actualCalls:(original?.calls??[]);
  if(scoped.has(fn.name))item.implementationScope='core-preview';
  const previewDescriptions={createMapPlan:'生成固定的连续战斗演练海域/礁石/检查点与15只普通敌人；正式区域/事件/目标地图尚未实现。',planEnemyAi:'当前只分派棕蟹与基础Bot，不执行未实现的GPT/模型/累计机制处理器。',planWeaponFire:'在预览中按当前泡泡/扇面冷却与手动瞄准开火，保持每把武器自己的冷却。',planSkillCast:'当前只施放缓存护盾/断开连接，检查冷却与技能封禁后成功才发SkillCast。',planLoadoutChange:'当前只支持Q切枪与0.3秒切换锁，地面换装明确拒绝。',planGameCommand:'预览仅分派SetInput/Pause/Resume/Dash/Skill/SwitchWeapon，并提交单调序号确认。',validateGameCommand:'校验预览支持的六类命令、纯数据载荷、单调序号、时钟域与阶段。',evaluateEffectRequest:'预览处理damage/heal/shield/collect；其他效果类型明确拒绝，不假装生成或控制已完成。',planEventHooks:'只接受无插件/DSH/累计机制的预览订阅集；完整内容事件订阅尚未实现。',planFlowTransition:'预览只开放战斗→暂停/终态与暂停→原战斗状态；完整成长面板状态边未接入。',planResume:'当前恢复预览的exploring/boss，不推进暂停期间墙钟；LoRA菜单恢复尚未接入。',planDeathRewards:'当前按阵营生成大白饭并按死亡来源ID去重；正式精英群箱/材料/Boss永久解锁仍待实现。',planTokenCollection:'接触后消费米粒/材料拾取，装备类拾取明确拒绝；不直接持久化。',createGameSession:'只创建显式core-preview/0级范围的私有Session，校验内容/初始世界后才发布句柄。',restoreGameSession:'验证检查点后构建新的暂停预览Session；完整冒险范围明确拒绝。',stepSessionWorld:'消费到期世界命令，调用独立预览世界步并原子提交；正式世界tick仍未实现。',stepSessionUi:'立即消费预览暂停/继续，不推进停止的世界/UI时钟；训练UI步尚未接入。',createRenderSnapshot:'投影预览实体/米粒/预警、生命/武器/技能冷却；完整LoRA/插件菜单尚未接入。'};
  if(previewDescriptions[fn.name])item.description=previewDescriptions[fn.name];
  if(fn.name==='loadContentCatalog')item.description='返回来源于设计表格的正式版本化内容副本；数据存在不表示其处理器已经实现。';
  if(fn.name==='createHandlerRegistry')item.description='返回95项设计绑定与显式implementedIds能力集合，不把未实现条目声明为可运行。';
  if(fn.name==='validateContentCatalog')item.description='校验各目录数量、稳定ID/引用、160点树花费及前置DAG、累计机制和运行能力声明。';
  if(fn.name==='mountCombatPreview')item.ownership='宿主入口，只持Session句柄与输入/表现/存储；不直接写GameState';
  const index=source.indexOf(`export ${fn.async?'async ':''}function ${fn.name}(`);
  const start=source.lastIndexOf('/**',index);
  if(start>=0){let comment=source.slice(start,index).replace(/^ \* @calls.*\n/gm,'').replace(/^ \* @implementationScope.*\n/gm,'');const scopeText=item.implementationScope?` * @implementationScope ${item.implementationScope}\n`:'';const callText=scopeText+(item.calls.map(call=>` * @calls ${call}\n`).join('')||' * @calls 无内部公开函数。\n');
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
const esc=value=>value.replaceAll('|','\\|').replaceAll('\n',' '),rows=['# 12 · 全部函数目录与调用契约','',`当前${manifest.counts.modules}个JS模块、${fns.length}个公开函数：${implemented}个有实现，${fns.length-implemented}个明确TODO。标注core-preview的函数仅覆盖战斗试作；不能当完整冒险实现。参见[进度与边界](13-development-status.md)。`,'','调用图包含模块私有辅助函数转达的公开调用。TODO列出预定契约；已实现函数列出真实公开依赖。dispatch按内容ID选分支；顺序仍受适用条件约束。',''];
for(const module of manifest.modules){rows.push(`## ${module.path}`,'',module.purpose,'',`[源码](../../src/v2/${module.path})；层：\`${module.layer}\`。`,'',`直接依赖：${module.dependencies.map(dep=>'`'+dep+'`').join('、')||'无'}。`,'','| 函数签名 | 返回 | 状态/范围 | 功能与约束 |','|---|---|---|---|');
 for(const fn of module.functions)rows.push(`| \`${esc(fn.name+'('+fn.args.map(arg=>arg.name+': '+arg.type+(arg.default!==undefined?' = '+arg.default:'')).join(', ')+')')}\` | \`${esc(fn.result)}\` | ${fn.implementation==='implemented'?'已实现':'TODO'}${fn.implementationScope?' / '+fn.implementationScope:''} | ${esc(fn.description+'；'+fn.rule+'；状态权限：'+fn.ownership)} |`);
 rows.push('','公开函数下游：','');for(const fn of module.functions)rows.push(`- \`${fn.name}\` → ${fn.calls.map(call=>'`'+call+'`').join('、')||'无内部公开函数'}。`);
 rows.push('','公开函数上游：','');for(const fn of module.functions){const id=module.path+'#'+fn.name,callers=manifest.modules.flatMap(owner=>owner.functions.filter(fn=>fn.calls.includes(id)).map(fn=>owner.path+'#'+fn.name));rows.push(`- \`${fn.name}\` ← ${callers.map(call=>'`'+call+'`').join('、')||'宿主/工具入口或待编排'}。`);}rows.push('');
}
rows.push('## 内容处理器绑定','','| 分类 | 稳定ID | 处理器 |','|---|---|---|');for(const binding of manifest.bindings)rows.push(`| ${binding.kind} | \`${binding.id}\` | \`${binding.module}#${binding.function}\` |`);
rows.push('','## 声明式数据消费者','','27个技能树节点和6项设施列于manifest.dataDefinitions；来源与参数见content/catalogData.js。数值落表不表示树购买、局外应用或全部运行效果已经实现。','');
await fs.writeFile(path.join(root,'docs/design-v2/12-function-catalog.md'),rows.join('\n'));
console.log(manifest.counts);
