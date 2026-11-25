/** 深夜食堂电台。所有台词从当前航次与已完成的目标还原，读档不需要额外记录。 */
const stations = [
  { name: '盐风修船厂', voice: '修船工', tuning: '有人敲了两下船壳，又敲了两下。敲的是吃饭铃的拍子。', reply: '有。手上全是油，给我留个勺。' },
  { name: '浮标邮局', voice: '值夜邮差', tuning: '耳机里哐啷一响。有人拉开抽屉，在里面翻一只搪瓷饭盒。', reply: '听见了！你上次借我的饭盒，我洗干净了。' },
  { name: '海沟气象站', voice: '观测员', tuning: '「西北风三级……」播报突然停了。「等等，我好像闻到饭香了。」', reply: '晚间预报改一下。局部有葱花，我带。' },
];

const captains = {
  claude: { name: 'Claude', brief: 'Claude 把「开饭了」夹在钳子里，说群发邀约要先盖章。', hail: '这张邀请上没有我的名字。群发的不算。', end: 'Claude 在值班簿上端端正正盖了个章。大肥鱼翻过来看，印的是「少饭，多锅巴」。' },
  gpt: { name: 'ChatGPT', brief: 'ChatGPT 写了三版晚餐邀请，还在等一个更好的开头。', hail: '再等一会儿。这一版的「趁热」还不够真诚。', end: 'ChatGPT 还想重新措辞。第一口饭进了嘴，电台终于安静了。过了一会儿，它伸过碗来。' },
  grok: { name: 'Grok', brief: 'Grok 把晚饭通知绑上火箭。第一条消息刚飞过月亮。', hail: '倒数三秒，晚饭就能覆盖整个银河系！', end: 'Grok 拆下一片火箭尾翼，垫平那条瘸腿长凳。「这个落点准吧？」它坐下来，多盛了一勺。' },
};

/** @param {string} id */
function stationFor(id) { return stations[Number(id.split(':').at(-1))] ?? stations[0]; }

/** 各工作区在地图和电台里共用同一个地名。
 * @calls 无内部公开函数。
 * @param {string} id
 * @returns {string}
 */
export function stationName(id) { return stationFor(id).name; }

/** 出发前可以从任意模式和首领选择进入，不依赖运行中的会话。
 * @calls 无内部公开函数。
 * @param {string} mode
 * @param {string} faction
 * @returns {string}
 */
export function routeBrief(mode, faction) {
  if (mode === 'tutorial-guide') return '码头试音。饭团把麦克风递过来：「先朝浮标打一泡，听听那头响不响。」';
  if (mode === 'tutorial') return '码头空着。把新接口带到水上试试，饭点再回来。';
  if (mode === 'api') return '值通宵班的人分批下工。你想守多久都行，准备收摊时回安全检查点长按交互。';
  if (mode.endsWith('expedition')) return '三片海各有一班人没下工。每海域完成两项目标，找到守门人，把晚饭通知递给下一班。';
  const captain = captains[/** @type {keyof typeof captains} */(faction)] ?? captains.claude;
  return captain.brief + ' 接通任意两座电台，去闸口找它。';
}

/** 按玩家实际经过的站点、首领和结局排版本航次电台记录。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {{speaker:string, text:string}[]}
 */
export function voyageLog(state) {
  const { start, world, expedition, api, flow } = state;
  const phase = flow.phase;
  const faction = expedition?.route[world.map.biomeIndex] ?? start.bossFaction ?? 'claude';
  const captain = captains[faction];
  const lines = [{ speaker: '大肥鱼', text: '饭焖好了。听得见的，回我一声。' }];
  if (start.guidedTutorial) {
    lines.push({ speaker: '饭团', text: '我在码头这头。你去试麦，锅底那层脆的我给你留着。' });
  } else if (api) {
    lines.push({ speaker: '夜班调度', text: '夜里总有人交班。听到下一班的呼号，再决定要不要收摊。' });
    if (api.bossKills) lines.push({ speaker: '灶台', text: `已经接过 ${api.bossKills} 班人的碗。炉火还旺着。` });
  } else if (expedition) {
    for (const index of expedition.clearedBiomes) {
      lines.push({ speaker: `海域 ${index + 1} 回执`, text: `${captains[expedition.route[index]].name} 已应声，桌边加一副碗筷。` });
    }
    lines.push({ speaker: `海域 ${world.map.biomeIndex + 1} · 值班留言`, text: captain.brief });
  } else if (start.difficulty.mode === 'short') {
    lines.push({ speaker: '港口值班留言', text: captain.brief });
  } else {
    lines.push({ speaker: '饭团', text: '你试你的泡泡炮。我听着呢。' });
  }
  for (const objective of world.objectives) {
    const station = stationFor(objective.id);
    if (objective.kind === 'beacon' && objective.progress >= (objective.requiredProgress ?? 2100) / 3) {
      lines.push({ speaker: station.name + ' · 调频中', text: station.tuning });
    }
    if (!objective.completed || !['beacon', 'blockade', 'escort'].includes(objective.kind)) continue;
    lines.push({ speaker: station.name + ' · ' + station.voice, text: station.reply });
  }
  const fed = state.world.entities[state.player.entityId]?.runtime.fedCompanionIds;
  if (Array.isArray(fed) && fed.length) {
    lines.push({speaker:'同船留言', text:'刚才分出去的那口饭有人记着。「我先去擦桌子。你别回来太晚。」'});
  }
  if (!api && !start.guidedTutorial && state.bosses.some(b => b.faction === faction)) {
    lines.push({ speaker: captain.name, text: captain.hail });
  }
  if (phase === 'victory') {
    lines.push({ speaker: '打烊以后', text: start.guidedTutorial ? '饭团掀开锅盖，把第一块锅巴拨给你。「行，明晚你来喊人。」' : expedition ? '四个人挤在一张桌旁，话筒还开着。隔海值班的人听了一夜碗筷声。' : captain.end });
  } else if (phase === 'defeat') {
    lines.push({ speaker: '返港', text: '船还没靠稳，饭团就把一碗饭塞进你手里。「先吃，你的那份一直温着。」' });
  } else if (phase === 'withdrawal') {
    lines.push({ speaker: '交班', text: '大肥鱼扣好锅盖，留了一张纸条。最后下班的人翻过来，看见背面写着「饭在锅里」。' });
  }
  return lines;
}
