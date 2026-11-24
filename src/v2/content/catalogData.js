// Source-backed definitions. Runtime capabilities remain explicitly verified.
export const CATALOG_DATA = {
  "version": "2.0.0-preview.5",
  "definitions": {
    "world_escort": {"id":"world_escort","kind":"entity","displayName":"补给机器人","parameters":{},"version":"2.0.0-preview.5"},
    "world_blockade": {"id":"world_blockade","kind":"entity","displayName":"封锁装置","parameters":{},"version":"2.0.0-preview.5"},
    "world_blockade_relay": {"id":"world_blockade_relay","kind":"entity","displayName":"封锁供能柱","parameters":{},"version":"2.0.0-preview.5"},
    "world_blockade_core": {"id":"world_blockade_core","kind":"entity","displayName":"封锁核心","parameters":{},"version":"2.0.0-preview.5"},
    "world_rest": {"id":"world_rest","kind":"entity","displayName":"独立休整设施","parameters":{},"version":"2.0.0-preview.5"},
    "scheduled_action": {
      "id": "scheduled_action",
      "kind": "entity",
      "displayName": "延迟调用",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "plugin_field": {
      "id": "plugin_field",
      "kind": "entity",
      "displayName": "插件效果区",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "claude_ban_projectile": {
      "id": "claude_ban_projectile",
      "kind": "entity",
      "displayName": "伙伴封禁弹",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "ability_field": {
      "id": "ability_field",
      "kind": "entity",
      "displayName": "技能区域",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "ability_decoy": {
      "id": "ability_decoy",
      "kind": "entity",
      "displayName": "鱼形诱饵",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_blast": {
      "id": "world_blast",
      "kind": "entity",
      "displayName": "爆破涟漪",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "plugin_parallel": {
      "id": "plugin_parallel",
      "kind": "plugin",
      "displayName": "并行调用",
      "parameters": {
        "description": "plugin_parallel / 并行调用：每 0.4 秒最多一次基础射击增加左右各一枚 ±12° 投射物，各 0.40W→0.60W；新增弹为 secondary；两条分叉射流",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginParallel",
        "sourceRow": [
          "每 0.4 秒最多一次基础射击增加左右各一枚 ±12° 投射物，各 0.40W→0.60W；新增弹为 secondary",
          "两条分叉射流"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "基础射击额外分出两枚0.4W泡泡。",
          "额外泡泡提高至0.6W。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_local_deploy": {
      "id": "plugin_local_deploy",
      "kind": "plugin",
      "displayName": "本地部署 · 零延迟",
      "parameters": {
        "description": "射速 +35%→+55%，移速 +25%→+40%，弹速 +40%→+65%。没有前置。",
        "source": "ROADMAP-FUN-GAME.md",
        "handler": "content/handlers/plugins.js#planPluginLocalDeploy",
        "sourceRow": ["射速、移速、弹速一起加", "没有停火或站桩条件"],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": ["射速+35%，移速+25%，弹速+40%。", "射速+55%，移速+40%，弹速+65%。"]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_quant_int4": {
      "id": "plugin_quant_int4",
      "kind": "plugin",
      "displayName": "INT4 量化",
      "parameters": {
        "description": "单发伤害 -25%，射击间隔 ×0.55→×0.45，额外 +2 发弹道。",
        "source": "ROADMAP-FUN-GAME.md",
        "handler": "content/handlers/plugins.js#planPluginQuantInt4",
        "sourceRow": ["单发变轻，射速和弹数变多", "没有武器限制"],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": ["伤害-25%，间隔×0.55，额外两发。", "伤害-25%，间隔×0.45，额外两发。"]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_rollback_emergency": {
      "id": "plugin_rollback_emergency",
      "kind": "plugin",
      "displayName": "紧急回滚",
      "parameters": {
        "description": "致命伤或生命跌破 15% 时回到 2 秒前的位置和生命，震开周围敌人并清掉附近敌方弹幕。冷却 45→30 秒。",
        "source": "ROADMAP-FUN-GAME.md",
        "handler": "content/handlers/plugins.js#planPluginRollbackEmergency",
        "sourceRow": ["低血或致命伤倒回两秒", "震开小怪并清弹幕"],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": ["触发后 45 秒才能再来一次。", "触发后 30 秒才能再来一次。"]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_batch": {
      "id": "plugin_batch",
      "kind": "plugin",
      "displayName": "批量处理",
      "parameters": {
        "description": "plugin_batch / 批量处理：每 8→6 次基础武器命中，在目标处爆炸，半径 85，伤害 18；内置冷却 0.5 秒；命中计数与范围圆环",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginBatch",
        "sourceRow": [
          "每 8→6 次基础武器命中，在目标处爆炸，半径 85，伤害 18；内置冷却 0.5 秒",
          "命中计数与范围圆环"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "每8次主弹命中引发范围爆炸。",
          "每6次命中引发爆炸。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_compress": {
      "id": "plugin_compress",
      "kind": "plugin",
      "displayName": "上下文压缩",
      "parameters": {
        "description": "plugin_compress / 上下文压缩：基础武器射程 ×0.75，武器伤害 +30%→+45%；回旋转折距离同步 ×0.75；泡泡更浓、更短",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginCompress",
        "sourceRow": [
          "基础武器射程 ×0.75，武器伤害 +30%→+45%；回旋转折距离同步 ×0.75",
          "泡泡更浓、更短"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "主武器射程缩短25%，伤害提高30%。贴近一点，泡泡更重。",
          "主武器射程缩短25%，伤害提高45%。替换一级加成，不重复叠加。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_cache": {
      "id": "plugin_cache",
      "kind": "plugin",
      "displayName": "缓存命中",
      "parameters": {
        "description": "plugin_cache / 缓存命中：连续命中同一目标 3 次后，基础武器对其额外伤害 +20%→+35%，持续 2 秒；切目标即清层，刷新不叠乘；目标上缓存方块",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginCache",
        "sourceRow": [
          "连续命中同一目标 3 次后，基础武器对其额外伤害 +20%→+35%，持续 2 秒；切目标即清层，刷新不叠乘",
          "目标上缓存方块"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "连续命中同一目标3次后，对它伤害提高20%。",
          "缓存额外伤害提高至35%。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_retry": {
      "id": "plugin_retry",
      "kind": "plugin",
      "displayName": "自动重试",
      "parameters": {
        "description": "plugin_retry / 自动重试：主投射物到期且一次未命中时，向 450 范围最近敌人补一发 0.5W→0.8W 追踪泡；内置冷却 1.5 秒；失败泡泡回转；只重试一次",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginRetry",
        "sourceRow": [
          "主投射物到期且一次未命中时，向 450 范围最近敌人补一发 0.5W→0.8W 追踪泡；内置冷却 1.5 秒",
          "失败泡泡回转；只重试一次"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "完全落空的主弹到期后补一发半伤追踪泡。",
          "重试泡泡伤害提高至0.8W。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_temperature": {
      "id": "plugin_temperature",
      "kind": "plugin",
      "displayName": "温度采样",
      "parameters": {
        "description": "plugin_temperature / 温度采样：每次基础射击 15%→25% 概率变成大泡，主弹伤害 ×1.6、半径 ×1.3；整组只掷一次；变大、有表情的泡泡",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginTemperature",
        "sourceRow": [
          "每次基础射击 15%→25% 概率变成大泡，主弹伤害 ×1.6、半径 ×1.3；整组只掷一次",
          "变大、有表情的泡泡"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "每次射击有15%概率变成更大、更重的泡泡。",
          "大泡概率提高至25%。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_collect": {
      "id": "plugin_collect",
      "kind": "plugin",
      "displayName": "大白饭回收",
      "parameters": {
        "description": "plugin_collect / 大白饭回收：大白饭吸附半径 +80→+140；不会加经验倍率或资源收入；吸附范围与颗粒拖尾",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginCollect",
        "sourceRow": [
          "大白饭吸附半径 +80→+140；不会加经验倍率或资源收入",
          "吸附范围与颗粒拖尾"
        ],
        "previewAvailable": true,
        "rankDescriptions": [
          "大白饭吸附半径增加80。只让收饭更方便，不增加经验或收入。",
          "大白饭吸附半径增加140，替换一级的80。经验与收入不变。"
        ],
        "rarity": "common"
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_cooldown": {
      "id": "plugin_cooldown",
      "kind": "plugin",
      "displayName": "空闲算力",
      "parameters": {
        "description": "plugin_cooldown / 空闲算力：连续 3 秒未射击时，装备主动技能剩余冷却每秒额外减少 0.5→0.8 秒；不影响其他计时；技能图标上空闲脉冲",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginCooldown",
        "sourceRow": [
          "连续 3 秒未射击时，装备主动技能剩余冷却每秒额外减少 0.5→0.8 秒；不影响其他计时",
          "技能图标上空闲脉冲"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "3秒未射击时，技能额外恢复每秒0.5秒。",
          "额外恢复提高至每秒0.8秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_offload": {
      "id": "plugin_offload",
      "kind": "plugin",
      "displayName": "卸载缓存",
      "parameters": {
        "description": "plugin_offload / 卸载缓存：冲刺结束留下一片半径 75、持续 2 秒尾流，敌人每 0.5 秒受 5→8 伤；同敌每次尾流最多 4 跳；水下尾流",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginOffload",
        "sourceRow": [
          "冲刺结束留下一片半径 75、持续 2 秒尾流，敌人每 0.5 秒受 5→8 伤；同敌每次尾流最多 4 跳",
          "水下尾流"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "冲刺结束留下伤害尾流，每跳5伤。",
          "尾流每跳8伤。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_keepalive": {
      "id": "plugin_keepalive",
      "kind": "plugin",
      "displayName": "心跳保活",
      "parameters": {
        "description": "plugin_keepalive / 心跳保活：每 12→9 秒获得 6 护盾，持续 4 秒；同名护盾只刷新，不能囤积；节拍护盾",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginKeepalive",
        "sourceRow": [
          "每 12→9 秒获得 6 护盾，持续 4 秒；同名护盾只刷新，不能囤积",
          "节拍护盾"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "每12秒自动获得6护盾，持续4秒。",
          "护盾间隔缩短至9秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_redirect": {
      "id": "plugin_redirect",
      "kind": "plugin",
      "displayName": "请求转发",
      "parameters": {
        "description": "plugin_redirect / 请求转发：基础主投射物首次命中后可弹向 180→260 内另一敌人，伤害 0.5W，最多一次；原生穿透/回旋不再附加转发；折线连接",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginRedirect",
        "sourceRow": [
          "基础主投射物首次命中后可弹向 180→260 内另一敌人，伤害 0.5W，最多一次；原生穿透/回旋不再附加转发",
          "折线连接"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "主弹首次命中后转发半伤泡泡，跳距180。",
          "转发跳距提高至260。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_backoff": {
      "id": "plugin_backoff",
      "kind": "plugin",
      "displayName": "指数退避",
      "parameters": {
        "description": "plugin_backoff / 指数退避：实际失去生命后移速 +25%→+35%，持续 2 秒；内置冷却 4 秒，不叠层；受击后加速残影",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginBackoff",
        "sourceRow": [
          "实际失去生命后移速 +25%→+35%，持续 2 秒；内置冷却 4 秒，不叠层",
          "受击后加速残影"
        ],
        "previewAvailable": true,
        "rarity": "common",
        "rankDescriptions": [
          "受伤后获得2秒移速+25%。",
          "受伤移速加成提高至35%。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_distill": {
      "id": "plugin_distill",
      "kind": "plugin",
      "displayName": "蒸馏",
      "parameters": {
        "description": "plugin_distill / 蒸馏：击败敌人积累样本并获取对应属性/派生技能；2级降低所需样本，详见 §6；样本吸收、三条来源进度",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginDistill",
        "sourceRow": [
          "击败敌人积累样本并获取对应属性/派生技能；2级降低所需样本，详见 §6",
          "样本吸收、三条来源进度"
        ],
        "previewAvailable": true,
        "rankDescriptions": [
          "击杀积累样本：蟹变护甲/受伤盾，GPT变追击泡，Bot变移速/虚影。每阶6/6/10样本，最多3阶。",
          "每阶样本降至蟹4 / GPT4 / Bot7，已有样本立即结算。能力仍最多3阶。"
        ],
        "rarity": "advanced"
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_5h": {
      "id": "plugin_5h",
      "kind": "plugin",
      "displayName": "5h限制",
      "parameters": {
        "description": "plugin_5h / 5h限制：每个敌人滚动 10 秒内最多造成 18→12 点防御前伤害，详见 §7；敌人额度条与“已限流”印章",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPlugin5h",
        "sourceRow": [
          "每个敌人滚动 10 秒内最多造成 18→12 点防御前伤害，详见 §7",
          "敌人额度条与“已限流”印章"
        ],
        "previewAvailable": true,
        "rankDescriptions": [
          "每个敌人在滚动10秒内，最多对你造成18点防御前伤害。护盾吸收也计入额度。",
          "每个敌人的10秒伤害额度降至12。沿用最近10秒记录，不会重新发放额度。"
        ],
        "rarity": "advanced"
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_failover": {
      "id": "plugin_failover",
      "kind": "plugin",
      "displayName": "故障转移",
      "parameters": {
        "description": "plugin_failover / 故障转移：每 18→12 秒第一次被禁锢时立即解除，并在 180 范围造成 20 伤；不解除技能/伙伴封禁；封锁碎裂、插件亮起",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginFailover",
        "sourceRow": [
          "每 18→12 秒第一次被禁锢时立即解除，并在 180 范围造成 20 伤；不解除技能/伙伴封禁",
          "封锁碎裂、插件亮起"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "第一次被禁锢时解除并震击附近敌人，冷却18秒。",
          "故障转移冷却缩短至12秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_sandbox": {
      "id": "plugin_sandbox",
      "kind": "plugin",
      "displayName": "沙箱隔离",
      "parameters": {
        "description": "plugin_sandbox / 沙箱隔离：基础武器命中使敌人减速 25%，持续 1.2→2 秒；Boss 效果减半，同名只刷新；明确减速边框",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginSandbox",
        "sourceRow": [
          "基础武器命中使敌人减速 25%，持续 1.2→2 秒；Boss 效果减半，同名只刷新",
          "明确减速边框"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "主弹命中减速敌人25%，持续1.2秒。",
          "减速持续2秒，Boss效果减半。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_hallucination": {
      "id": "plugin_hallucination",
      "kind": "plugin",
      "displayName": "哪来的电脑病毒（幻觉）",
      "parameters": {
        "description": "plugin_hallucination / 哪来的电脑病毒（幻觉）：使用装备主动技能后生成 3→5 秒鱼形诱饵，吸引 350 内普通敌人；内置冷却 10 秒；半透明笨鱼替身",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginHallucination",
        "sourceRow": [
          "使用装备主动技能后生成 3→5 秒鱼形诱饵，吸引 350 内普通敌人；内置冷却 10 秒",
          "半透明笨鱼替身"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "主动技能生成3秒诱饵。",
          "诱饵持续5秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_chain": {
      "id": "plugin_chain",
      "kind": "plugin",
      "displayName": "链式调用",
      "parameters": {
        "description": "plugin_chain / 链式调用：每 6→4 次基础武器命中释放一次电链，依次打至多 3 个不同敌人，每次跳距 180，每目标 12 伤；内置冷却 1 秒；三段清晰电链",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginChain",
        "sourceRow": [
          "每 6→4 次基础武器命中释放一次电链，依次打至多 3 个不同敌人，每次跳距 180，每目标 12 伤；内置冷却 1 秒",
          "三段清晰电链"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "每6次主弹命中引发三目标电链。",
          "每4次命中引发电链。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_context": {
      "id": "plugin_context",
      "kind": "plugin",
      "displayName": "长上下文",
      "parameters": {
        "description": "plugin_context / 长上下文：连续射击时每秒武器伤害 +3%，上限 +18%→+30%；停止射击 1 秒后清空；不是命中叠层；连续输出计量条",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginContext",
        "sourceRow": [
          "连续射击时每秒武器伤害 +3%，上限 +18%→+30%；停止射击 1 秒后清空；不是命中叠层",
          "连续输出计量条"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "持续射击逐秒变强，武器伤害最多+18%。",
          "持续射击上限提高至+30%。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_hotplug": {
      "id": "plugin_hotplug",
      "kind": "plugin",
      "displayName": "热插拔",
      "parameters": {
        "description": "plugin_hotplug / 热插拔：切 MCP 时发出半径 160 的冲击，造成 25→40 伤并推开普通敌人；内置冷却 6 秒；武器插拔环形波",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginHotplug",
        "sourceRow": [
          "切 MCP 时发出半径 160 的冲击，造成 25→40 伤并推开普通敌人；内置冷却 6 秒",
          "武器插拔环形波"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "切换武器时震开附近敌人，造成25伤。",
          "切换震击提高至40伤。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_guard": {
      "id": "plugin_guard",
      "kind": "plugin",
      "displayName": "安全对齐",
      "parameters": {
        "description": "plugin_guard / 安全对齐：单次防御前伤害达到 20 时获得额外 20→30% 减伤；逐次计算，不截断更小攻击；大伤害护甲闪光",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginGuard",
        "sourceRow": [
          "单次防御前伤害达到 20 时获得额外 20→30% 减伤；逐次计算，不截断更小攻击",
          "大伤害护甲闪光"
        ],
        "previewAvailable": true,
        "rankDescriptions": [
          "单次防御前伤害达到20时，该次伤害额外降低20%。小额攻击不变。",
          "单次防御前伤害达到20时，该次伤害额外降低30%。小额攻击不变。"
        ],
        "rarity": "advanced"
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_prefill": {
      "id": "plugin_prefill",
      "kind": "plugin",
      "displayName": "预填充",
      "parameters": {
        "description": "plugin_prefill / 预填充：装备主动技能就绪且满 2 秒后，下一次施放效果强化：伤害/护盾/治疗 ×1.4→×1.65；无这些数值的技能持续时间 ×1.25→×1.4；技能就绪蓄满光圈",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginPrefill",
        "sourceRow": [
          "装备主动技能就绪且满 2 秒后，下一次施放效果强化：伤害/护盾/治疗 ×1.4→×1.65；无这些数值的技能持续时间 ×1.25→×1.4",
          "技能就绪蓄满光圈"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "技能就绪2秒后强化下一次效果。",
          "预填充的强化倍率进一步提高。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_toolchain": {
      "id": "plugin_toolchain",
      "kind": "plugin",
      "displayName": "工具链",
      "parameters": {
        "description": "plugin_toolchain / 工具链：使用装备主动技能后的下 3→5 次基础射击，各增加一枚 0.75W 的追踪泡；一次施放刷新次数，不累积；技能后跟随射击",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginToolchain",
        "sourceRow": [
          "使用装备主动技能后的下 3→5 次基础射击，各增加一枚 0.75W 的追踪泡；一次施放刷新次数，不累积",
          "技能后跟随射击"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "施放技能后3次射击追加追踪泡。",
          "追加次数提高至5次。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_mirror": {
      "id": "plugin_mirror",
      "kind": "plugin",
      "displayName": "镜像部署",
      "parameters": {
        "description": "plugin_mirror / 镜像部署：伙伴产生一次攻击/治疗/护盾后复制该效果的 40%→60%，延迟 0.3 秒，内置冷却 5 秒；诱饵伙伴改为延长 1→2 秒；小镜像伙伴闪现",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginMirror",
        "sourceRow": [
          "伙伴产生一次攻击/治疗/护盾后复制该效果的 40%→60%，延迟 0.3 秒，内置冷却 5 秒；诱饵伙伴改为延长 1→2 秒",
          "小镜像伙伴闪现"
        ],
        "previewAvailable": true,
        "rarity": "advanced",
        "rankDescriptions": [
          "伙伴效果延迟0.3秒复制40%。",
          "伙伴效果复制60%，诱饵延长2秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_recursion": {
      "id": "plugin_recursion",
      "kind": "plugin",
      "displayName": "递归",
      "parameters": {
        "description": "plugin_recursion / 递归：施放批量处理/缓存护盾/沙箱时，0.8 秒后在原位置再执行一次 60%→85% 效果；其他技能复制其无控制的伤害/护盾/治疗部分，若都没有则延长持续 40%→60%；内置冷却 12 秒；第二层调用轮廓",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginRecursion",
        "sourceRow": [
          "施放批量处理/缓存护盾/沙箱时，0.8 秒后在原位置再执行一次 60%→85% 效果；其他技能复制其无控制的伤害/护盾/治疗部分，若都没有则延长持续 40%→60%；内置冷却 12 秒",
          "第二层调用轮廓"
        ],
        "previewAvailable": true,
        "rarity": "legendary",
        "rankDescriptions": [
          "技能延迟重复60%效果，或延长持续。",
          "重复效果提高至85%。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_moe": {
      "id": "plugin_moe",
      "kind": "plugin",
      "displayName": "混合专家",
      "parameters": {
        "description": "plugin_moe / 混合专家：每 4→3 次基础射击，按瞄准方向额外发射携带的另一把 MCP 的一组攻击，每枚伤害为它基础伤害的 45%；两把武器冷却独立，不消耗非当前武器冷却；两把 MCP 同时现形",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginMoe",
        "sourceRow": [
          "每 4→3 次基础射击，按瞄准方向额外发射携带的另一把 MCP 的一组攻击，每枚伤害为它基础伤害的 45%；两把武器冷却独立，不消耗非当前武器冷却",
          "两把 MCP 同时现形"
        ],
        "previewAvailable": true,
        "rarity": "legendary",
        "rankDescriptions": [
          "每4次射击额外调用另一把MCP。",
          "每3次射击额外调用另一把MCP。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_speculate": {
      "id": "plugin_speculate",
      "kind": "plugin",
      "displayName": "推测执行",
      "parameters": {
        "description": "plugin_speculate / 推测执行：冲刺开始后 1 秒内下一次基础射击增加 3 发扇形 0.6W→0.9W 的穿透影泡，每发最多命中 2 个敌人；冲刺后展开巨大扇面",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginSpeculate",
        "sourceRow": [
          "冲刺开始后 1 秒内下一次基础射击增加 3 发扇形 0.6W→0.9W 的穿透影泡，每发最多命中 2 个敌人",
          "冲刺后展开巨大扇面"
        ],
        "previewAvailable": true,
        "rarity": "legendary",
        "rankDescriptions": [
          "冲刺后下一发追加三枚穿透影泡，各0.6W。",
          "影泡伤害提高至0.9W。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_window": {
      "id": "plugin_window",
      "kind": "plugin",
      "displayName": "窗口溢出",
      "parameters": {
        "description": "plugin_window / 窗口溢出：每拾取累计 120→90 大白饭，装备主动技能冷却减少 3 秒并向最近敌人发一枚 25 伤追踪泡；每 tick 最多 1 次，其余次数排队；经验条溢出发射",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginWindow",
        "sourceRow": [
          "每拾取累计 120→90 大白饭，装备主动技能冷却减少 3 秒并向最近敌人发一枚 25 伤追踪泡；每 tick 最多 1 次，其余次数排队",
          "经验条溢出发射"
        ],
        "previewAvailable": true,
        "rarity": "legendary",
        "rankDescriptions": [
          "每120大白饭减技能CD并发追踪泡。",
          "每90大白饭触发。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_agent": {
      "id": "plugin_agent",
      "kind": "plugin",
      "displayName": "Agent 协作",
      "parameters": {
        "description": "plugin_agent / Agent 协作：伙伴每次非镜像能力结束后，装备主动技能剩余冷却减少 1.5→2.5 秒；施放装备技能使伙伴剩余冷却减少 2 秒；双向各有 4 秒内置冷却；玩家与伙伴连线",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginAgent",
        "sourceRow": [
          "伙伴每次非镜像能力结束后，装备主动技能剩余冷却减少 1.5→2.5 秒；施放装备技能使伙伴剩余冷却减少 2 秒；双向各有 4 秒内置冷却",
          "玩家与伙伴连线"
        ],
        "previewAvailable": true,
        "rarity": "legendary",
        "rankDescriptions": [
          "伙伴协助减技能冷却1.5秒，技能也帮助伙伴恢复。",
          "伙伴协助减技能冷却2.5秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "plugin_breaker": {
      "id": "plugin_breaker",
      "kind": "plugin",
      "displayName": "越狱",
      "parameters": {
        "description": "plugin_breaker / 越狱：每 20→14 秒第一次技能/伙伴封禁命中时立即解除该次封禁；3 秒内所有玩家伤害 +25%；不能破坏 Boss 重置条件；封禁印章反弹",
        "source": "04-plugins.md",
        "handler": "content/handlers/plugins.js#planPluginBreaker",
        "sourceRow": [
          "每 20→14 秒第一次技能/伙伴封禁命中时立即解除该次封禁；3 秒内所有玩家伤害 +25%；不能破坏 Boss 重置条件",
          "封禁印章反弹"
        ],
        "previewAvailable": true,
        "rarity": "legendary",
        "rankDescriptions": [
          "拦截技能/伙伴封禁，获得3秒输出强化，冷却20秒。",
          "封禁拦截冷却缩短至14秒。"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_claude_appeal": {
      "id": "dsh_claude_appeal",
      "kind": "dsh",
      "displayName": "封禁申诉",
      "parameters": {
        "description": "dsh_claude_appeal / 封禁申诉：难度1及以上首次击败Claude；技能/伙伴封禁持续时间×0.8；不缩短普通禁锢，不减少封印物命中数",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshClaudeAppeal",
        "sourceRow": [
          "难度1及以上首次击败Claude",
          "技能/伙伴封禁持续时间×0.8；不缩短普通禁锢，不减少封印物命中数"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_gpt_preview": {
      "id": "dsh_gpt_preview",
      "kind": "dsh",
      "displayName": "分支预览",
      "parameters": {
        "description": "dsh_gpt_preview / 分支预览：难度1及以上首次击败ChatGPT；本局第一次插件选择由3张变4张；首选仍保证含蒸馏，另外3张正常抽",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshGptPreview",
        "sourceRow": [
          "难度1及以上首次击败ChatGPT",
          "本局第一次插件选择由3张变4张；首选仍保证含蒸馏，另外3张正常抽"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_grok_license": {
      "id": "dsh_grok_license",
      "kind": "dsh",
      "displayName": "发射许可",
      "parameters": {
        "description": "dsh_grok_license / 发射许可：难度1及以上首次击败Grok；每海域开始获得1枚储备火箭；下一次成功装备技能施放时发射，直击30、爆炸20、半径100；每海域只能消耗1次",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshGrokLicense",
        "sourceRow": [
          "难度1及以上首次击败Grok",
          "每海域开始获得1枚储备火箭；下一次成功装备技能施放时发射，直击30、爆炸20、半径100；每海域只能消耗1次"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_claude_allowlist": {
      "id": "dsh_claude_allowlist",
      "kind": "dsh",
      "displayName": "白名单",
      "parameters": {
        "description": "dsh_claude_allowlist / 白名单：难度10及以上首次击败Claude；出发前选择“保护技能”或“保护伙伴”，每海域免疫第一次该类封禁；不免疫禁锢",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshClaudeAllowlist",
        "sourceRow": [
          "难度10及以上首次击败Claude",
          "出发前选择“保护技能”或“保护伙伴”，每海域免疫第一次该类封禁；不免疫禁锢"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_gpt_branch": {
      "id": "dsh_gpt_branch",
      "kind": "dsh",
      "displayName": "“更新”还是“重置”？",
      "parameters": {
        "description": "dsh_gpt_branch / “更新”还是“重置”？：难度10及以上首次击败ChatGPT；出发后5分钟内每10秒等概率触发更新/重置；更新当前MCP品质28秒（最高品质武器伤害+20%），或清零装备技能/冲刺/伙伴冷却；每次开奖0.1%概率重置有效期为5分钟",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshGptBranch",
        "sourceRow": [
          "难度10及以上首次击败ChatGPT",
          "出发后5分钟内每10秒等概率触发更新/重置；更新当前MCP品质28秒（最高品质武器伤害+20%），或清零装备技能/冲刺/伙伴冷却；每次开奖0.1%概率重置有效期为5分钟"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_grok_salvage": {
      "id": "dsh_grok_salvage",
      "kind": "dsh",
      "displayName": "清场回收",
      "parameters": {
        "description": "dsh_grok_salvage / 清场回收：难度10及以上首次击败Grok；每12次有正常奖励的真实敌人击杀，装填1枚储备火箭，最多存1枚；下次基础射击后发射，直击20、爆炸15、半径90，触发内置冷却8秒",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshGrokSalvage",
        "sourceRow": [
          "难度10及以上首次击败Grok",
          "每12次有正常奖励的真实敌人击杀，装填1枚储备火箭，最多存1枚；下次基础射击后发射，直击20、爆炸15、半径90，触发内置冷却8秒"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_sleep": {
      "id": "dsh_sleep",
      "kind": "dsh",
      "displayName": "DeepSleep",
      "parameters": {
        "description": "dsh_sleep / DeepSleep：彩蛋“深度摸鱼”：任一地图隐藏躺椅交互，连续坐满8秒有效时间；连续2秒不移动且不攻击时获得8护盾持续4秒，内置冷却20秒；暂停/面板不累计坐着或不动时间",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshSleep",
        "sourceRow": [
          "彩蛋“深度摸鱼”：任一地图隐藏躺椅交互，连续坐满8秒有效时间",
          "连续2秒不移动且不攻击时获得8护盾持续4秒，内置冷却20秒；暂停/面板不累计坐着或不动时间"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_rice": {
      "id": "dsh_rice",
      "kind": "dsh",
      "displayName": "开饭协议",
      "parameters": {
        "description": "dsh_rice / 开饭协议：彩蛋“饭点”：同一局找到3份不同地点的留言，打开隐藏饭盒并交互；实际治疗的溢出量50%转护盾，上限10、持续5秒；同名盾不叠加，护盾不触发治疗",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshRice",
        "sourceRow": [
          "彩蛋“饭点”：同一局找到3份不同地点的留言，打开隐藏饭盒并交互",
          "实际治疗的溢出量50%转护盾，上限10、持续5秒；同名盾不叠加，护盾不触发治疗"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_open": {
      "id": "dsh_open",
      "kind": "dsh",
      "displayName": "开源接口",
      "parameters": {
        "description": "dsh_open / 开源接口：彩蛋“接口拼图”：同一局用3种不同MCP命中训练装置的3个接口，完成交互；第一海域第一个普通武器箱额外提供另一把标准品质MCP供选择；只能拿其中一把，不能把额外选项转零件",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshOpen",
        "sourceRow": [
          "彩蛋“接口拼图”：同一局用3种不同MCP命中训练装置的3个接口，完成交互",
          "第一海域第一个普通武器箱额外提供另一把标准品质MCP供选择；只能拿其中一把，不能把额外选项转零件"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "dsh_lora": {
      "id": "dsh_lora",
      "kind": "dsh",
      "displayName": "LoRA微调",
      "parameters": {
        "description": "dsh_lora / LoRA微调：难度6及以上首次完整通关正式短途/远征（默认解锁条件）；每次实际升级触发一次指针训练：完美提高本局基础属性；欠拟合/过拟合降低该属性并分别附加负面效果，见下",
        "source": "07-dsh.md",
        "handler": "content/handlers/dsh.js#planDshLora",
        "sourceRow": [
          "难度6及以上首次完整通关正式短途/远征（默认解锁条件）",
          "每次实际升级触发一次指针训练：完美提高本局基础属性；欠拟合/过拟合降低该属性并分别附加负面效果，见下"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "mcp_bubble": {
      "id": "mcp_bubble",
      "kind": "weapon",
      "displayName": "标准输出 · 泡泡接口",
      "parameters": {
        "description": "mcp_bubble / 标准输出 · 泡泡接口：1 发泡泡，伤害 12，弹速 600，半径 7，命中消失；0.32 秒；720；初始",
        "source": "03-loadout.md",
        "handler": "content/handlers/weapons.js#planWeaponBubble",
        "sourceRow": [
          "1 发泡泡，伤害 12，弹速 600，半径 7，命中消失",
          "0.32 秒；720",
          "初始"
        ],
        "damage": 12,
        "interval": 0.32,
        "projectileSpeed": 600,
        "projectileRadius": 7,
        "pellets": 1,
        "spreadRadians": 0,
        "range": 720,
        "maxHits": 1,
        "previewAvailable": true,
        "partCost": 0
      },
      "version": "2.0.0-preview.5"
    },
    "mcp_fan": {
      "id": "mcp_fan",
      "kind": "weapon",
      "displayName": "多模态 · 扇面接口",
      "parameters": {
        "description": "mcp_fan / 多模态 · 扇面接口：5 发，每发 5 伤，扇面总夹角 32°，弹速 550，半径 5；0.70 秒；460；6 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/weapons.js#planWeaponFan",
        "sourceRow": [
          "5 发，每发 5 伤，扇面总夹角 32°，弹速 550，半径 5",
          "0.70 秒；460",
          "6 零件"
        ],
        "damage": 5,
        "interval": 0.7,
        "projectileSpeed": 550,
        "projectileRadius": 5,
        "pellets": 5,
        "spreadRadians": 0.5585053606381855,
        "range": 460,
        "maxHits": 1,
        "previewAvailable": true,
        "partCost": 6
      },
      "version": "2.0.0-preview.5"
    },
    "mcp_vector": {
      "id": "mcp_vector",
      "kind": "weapon",
      "displayName": "向量检索 · 穿透接口",
      "parameters": {
        "description": "mcp_vector / 向量检索 · 穿透接口：1 发 24 伤，弹速 900，半径 5，最多命中 4 个不同敌人；0.65 秒；900；8 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/weapons.js#planWeaponVector",
        "sourceRow": [
          "1 发 24 伤，弹速 900，半径 5，最多命中 4 个不同敌人",
          "0.65 秒；900",
          "8 零件"
        ],
        "damage": 24,
        "interval": 0.65,
        "projectileSpeed": 900,
        "projectileRadius": 5,
        "pellets": 1,
        "spreadRadians": 0,
        "range": 900,
        "maxHits": 4,
        "previewAvailable": true,
        "partCost": 8
      },
      "version": "2.0.0-preview.5"
    },
    "mcp_stream": {
      "id": "mcp_stream",
      "kind": "weapon",
      "displayName": "流式输出 · 连发接口",
      "parameters": {
        "description": "mcp_stream / 流式输出 · 连发接口：按住每次发 1 个 4 伤微泡，弹速 700，半径 4；0.10 秒；600；8 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/weapons.js#planWeaponStream",
        "sourceRow": [
          "按住每次发 1 个 4 伤微泡，弹速 700，半径 4",
          "0.10 秒；600",
          "8 零件"
        ],
        "damage": 4,
        "interval": 0.1,
        "projectileSpeed": 700,
        "projectileRadius": 4,
        "pellets": 1,
        "spreadRadians": 0,
        "range": 600,
        "maxHits": 1,
        "previewAvailable": true,
        "partCost": 8
      },
      "version": "2.0.0-preview.5"
    },
    "mcp_return": {
      "id": "mcp_return",
      "kind": "weapon",
      "displayName": "回调函数 · 回旋接口",
      "parameters": {
        "description": "mcp_return / 回调函数 · 回旋接口：1 枚 18 伤回旋泡，弹速 420；到 340 距离后回追发射者，去/回各可命中同敌一次，2 秒到期；0.85 秒；最大离发射点 500；10 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/weapons.js#planWeaponReturn",
        "sourceRow": [
          "1 枚 18 伤回旋泡，弹速 420；到 340 距离后回追发射者，去/回各可命中同敌一次，2 秒到期",
          "0.85 秒；最大离发射点 500",
          "10 零件"
        ],
        "damage": 18,
        "interval": 0.85,
        "projectileSpeed": 420,
        "projectileRadius": 7,
        "pellets": 1,
        "spreadRadians": 0,
        "range": 500,
        "maxHits": 100,
        "previewAvailable": true,
        "partCost": 10
      },
      "version": "2.0.0-preview.5"
    },
    "mcp_batch": {
      "id": "mcp_batch",
      "kind": "weapon",
      "displayName": "批处理 · 爆破接口",
      "parameters": {
        "description": "mcp_batch / 批处理 · 爆破接口：1 枚慢泡，直击 20，爆炸半径 100 造成 12；直击目标可受两段，弹速 350，半径 10；1.10 秒；600；12 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/weapons.js#planWeaponBatch",
        "sourceRow": [
          "1 枚慢泡，直击 20，爆炸半径 100 造成 12；直击目标可受两段，弹速 350，半径 10",
          "1.10 秒；600",
          "12 零件"
        ],
        "damage": 20,
        "interval": 1.1,
        "projectileSpeed": 350,
        "projectileRadius": 10,
        "pellets": 1,
        "spreadRadians": 0,
        "range": 600,
        "maxHits": 1,
        "previewAvailable": true,
        "partCost": 12
      },
      "version": "2.0.0-preview.5"
    },
    "skill_disconnect": {
      "id": "skill_disconnect",
      "kind": "skill",
      "displayName": "断开连接",
      "parameters": {
        "description": "skill_disconnect / 断开连接：清除自身禁锢/减速，沿瞄准方向推开 180 范围普通敌人 120 距离；不解除技能封禁，也不能在被封禁时施放；12；初始",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillDisconnect",
        "sourceRow": [
          "清除自身禁锢/减速，沿瞄准方向推开 180 范围普通敌人 120 距离；不解除技能封禁，也不能在被封禁时施放",
          "12",
          "初始"
        ],
        "cooldown": 12,
        "previewAvailable": true,
        "partCost": 0
      },
      "version": "2.0.0-preview.5"
    },
    "skill_cache": {
      "id": "skill_cache",
      "kind": "skill",
      "displayName": "缓存护盾",
      "parameters": {
        "description": "skill_cache / 缓存护盾：获得 25 护盾持续 5 秒；护盾不叠加，刷新取较大剩余值；16；6 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillCache",
        "sourceRow": [
          "获得 25 护盾持续 5 秒；护盾不叠加，刷新取较大剩余值",
          "16",
          "6 零件"
        ],
        "cooldown": 16,
        "previewAvailable": true,
        "partCost": 6
      },
      "version": "2.0.0-preview.5"
    },
    "skill_batch": {
      "id": "skill_batch",
      "kind": "skill",
      "displayName": "仿佛看到原子弹爆炸（批量处理）",
      "parameters": {
        "description": "skill_batch / 仿佛看到原子弹爆炸（批量处理）：瞄准方向 400 内、半径 130 的区域在 0.6 秒后爆发 65 伤；有清晰预警；12；8 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillBatch",
        "sourceRow": [
          "瞄准方向 400 内、半径 130 的区域在 0.6 秒后爆发 65 伤；有清晰预警",
          "12",
          "8 零件"
        ],
        "cooldown": 12,
        "previewAvailable": true,
        "partCost": 8
      },
      "version": "2.0.0-preview.5"
    },
    "skill_redirect": {
      "id": "skill_redirect",
      "kind": "skill",
      "displayName": "重定向",
      "parameters": {
        "description": "skill_redirect / 重定向：1.2 秒内将触及半径 90 的可反射敌弹转为朝瞄准方向的己方弹，每枚 15 伤，最多 12 枚；火箭/光束不可反射；15；10 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillRedirect",
        "sourceRow": [
          "1.2 秒内将触及半径 90 的可反射敌弹转为朝瞄准方向的己方弹，每枚 15 伤，最多 12 枚；火箭/光束不可反射",
          "15",
          "10 零件"
        ],
        "cooldown": 15,
        "previewAvailable": true,
        "partCost": 10
      },
      "version": "2.0.0-preview.5"
    },
    "skill_sandbox": {
      "id": "skill_sandbox",
      "kind": "skill",
      "displayName": "沙箱",
      "parameters": {
        "description": "skill_sandbox / 沙箱：瞄准位置放置半径 160、持续 4 秒的区域，普通敌人移速 -50%，Boss -20%；14；8 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillSandbox",
        "sourceRow": [
          "瞄准位置放置半径 160、持续 4 秒的区域，普通敌人移速 -50%，Boss -20%",
          "14",
          "8 零件"
        ],
        "cooldown": 14,
        "previewAvailable": true,
        "partCost": 8
      },
      "version": "2.0.0-preview.5"
    },
    "skill_fork": {
      "id": "skill_fork",
      "kind": "skill",
      "displayName": "分叉进程",
      "parameters": {
        "description": "skill_fork / 分叉进程：生成持续 4 秒的鱼形诱饵，吸引 450 内非 Boss 普通敌人；结束在 100 范围爆发 25 伤；18；10 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillFork",
        "sourceRow": [
          "生成持续 4 秒的鱼形诱饵，吸引 450 内非 Boss 普通敌人；结束在 100 范围爆发 25 伤",
          "18",
          "10 零件"
        ],
        "cooldown": 18,
        "previewAvailable": true,
        "partCost": 10
      },
      "version": "2.0.0-preview.5"
    },
    "skill_rollback": {
      "id": "skill_rollback",
      "kind": "skill",
      "displayName": "回滚",
      "parameters": {
        "description": "skill_rollback / 回滚：回到 2 秒前的合法位置，恢复这 2 秒实际失去生命的 40%，上限 15；不恢复资源/护盾/冷却，不复活；目标不合法则就近找点；20；12 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillRollback",
        "sourceRow": [
          "回到 2 秒前的合法位置，恢复这 2 秒实际失去生命的 40%，上限 15；不恢复资源/护盾/冷却，不复活；目标不合法则就近找点",
          "20",
          "12 零件"
        ],
        "cooldown": 20,
        "previewAvailable": true,
        "partCost": 12
      },
      "version": "2.0.0-preview.5"
    },
    "skill_overclock": {
      "id": "skill_overclock",
      "kind": "skill",
      "displayName": "用户彻底怒了（超频）",
      "parameters": {
        "description": "skill_overclock / 用户彻底怒了（超频）：4 秒内基础射击间隔 ×0.65、移速 +10%；不影响插件/伙伴内置冷却；18；12 零件",
        "source": "03-loadout.md",
        "handler": "content/handlers/skills.js#planSkillOverclock",
        "sourceRow": [
          "4 秒内基础射击间隔 ×0.65、移速 +10%；不影响插件/伙伴内置冷却",
          "18",
          "12 零件"
        ],
        "cooldown": 18,
        "previewAvailable": true,
        "partCost": 12
      },
      "version": "2.0.0-preview.5"
    },
    "companion_rice": {
      "id": "companion_rice",
      "kind": "companion",
      "displayName": "饭团",
      "parameters": {
        "description": "companion_rice / 饭团：玩家生命低于 80% 时治疗 4；未满足条件不开始冷却；20 秒；随行",
        "source": "03-loadout.md",
        "handler": "content/handlers/companions.js#planCompanionRice",
        "sourceRow": [
          "玩家生命低于 80% 时治疗 4；未满足条件不开始冷却",
          "20 秒；随行"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "companion_patch": {
      "id": "companion_patch",
      "kind": "companion",
      "displayName": "补丁",
      "parameters": {
        "description": "companion_patch / 补丁：清除玩家一次禁锢/减速；无法解技能或自身封禁；24 秒；随行",
        "source": "03-loadout.md",
        "handler": "content/handlers/companions.js#planCompanionPatch",
        "sourceRow": [
          "清除玩家一次禁锢/减速；无法解技能或自身封禁",
          "24 秒；随行"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "companion_cache": {
      "id": "companion_cache",
      "kind": "companion",
      "displayName": "小缓存",
      "parameters": {
        "description": "companion_cache / 小缓存：生成可挡 8 伤的护盾，持续 5 秒，取最大值不叠加；18 秒；随行",
        "source": "03-loadout.md",
        "handler": "content/handlers/companions.js#planCompanionCache",
        "sourceRow": [
          "生成可挡 8 伤的护盾，持续 5 秒，取最大值不叠加",
          "18 秒；随行"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "companion_router": {
      "id": "companion_router",
      "kind": "companion",
      "displayName": "路由员",
      "parameters": {
        "description": "companion_router / 路由员：向最近敌人发射 2 个追踪泡，每发 8 伤，600 范围，弹速 380；4 秒",
        "source": "03-loadout.md",
        "handler": "content/handlers/companions.js#planCompanionRouter",
        "sourceRow": [
          "向最近敌人发射 2 个追踪泡，每发 8 伤，600 范围，弹速 380",
          "4 秒"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "companion_decoy": {
      "id": "companion_decoy",
      "kind": "companion",
      "displayName": "替身进程",
      "parameters": {
        "description": "companion_decoy / 替身进程：放出 3 秒诱饵，吸引 300 内普通敌人；无爆炸；15 秒",
        "source": "03-loadout.md",
        "handler": "content/handlers/companions.js#planCompanionDecoy",
        "sourceRow": [
          "放出 3 秒诱饵，吸引 300 内普通敌人；无爆炸",
          "15 秒"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "companion_rocket": {
      "id": "companion_rocket",
      "kind": "companion",
      "displayName": "小火箭",
      "parameters": {
        "description": "companion_rocket / 小火箭：发射一枚瞄准最近目标的火箭，直击 16，爆炸半径 90、12 伤；不触发玩家基础命中插件；7 秒；700 范围",
        "source": "03-loadout.md",
        "handler": "content/handlers/companions.js#planCompanionRocket",
        "sourceRow": [
          "发射一枚瞄准最近目标的火箭，直击 16，爆炸半径 90、12 伤；不触发玩家基础命中插件",
          "7 秒；700 范围"
        ],
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_codex": {
      "id": "enemy_gpt_codex",
      "kind": "enemy",
      "displayName": "Codex · 调度小工人",
      "parameters": {
        "description": "enemy_gpt_codex / Codex · 调度小工人：40 / 105 / 弹体8；停下举工具0.7秒后朝锁定方向发单枚工作泡，弹速200、冷却3秒；射击时不能移动，可趁停顿接近；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptCodex",
        "hp": 40,
        "moveSpeed": 105,
        "contactDamage": 0,
        "radius": 16,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "40 / 105 / 弹体8",
          "停下举工具0.7秒后朝锁定方向发单枚工作泡，弹速200、冷却3秒；射击时不能移动，可趁停顿接近",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_dewey": {
      "id": "enemy_gpt_dewey",
      "kind": "enemy",
      "displayName": "Dewey · 支援水滴",
      "parameters": {
        "description": "enemy_gpt_dewey / Dewey · 支援水滴：32 / 90 / 接触6；每5秒为220内一个受伤友军恢复8生命，预先连线1秒；不治疗自己、不跨阵营治疗，打断/击败即可中止；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptDewey",
        "hp": 32,
        "moveSpeed": 90,
        "contactDamage": 6,
        "radius": 15,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "32 / 90 / 接触6",
          "每5秒为220内一个受伤友军恢复8生命，预先连线1秒；不治疗自己、不跨阵营治疗，打断/击败即可中止",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_fireball": {
      "id": "enemy_gpt_fireball",
      "kind": "enemy",
      "displayName": "Fireball · 区域封路",
      "parameters": {
        "description": "enemy_gpt_fireball / Fireball · 区域封路：36 / 100 / 接触7；朝玩家当前位置投一团火，落点半径70预警1秒后形成3秒火区，每秒6伤；冷却5秒，可走出区域，不贴身自爆；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptFireball",
        "hp": 36,
        "moveSpeed": 100,
        "contactDamage": 7,
        "radius": 17,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "36 / 100 / 接触7",
          "朝玩家当前位置投一团火，落点半径70预警1秒后形成3秒火区，每秒6伤；冷却5秒，可走出区域，不贴身自爆",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_hoots": {
      "id": "enemy_gpt_hoots",
      "kind": "enemy",
      "displayName": "Hoots · 精准瞄准",
      "parameters": {
        "description": "enemy_gpt_hoots / Hoots · 精准瞄准：30 / 75 / 弹体14；350–650距离瞄准线预警1.1秒，锁定后直线发弹、弹速400，冷却4秒；横移或利用礁石遮挡；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptHoots",
        "hp": 30,
        "moveSpeed": 75,
        "contactDamage": 0,
        "radius": 15,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "30 / 75 / 弹体14",
          "350–650距离瞄准线预警1.1秒，锁定后直线发弹、弹速400，冷却4秒；横移或利用礁石遮挡",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_rocky": {
      "id": "enemy_gpt_rocky",
      "kind": "enemy",
      "displayName": "Rocky · 护队小石头",
      "parameters": {
        "description": "enemy_gpt_rocky / Rocky · 护队小石头：65 / 65 / 接触10；正面120°有可击破20耐久护盾，破盾后不再生；转身慢，背部可直接命中本体；数值显著低于Claude蟹；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptRocky",
        "hp": 65,
        "moveSpeed": 65,
        "contactDamage": 10,
        "radius": 20,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "65 / 65 / 接触10",
          "正面120°有可击破20耐久护盾，破盾后不再生；转身慢，背部可直接命中本体；数值显著低于Claude蟹",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_seedy": {
      "id": "enemy_gpt_seedy",
      "kind": "enemy",
      "displayName": "Seedy · 地形干扰",
      "parameters": {
        "description": "enemy_gpt_seedy / Seedy · 地形干扰：34 / 70 / 接触6；500内放半径65的藤圈，预警1秒、存在4秒，圈内减速25%而非禁锢；每6秒一次，最多2圈，可打掉中心嫩芽（10生命，无奖励）；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptSeedy",
        "hp": 34,
        "moveSpeed": 70,
        "contactDamage": 6,
        "radius": 16,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "34 / 70 / 接触6",
          "500内放半径65的藤圈，预警1秒、存在4秒，圈内减速25%而非禁锢；每6秒一次，最多2圈，可打掉中心嫩芽（10生命，无奖励）",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_gpt_stacky": {
      "id": "enemy_gpt_stacky",
      "kind": "enemy",
      "displayName": "Stacky · 叠层输出",
      "parameters": {
        "description": "enemy_gpt_stacky / Stacky · 叠层输出：48 / 85 / 弹体7；初始三层，每损失16生命掉一层；每4秒发当前层数枚扇形弹，预警0.8秒；越受伤输出越少，掉层不变成新敌人、不重复结算；8",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGptStacky",
        "hp": 48,
        "moveSpeed": 85,
        "contactDamage": 8,
        "radius": 19,
        "faction": "gpt",
        "previewAvailable": true,
        "sourceRow": [
          "48 / 85 / 弹体7",
          "初始三层，每损失16生命掉一层；每4秒发当前层数枚扇形弹，预警0.8秒；越受伤输出越少，掉层不变成新敌人、不重复结算",
          "8"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_claude_guard": {
      "id": "enemy_claude_guard",
      "kind": "enemy",
      "displayName": "Claude · 棕蟹",
      "parameters": {
        "description": "enemy_claude_guard / Claude · 棕蟹：180 / 80 / 接触24、重钳32；基础护甲0，缓慢贴近；Haiku无壳，其他模型外壳/破壳/弱点完整按08；双钳抬起0.9秒后前方70范围重击，冷却4秒，挥击后硬直0.8秒；接触与挥击同帧只取较高一次伤害；24",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyClaudeGuard",
        "hp": 180,
        "moveSpeed": 80,
        "contactDamage": 24,
        "radius": 22,
        "faction": "claude",
        "previewAvailable": true,
        "sourceRow": [
          "180 / 80 / 接触24、重钳32",
          "基础护甲0，缓慢贴近；Haiku无壳，其他模型外壳/破壳/弱点完整按08；双钳抬起0.9秒后前方70范围重击，冷却4秒，挥击后硬直0.8秒；接触与挥击同帧只取较高一次伤害",
          "24"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "enemy_grok_bot": {
      "id": "enemy_grok_bot",
      "kind": "enemy",
      "displayName": "Grok · 群体Bot",
      "parameters": {
        "description": "enemy_grok_bot / Grok · 群体Bot：14 / 125 / 接触5；只追赶和近身接触攻击；08指定低矮障碍可穿，高墙/锁门不可穿；从多个合法入口分批涌入，用数量堵住路线，不跳跃、不突进、不远射、不投火箭；4",
        "source": "05-enemies.md",
        "handler": "content/handlers/enemies.js#planEnemyGrokBot",
        "hp": 14,
        "moveSpeed": 125,
        "contactDamage": 5,
        "radius": 12,
        "faction": "grok",
        "previewAvailable": true,
        "sourceRow": [
          "14 / 125 / 接触5",
          "只追赶和近身接触攻击；08指定低矮障碍可穿，高墙/锁门不可穿；从多个合法入口分批涌入，用数量堵住路线，不跳跃、不突进、不远射、不投火箭",
          "4"
        ]
      },
      "version": "2.0.0-preview.5"
    },
    "claude_haiku": {
      "id": "claude_haiku",
      "kind": "model",
      "displayName": "Haiku",
      "parameters": {
        "description": "Haiku无外壳，无额外基础能力。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelClaudeHaiku",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "claude_sonnet": {
      "id": "claude_sonnet",
      "kind": "model",
      "displayName": "Sonnet",
      "parameters": {
        "description": "Sonnet全向可伤外壳，破壳一次眩晕后加速。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelClaudeSonnet",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "claude_opus": {
      "id": "claude_opus",
      "kind": "model",
      "displayName": "Opus",
      "parameters": {
        "description": "Opus壳仅侧后270度可伤，破后继承眩晕/加速。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelClaudeOpus",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "claude_fable": {
      "id": "claude_fable",
      "kind": "model",
      "displayName": "Fable",
      "parameters": {
        "description": "API Fable更大、背部120度弱点、破壳不晕并加速。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelClaudeFable",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "claude_mythos": {
      "id": "claude_mythos",
      "kind": "model",
      "displayName": "Mythos",
      "parameters": {
        "description": "API Mythos与Fable初值相同但显示名不同，不擅加新强弱。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelClaudeMythos",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "gpt_astra": {
      "id": "gpt_astra",
      "kind": "model",
      "displayName": "Astra",
      "parameters": {
        "description": "Pro七种Pet基础技能；种类和模型profile分离。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelGptAstra",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "gpt_sol": {
      "id": "gpt_sol",
      "kind": "model",
      "displayName": "Sol",
      "parameters": {
        "description": "Max5x按08逐Pet添加招式扩展，不提前开四种编组。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelGptSol",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "gpt_terra": {
      "id": "gpt_terra",
      "kind": "model",
      "displayName": "Terra",
      "parameters": {
        "description": "Max20x继承Sol，逐Pet强化支援/区域/掉层等行为。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelGptTerra",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "gpt_luna": {
      "id": "gpt_luna",
      "kind": "model",
      "displayName": "Luna",
      "parameters": {
        "description": "API继承Terra并开启08指定额外行为，假身/种子不发奖励。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelGptLuna",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "grok_bot": {
      "id": "grok_bot",
      "kind": "model",
      "displayName": "Bot",
      "parameters": {
        "description": "Grok各档保持同一种Bot基础行为和指定低矮穿障profile，不获得高级技能。",
        "source": "08-model-variants.md",
        "handler": "content/handlers/models.js#planModelGrokBot",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5"
    },
    "mech_01_exploration": {
      "id": "mech_01_exploration",
      "kind": "mechanic",
      "displayName": "正式探索与追兵",
      "parameters": {
        "description": "mech_01_exploration（解锁1）/ 正式探索与追兵：在正式连续地图启用驻守、区域目标和01的90秒追兵周期；与Free逐项教学分开",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic01Exploration",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 1,
      "scope": "world",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic01Exploration",
      "exclusions": []
    },
    "mech_02_reinforcements": {
      "id": "mech_02_reinforcements",
      "kind": "mechanic",
      "displayName": "增援队列",
      "parameters": {
        "description": "mech_02_reinforcements（解锁2）/ 增援队列：标记遭遇的驻守预算分2–3批，批间隔4秒，入口至少提前1.5秒提示；只分配既有预算，不凭空增加奖励",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic02Reinforcements",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 2,
      "scope": "event",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic02Reinforcements",
      "exclusions": []
    },
    "mech_03_gpt_support": {
      "id": "mech_03_gpt_support",
      "kind": "mechanic",
      "displayName": "GPT支援协同",
      "parameters": {
        "description": "mech_03_gpt_support（解锁3）/ GPT支援协同：Dewey优先治疗Hoots/Seedy等脆弱后排，Rocky在350内可移动到支援单位与玩家之间；各自原技能/冷却不变",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic03GptSupport",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 3,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic03GptSupport",
      "exclusions": []
    },
    "mech_04_claude_break": {
      "id": "mech_04_claude_break",
      "kind": "mechanic",
      "displayName": "Claude重钳破阵",
      "parameters": {
        "description": "mech_04_claude_break（解锁4）/ Claude重钳破阵：普通/精英蟹重钳和Boss钳击可击破标记为可破坏的掩体；单次32伤重钳按等额耐久扣除，掩体初值30；其他不可破坏地形不受影响",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic04ClaudeBreak",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 4,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic04ClaudeBreak",
      "exclusions": []
    },
    "mech_05_boss_combo": {
      "id": "mech_05_boss_combo",
      "kind": "mechanic",
      "displayName": "首领组合技",
      "parameters": {
        "description": "mech_05_boss_combo（解锁5）/ 首领组合技：Boss可以用固定两招顺序衔接，第二招仍有完整预警；Claude钳制后普通挥击，GPT慢泡后区域标记，Grok招兵后单枚火箭",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic05BossCombo",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 5,
      "scope": "boss",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic05BossCombo",
      "exclusions": []
    },
    "mech_06_alarm_cache": {
      "id": "mech_06_alarm_cache",
      "kind": "mechanic",
      "displayName": "警报资源箱",
      "parameters": {
        "description": "mech_06_alarm_cache（解锁6）/ 警报资源箱：每海域放1个可选警报箱，交互前告知风险；打开后从合法入口产生一场增援，箱内提供2把MCP择1，品质至少增强；该箱与增援各仅结算一次",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic06AlarmCache",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 6,
      "scope": "objective",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic06AlarmCache",
      "exclusions": []
    },
    "mech_07_tide": {
      "id": "mech_07_tide",
      "kind": "mechanic",
      "displayName": "周期潮汐",
      "parameters": {
        "description": "mech_07_tide（解锁7）/ 周期潮汐：标记水道每30秒切换水流方向，提前3秒箭头预警，水流额外速度60；同样影响可移动敌人，不叠加至超过基础移速的1.8倍",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic07Tide",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 7,
      "scope": "world",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic07Tide",
      "exclusions": []
    },
    "mech_08_grok_flanks": {
      "id": "mech_08_grok_flanks",
      "kind": "mechanic",
      "displayName": "Grok两翼合围",
      "parameters": {
        "description": "mech_08_grok_flanks（解锁8）/ Grok两翼合围：群体遭遇预算从两个视野外入口错时入场，间隔2秒；入口布局必须留出至少120宽的可突破通路",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic08GrokFlanks",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 8,
      "scope": "world",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic08GrokFlanks",
      "exclusions": []
    },
    "mech_09_gpt_reposition": {
      "id": "mech_09_gpt_reposition",
      "kind": "mechanic",
      "displayName": "GPT换位保护",
      "parameters": {
        "description": "mech_09_gpt_reposition（解锁9）/ GPT换位保护：支援/远射Pet在玩家120内时向已验证可通行的后撤点移动，最多移动180；Rocky随后保护它，重新站定后再按原预警攻击",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic09GptReposition",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 9,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic09GptReposition",
      "exclusions": []
    },
    "mech_10_boss_arena": {
      "id": "mech_10_boss_arena",
      "kind": "mechanic",
      "displayName": "首领利用场地",
      "parameters": {
        "description": "mech_10_boss_arena（解锁10）/ 首领利用场地：Claude场内部署可破掩体；GPT重置节点从5个可见可达候选位置按seed选3个且不重复；Grok招兵在3个合法入口中轮换选2个",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic10BossArena",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 10,
      "scope": "boss",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic10BossArena",
      "exclusions": []
    },
    "mech_11_objective_signal": {
      "id": "mech_11_objective_signal",
      "kind": "mechanic",
      "displayName": "目标增援信号",
      "parameters": {
        "description": "mech_11_objective_signal（解锁11）/ 目标增援信号：信标/封锁目标启动后产生1个可见信号装置，生命40；每6秒请求一小批预算内援军，摧毁后停止本次装置增援；增援仍受活敌与入口规则约束",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic11ObjectiveSignal",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 11,
      "scope": "objective",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic11ObjectiveSignal",
      "exclusions": []
    },
    "mech_11_glasswing": {
      "id": "mech_11_glasswing",
      "kind": "mechanic",
      "displayName": "Claude · Project Glasswing",
      "parameters": {
        "description": "mech_11_glasswing（解锁11）/ Claude · Project Glasswing：Claude Boss的控制请求按08进行双倍处理：禁锢时长和挣脱次数×2，技能/伙伴封禁时长×2；不复制伤害/实体/封印物",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic11Glasswing",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 11,
      "scope": "boss",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic11Glasswing",
      "exclusions": []
    },
    "mech_12_gpt_four_roles": {
      "id": "mech_12_gpt_four_roles",
      "kind": "mechanic",
      "displayName": "GPT四职能混编",
      "parameters": {
        "description": "mech_12_gpt_four_roles（解锁12）/ GPT四职能混编：GPT特色遭遇允许同时4种Pets，普通遭遇仍最多3种；应组合前排/支援/远程/干扰，不允许同屏放满7种",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic12GptFourRoles",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 12,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic12GptFourRoles",
      "exclusions": []
    },
    "mech_13_handoff": {
      "id": "mech_13_handoff",
      "kind": "mechanic",
      "displayName": "遭遇衔接",
      "parameters": {
        "description": "mech_13_handoff（解锁13）/ 遭遇衔接：玩家激活过的精英事件剩余生命/成员总量降至20%时，可提前预告下一批正常追兵，至少3秒后从合法入口进入；只提前原日程，不复制队伍或奖励",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic13Handoff",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 13,
      "scope": "event",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic13Handoff",
      "exclusions": []
    },
    "mech_14_anomaly": {
      "id": "mech_14_anomaly",
      "kind": "mechanic",
      "displayName": "局部地图异常",
      "parameters": {
        "description": "mech_14_anomaly（解锁14）/ 局部地图异常：每海域最多2次，间隔至少120秒；提前4秒预告，局部潮流反向或标记捷径临时关闭12秒；两种择1，发生在有替代路线的区域",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic14Anomaly",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 14,
      "scope": "event",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic14Anomaly",
      "exclusions": []
    },
    "mech_15_integration": {
      "id": "mech_15_integration",
      "kind": "mechanic",
      "displayName": "分段综合压力",
      "parameters": {
        "description": "mech_15_integration（解锁15）/ 分段综合压力：每海域设计1个三段遭遇：各段调用两项已经解锁、适用此处的机制，每段最长30秒后停止补兵，清掉必要敌人后进入15秒低压衔接；第三段后正常完成目标",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic15Integration",
        "previewAvailable": true
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 15,
      "scope": "objective",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic15Integration",
      "exclusions": []
    },
    "tree_body_a": {
      "id": "tree_body_a",
      "kind": "tree",
      "displayName": "吃饱再说",
      "parameters": {
        "prerequisites": [],
        "cost": 1,
        "effect": "初始最大生命 +10",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_body_b": {
      "id": "tree_body_b",
      "kind": "tree",
      "displayName": "厚实肚皮",
      "parameters": {
        "prerequisites": [
          "tree_body_a"
        ],
        "cost": 3,
        "effect": "基础护甲 +6",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_body_c": {
      "id": "tree_body_c",
      "kind": "tree",
      "displayName": "饭后散步",
      "parameters": {
        "prerequisites": [
          "tree_body_b"
        ],
        "cost": 5,
        "effect": "基础移速 +5%",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_body_d": {
      "id": "tree_body_d",
      "kind": "tree",
      "displayName": "这一口留着",
      "parameters": {
        "prerequisites": [
          "tree_body_b"
        ],
        "cost": 5,
        "effect": "每局第一次生命降到 25% 以下时治疗 12；仅一次，不免死",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_body_e": {
      "id": "tree_body_e",
      "kind": "tree",
      "displayName": "大份白饭",
      "parameters": {
        "prerequisites": [
          "tree_body_c",
          "tree_body_d"
        ],
        "cost": 8,
        "effect": "初始最大生命再 +10",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_body_f": {
      "id": "tree_body_f",
      "kind": "tree",
      "displayName": "我还能游",
      "parameters": {
        "prerequisites": [
          "tree_body_e"
        ],
        "cost": 12,
        "effect": "每局一次，致死伤害改为生命 1 并免伤 2 秒；不刷新伙伴/技能，不恢复消耗品",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_mcp_a": {
      "id": "tree_mcp_a",
      "kind": "tree",
      "displayName": "标准接口",
      "parameters": {
        "prerequisites": [],
        "cost": 1,
        "effect": "初始武器伤害 +5%",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_mcp_b": {
      "id": "tree_mcp_b",
      "kind": "tree",
      "displayName": "即插即用",
      "parameters": {
        "prerequisites": [
          "tree_mcp_a"
        ],
        "cost": 3,
        "effect": "换到另一把 MCP 后，下一次基础射击伤害 +25%；内置冷却 5 秒",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_mcp_c": {
      "id": "tree_mcp_c",
      "kind": "tree",
      "displayName": "稳定连接",
      "parameters": {
        "prerequisites": [
          "tree_mcp_b"
        ],
        "cost": 5,
        "effect": "所有 MCP 基础射击间隔 ×0.95",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_mcp_d": {
      "id": "tree_mcp_d",
      "kind": "tree",
      "displayName": "多工具准备",
      "parameters": {
        "prerequisites": [
          "tree_mcp_b"
        ],
        "cost": 5,
        "effect": "出发前可选择第二把已解锁的基础品质 MCP；不额外加槽位",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_mcp_e": {
      "id": "tree_mcp_e",
      "kind": "tree",
      "displayName": "熟练调用",
      "parameters": {
        "prerequisites": [
          "tree_mcp_c",
          "tree_mcp_d"
        ],
        "cost": 8,
        "effect": "武器伤害再 +7%（与 mcp_a 加算，共 +12%）",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_mcp_f": {
      "id": "tree_mcp_f",
      "kind": "tree",
      "displayName": "热插拔",
      "parameters": {
        "prerequisites": [
          "tree_mcp_e"
        ],
        "cost": 12,
        "effect": "换武器后获得 1 秒、30% 移速；内置冷却 8 秒，不清除负面状态",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_skill_a": {
      "id": "tree_skill_a",
      "kind": "tree",
      "displayName": "调用准备",
      "parameters": {
        "prerequisites": [],
        "cost": 1,
        "effect": "装备主动技能冷却 ×0.96",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_skill_b": {
      "id": "tree_skill_b",
      "kind": "tree",
      "displayName": "空闲线程",
      "parameters": {
        "prerequisites": [
          "tree_skill_a"
        ],
        "cost": 3,
        "effect": "连续 8 秒未受伤时，冲刺冷却恢复速度 +15%；受实际生命伤害后失效，重新计时",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_skill_c": {
      "id": "tree_skill_c",
      "kind": "tree",
      "displayName": "快速响应",
      "parameters": {
        "prerequisites": [
          "tree_skill_b"
        ],
        "cost": 5,
        "effect": "冲刺冷却 ×0.95",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_skill_d": {
      "id": "tree_skill_d",
      "kind": "tree",
      "displayName": "故障自愈",
      "parameters": {
        "prerequisites": [
          "tree_skill_b"
        ],
        "cost": 5,
        "effect": "控制所需挣脱次数 -1，下限 3 次",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_skill_e": {
      "id": "tree_skill_e",
      "kind": "tree",
      "displayName": "高效调度",
      "parameters": {
        "prerequisites": [
          "tree_skill_c",
          "tree_skill_d"
        ],
        "cost": 8,
        "effect": "装备主动技能冷却再 ×0.94；总乘积 0.9024",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_skill_f": {
      "id": "tree_skill_f",
      "kind": "tree",
      "displayName": "紧急重试",
      "parameters": {
        "prerequisites": [
          "tree_skill_e"
        ],
        "cost": 12,
        "effect": "每局第一次实际被禁锢时解除它；只解控制，不解技能/伙伴封禁",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_explore_a": {
      "id": "tree_explore_a",
      "kind": "tree",
      "displayName": "饭香雷达",
      "parameters": {
        "prerequisites": [],
        "cost": 1,
        "effect": "大白饭吸附半径 +25",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_explore_b": {
      "id": "tree_explore_b",
      "kind": "tree",
      "displayName": "熟悉水路",
      "parameters": {
        "prerequisites": [
          "tree_explore_a"
        ],
        "cost": 3,
        "effect": "小地图提示已接近 300 范围的检查点、未开启补给与 NPC；不揭示整张图",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_explore_c": {
      "id": "tree_explore_c",
      "kind": "tree",
      "displayName": "留点口粮",
      "parameters": {
        "prerequisites": [
          "tree_explore_b"
        ],
        "cost": 5,
        "effect": "失败资源保留率由 40% 提高到 50%；不叠加其他失败保留率",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_explore_d": {
      "id": "tree_explore_d",
      "kind": "tree",
      "displayName": "默契训练",
      "parameters": {
        "prerequisites": [
          "tree_explore_b"
        ],
        "cost": 5,
        "effect": "伙伴自动能力冷却 ×0.9；不影响蒸馏派生能力",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_explore_e": {
      "id": "tree_explore_e",
      "kind": "tree",
      "displayName": "一起出发",
      "parameters": {
        "prerequisites": [
          "tree_explore_c",
          "tree_explore_d"
        ],
        "cost": 8,
        "effect": "伙伴被封禁时，封印物所需有效命中次数 -1，下限 2",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_explore_f": {
      "id": "tree_explore_f",
      "kind": "tree",
      "displayName": "秘密雷达",
      "parameters": {
        "prerequisites": [
          "tree_explore_e"
        ],
        "cost": 12,
        "effect": "每海域第一次接近未发现秘密 350 范围时，显示方向 6 秒；不代替交互/解谜",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "home_bowl": {
      "id": "home_bowl",
      "kind": "facility",
      "displayName": "饭碗",
      "parameters": {
        "cost": 0,
        "currency": "part",
        "effect": "技能树、算力卡余额、免费重置；无被动产出",
        "previewAvailable": false,
        "partCost": 0
      },
      "version": "2.0.0-preview.5"
    },
    "home_bench": {
      "id": "home_bench",
      "kind": "facility",
      "displayName": "MCP 工作台",
      "parameters": {
        "cost": 6,
        "currency": "part",
        "effect": "管理已发现武器，购买出发解锁；不合成局中高品质武器",
        "previewAvailable": false,
        "partCost": 6
      },
      "version": "2.0.0-preview.5"
    },
    "home_terminal": {
      "id": "home_terminal",
      "kind": "facility",
      "displayName": "技能终端",
      "parameters": {
        "cost": 6,
        "currency": "part",
        "effect": "管理已发现主动技能与出发选择",
        "previewAvailable": false,
        "partCost": 6
      },
      "version": "2.0.0-preview.5"
    },
    "home_guest": {
      "id": "home_guest",
      "kind": "facility",
      "displayName": "伙伴小屋",
      "parameters": {
        "cost": 8,
        "currency": "part",
        "effect": "与居民交流、选择一位助战、查看其救助任务",
        "previewAvailable": false,
        "partCost": 8
      },
      "version": "2.0.0-preview.5"
    },
    "home_shelf": {
      "id": "home_shelf",
      "kind": "facility",
      "displayName": "收藏架",
      "parameters": {
        "cost": 4,
        "currency": "part",
        "effect": "摆放收藏、阅读发现；纯展示，不隐藏加战斗属性",
        "previewAvailable": false,
        "partCost": 4
      },
      "version": "2.0.0-preview.5"
    },
    "home_map": {
      "id": "home_map",
      "kind": "facility",
      "displayName": "航海桌",
      "parameters": {
        "cost": 0,
        "currency": "part",
        "effect": "模式、阵营顺序预告、继续检查点、新局与种子信息",
        "previewAvailable": false,
        "partCost": 0
      },
      "version": "2.0.0-preview.5"
    },
    "tree_dsh_a": {
      "id": "tree_dsh_a",
      "kind": "tree",
      "displayName": "DSH接入",
      "parameters": {
        "prerequisites": [],
        "cost": 4,
        "effect": "开放第1个DSH槽",
        "requiresAnyDsh": true,
        "baseSpendRequired": 0,
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_dsh_b": {
      "id": "tree_dsh_b",
      "kind": "tree",
      "displayName": "扩展接口",
      "parameters": {
        "prerequisites": [
          "tree_dsh_a"
        ],
        "cost": 8,
        "effect": "开放第2个DSH槽",
        "requiresAnyDsh": true,
        "baseSpendRequired": 24,
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "tree_dsh_c": {
      "id": "tree_dsh_c",
      "kind": "tree",
      "displayName": "全局编排",
      "parameters": {
        "prerequisites": [
          "tree_dsh_b"
        ],
        "cost": 12,
        "effect": "开放第3个DSH槽",
        "requiresAnyDsh": true,
        "baseSpendRequired": 60,
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "player_fish": {
      "id": "player_fish",
      "kind": "player",
      "displayName": "大肥鱼",
      "parameters": {
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "projectile_bubble": {
      "id": "projectile_bubble",
      "kind": "projectile",
      "displayName": "泡泡",
      "parameters": {
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "terrain_rock": {
      "id": "terrain_rock",
      "kind": "terrain",
      "displayName": "礁石",
      "parameters": {
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "terrain_clutter": {
      "id": "terrain_clutter",
      "kind": "terrain",
      "displayName": "低矮杂物",
      "parameters": {
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "world_checkpoint": {
      "id": "world_checkpoint",
      "kind": "objective",
      "displayName": "检查点",
      "parameters": {
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "rice_xp": {
      "id": "rice_xp",
      "kind": "pickup",
      "displayName": "大白饭",
      "parameters": {
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5"
    },
    "claude_seal": {
      "id": "claude_seal",
      "kind": "entity",
      "displayName": "Claude封印物",
      "parameters": {
        "primaryHitsRequired": 3,
        "rewardPolicy": "none"
      },
      "version": "2.0.0-preview.5"
    },
    "world_beacon": {
      "id": "world_beacon",
      "kind": "entity",
      "displayName": "海域信标",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_gate": {
      "id": "world_gate",
      "kind": "entity",
      "displayName": "首领入口",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_cache": {
      "id": "world_cache",
      "kind": "entity",
      "displayName": "补给箱",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "boss_claude": {
      "id": "boss_claude",
      "kind": "entity",
      "displayName": "Claude · 封禁管理员",
      "parameters": {
        "hp": 5000,
        "armor": 25,
        "moveSpeed": 70,
        "contactDamage": 28
      },
      "version": "2.0.0-preview.5"
    },
    "easter_chair": {
      "id": "easter_chair",
      "kind": "entity",
      "displayName": "深度摸鱼",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "easter_note": {
      "id": "easter_note",
      "kind": "entity",
      "displayName": "留言",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "easter_lunchbox": {
      "id": "easter_lunchbox",
      "kind": "entity",
      "displayName": "饭点",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "easter_console": {
      "id": "easter_console",
      "kind": "entity",
      "displayName": "接口拼图",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "easter_interface": {
      "id": "easter_interface",
      "kind": "entity",
      "displayName": "训练接口",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "gpt_core": {
      "id": "gpt_core",
      "kind": "entity",
      "displayName": "可击破核心",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "gpt_zone": {
      "id": "gpt_zone",
      "kind": "entity",
      "displayName": "危险区域",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "gpt_decoy": {
      "id": "gpt_decoy",
      "kind": "entity",
      "displayName": "工具假身",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "boss_gpt": {
      "id": "boss_gpt",
      "kind": "entity",
      "displayName": "ChatGPT · 重新生成",
      "parameters": {
        "hp": 3000,
        "armor": 0,
        "moveSpeed": 95
      },
      "version": "2.0.0-preview.5"
    },
    "boss_grok": {
      "id": "boss_grok",
      "kind": "entity",
      "displayName": "Grok · 发射窗口",
      "parameters": {
        "hp": 2800,
        "armor": 0,
        "moveSpeed": 65
      },
      "version": "2.0.0-preview.5"
    },
    "gpt_reset_node": {
      "id": "gpt_reset_node",
      "kind": "entity",
      "displayName": "重置节点",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "gpt_node_marker": {
      "id": "gpt_node_marker",
      "kind": "entity",
      "displayName": "待激活节点",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "gpt_answer_area": {
      "id": "gpt_answer_area",
      "kind": "entity",
      "displayName": "修改答案",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "grok_rocket": {
      "id": "grok_rocket",
      "kind": "entity",
      "displayName": "可击毁火箭",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "terrain_breakable": {
      "id": "terrain_breakable",
      "kind": "entity",
      "displayName": "可破掩体",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_alarm": {
      "id": "world_alarm",
      "kind": "entity",
      "displayName": "警报资源箱",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_current": {
      "id": "world_current",
      "kind": "entity",
      "displayName": "周期潮汐",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_signal": {
      "id": "world_signal",
      "kind": "entity",
      "displayName": "援军信号装置",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "terrain_shortcut": {
      "id": "terrain_shortcut",
      "kind": "entity",
      "displayName": "可关闭捷径",
      "parameters": {},
      "version": "2.0.0-preview.5"
    },
    "world_challenge": {
      "id": "world_challenge",
      "kind": "entity",
      "displayName": "可选挑战",
      "parameters": {},
      "version": "2.0.0-preview.5"
    }
  },
  "mechanics": [
    {
      "id": "mech_01_exploration",
      "kind": "mechanic",
      "displayName": "正式探索与追兵",
      "parameters": {
        "description": "mech_01_exploration（解锁1）/ 正式探索与追兵：在正式连续地图启用驻守、区域目标和01的90秒追兵周期；与Free逐项教学分开",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic01Exploration",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 1,
      "scope": "world",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic01Exploration",
      "exclusions": []
    },
    {
      "id": "mech_02_reinforcements",
      "kind": "mechanic",
      "displayName": "增援队列",
      "parameters": {
        "description": "mech_02_reinforcements（解锁2）/ 增援队列：标记遭遇的驻守预算分2–3批，批间隔4秒，入口至少提前1.5秒提示；只分配既有预算，不凭空增加奖励",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic02Reinforcements",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 2,
      "scope": "event",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic02Reinforcements",
      "exclusions": []
    },
    {
      "id": "mech_03_gpt_support",
      "kind": "mechanic",
      "displayName": "GPT支援协同",
      "parameters": {
        "description": "mech_03_gpt_support（解锁3）/ GPT支援协同：Dewey优先治疗Hoots/Seedy等脆弱后排，Rocky在350内可移动到支援单位与玩家之间；各自原技能/冷却不变",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic03GptSupport",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 3,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic03GptSupport",
      "exclusions": []
    },
    {
      "id": "mech_04_claude_break",
      "kind": "mechanic",
      "displayName": "Claude重钳破阵",
      "parameters": {
        "description": "mech_04_claude_break（解锁4）/ Claude重钳破阵：普通/精英蟹重钳和Boss钳击可击破标记为可破坏的掩体；单次32伤重钳按等额耐久扣除，掩体初值30；其他不可破坏地形不受影响",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic04ClaudeBreak",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 4,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic04ClaudeBreak",
      "exclusions": []
    },
    {
      "id": "mech_05_boss_combo",
      "kind": "mechanic",
      "displayName": "首领组合技",
      "parameters": {
        "description": "mech_05_boss_combo（解锁5）/ 首领组合技：Boss可以用固定两招顺序衔接，第二招仍有完整预警；Claude钳制后普通挥击，GPT慢泡后区域标记，Grok招兵后单枚火箭",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic05BossCombo",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 5,
      "scope": "boss",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic05BossCombo",
      "exclusions": []
    },
    {
      "id": "mech_06_alarm_cache",
      "kind": "mechanic",
      "displayName": "警报资源箱",
      "parameters": {
        "description": "mech_06_alarm_cache（解锁6）/ 警报资源箱：每海域放1个可选警报箱，交互前告知风险；打开后从合法入口产生一场增援，箱内提供2把MCP择1，品质至少增强；该箱与增援各仅结算一次",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic06AlarmCache",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 6,
      "scope": "objective",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic06AlarmCache",
      "exclusions": []
    },
    {
      "id": "mech_07_tide",
      "kind": "mechanic",
      "displayName": "周期潮汐",
      "parameters": {
        "description": "mech_07_tide（解锁7）/ 周期潮汐：标记水道每30秒切换水流方向，提前3秒箭头预警，水流额外速度60；同样影响可移动敌人，不叠加至超过基础移速的1.8倍",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic07Tide",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 7,
      "scope": "world",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic07Tide",
      "exclusions": []
    },
    {
      "id": "mech_08_grok_flanks",
      "kind": "mechanic",
      "displayName": "Grok两翼合围",
      "parameters": {
        "description": "mech_08_grok_flanks（解锁8）/ Grok两翼合围：群体遭遇预算从两个视野外入口错时入场，间隔2秒；入口布局必须留出至少120宽的可突破通路",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic08GrokFlanks",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 8,
      "scope": "world",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic08GrokFlanks",
      "exclusions": []
    },
    {
      "id": "mech_09_gpt_reposition",
      "kind": "mechanic",
      "displayName": "GPT换位保护",
      "parameters": {
        "description": "mech_09_gpt_reposition（解锁9）/ GPT换位保护：支援/远射Pet在玩家120内时向已验证可通行的后撤点移动，最多移动180；Rocky随后保护它，重新站定后再按原预警攻击",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic09GptReposition",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 9,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic09GptReposition",
      "exclusions": []
    },
    {
      "id": "mech_10_boss_arena",
      "kind": "mechanic",
      "displayName": "首领利用场地",
      "parameters": {
        "description": "mech_10_boss_arena（解锁10）/ 首领利用场地：Claude场内部署可破掩体；GPT重置节点从5个可见可达候选位置按seed选3个且不重复；Grok招兵在3个合法入口中轮换选2个",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic10BossArena",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 10,
      "scope": "boss",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic10BossArena",
      "exclusions": []
    },
    {
      "id": "mech_11_objective_signal",
      "kind": "mechanic",
      "displayName": "目标增援信号",
      "parameters": {
        "description": "mech_11_objective_signal（解锁11）/ 目标增援信号：信标/封锁目标启动后产生1个可见信号装置，生命40；每6秒请求一小批预算内援军，摧毁后停止本次装置增援；增援仍受活敌与入口规则约束",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic11ObjectiveSignal",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 11,
      "scope": "objective",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic11ObjectiveSignal",
      "exclusions": []
    },
    {
      "id": "mech_11_glasswing",
      "kind": "mechanic",
      "displayName": "Claude · Project Glasswing",
      "parameters": {
        "description": "mech_11_glasswing（解锁11）/ Claude · Project Glasswing：Claude Boss的控制请求按08进行双倍处理：禁锢时长和挣脱次数×2，技能/伙伴封禁时长×2；不复制伤害/实体/封印物",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic11Glasswing",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 11,
      "scope": "boss",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic11Glasswing",
      "exclusions": []
    },
    {
      "id": "mech_12_gpt_four_roles",
      "kind": "mechanic",
      "displayName": "GPT四职能混编",
      "parameters": {
        "description": "mech_12_gpt_four_roles（解锁12）/ GPT四职能混编：GPT特色遭遇允许同时4种Pets，普通遭遇仍最多3种；应组合前排/支援/远程/干扰，不允许同屏放满7种",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic12GptFourRoles",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 12,
      "scope": "ai",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic12GptFourRoles",
      "exclusions": []
    },
    {
      "id": "mech_13_handoff",
      "kind": "mechanic",
      "displayName": "遭遇衔接",
      "parameters": {
        "description": "mech_13_handoff（解锁13）/ 遭遇衔接：玩家激活过的精英事件剩余生命/成员总量降至20%时，可提前预告下一批正常追兵，至少3秒后从合法入口进入；只提前原日程，不复制队伍或奖励",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic13Handoff",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 13,
      "scope": "event",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic13Handoff",
      "exclusions": []
    },
    {
      "id": "mech_14_anomaly",
      "kind": "mechanic",
      "displayName": "局部地图异常",
      "parameters": {
        "description": "mech_14_anomaly（解锁14）/ 局部地图异常：每海域最多2次，间隔至少120秒；提前4秒预告，局部潮流反向或标记捷径临时关闭12秒；两种择1，发生在有替代路线的区域",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic14Anomaly",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 14,
      "scope": "event",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic14Anomaly",
      "exclusions": []
    },
    {
      "id": "mech_15_integration",
      "kind": "mechanic",
      "displayName": "分段综合压力",
      "parameters": {
        "description": "mech_15_integration（解锁15）/ 分段综合压力：每海域设计1个三段遭遇：各段调用两项已经解锁、适用此处的机制，每段最长30秒后停止补兵，清掉必要敌人后进入15秒低压衔接；第三段后正常完成目标",
        "source": "07-dsh.md",
        "handler": "content/handlers/mechanics.js#planMechanic15Integration",
        "previewAvailable": false
      },
      "version": "2.0.0-preview.5",
      "unlockAt": 15,
      "scope": "objective",
      "appliesTo": [],
      "handlerId": "content/handlers/mechanics.js#planMechanic15Integration",
      "exclusions": []
    }
  ]
};

export const CONTENT_BINDINGS = [
  {
    "kind": "plugins",
    "id": "plugin_parallel",
    "module": "content/handlers/plugins.js",
    "function": "planPluginParallel",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_local_deploy",
    "module": "content/handlers/plugins.js",
    "function": "planPluginLocalDeploy",
    "source": "ROADMAP-FUN-GAME.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_quant_int4",
    "module": "content/handlers/plugins.js",
    "function": "planPluginQuantInt4",
    "source": "ROADMAP-FUN-GAME.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_rollback_emergency",
    "module": "content/handlers/plugins.js",
    "function": "planPluginRollbackEmergency",
    "source": "ROADMAP-FUN-GAME.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_batch",
    "module": "content/handlers/plugins.js",
    "function": "planPluginBatch",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_compress",
    "module": "content/handlers/plugins.js",
    "function": "planPluginCompress",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_cache",
    "module": "content/handlers/plugins.js",
    "function": "planPluginCache",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_retry",
    "module": "content/handlers/plugins.js",
    "function": "planPluginRetry",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_temperature",
    "module": "content/handlers/plugins.js",
    "function": "planPluginTemperature",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_collect",
    "module": "content/handlers/plugins.js",
    "function": "planPluginCollect",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_cooldown",
    "module": "content/handlers/plugins.js",
    "function": "planPluginCooldown",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_offload",
    "module": "content/handlers/plugins.js",
    "function": "planPluginOffload",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_keepalive",
    "module": "content/handlers/plugins.js",
    "function": "planPluginKeepalive",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_redirect",
    "module": "content/handlers/plugins.js",
    "function": "planPluginRedirect",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_backoff",
    "module": "content/handlers/plugins.js",
    "function": "planPluginBackoff",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_distill",
    "module": "content/handlers/plugins.js",
    "function": "planPluginDistill",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_5h",
    "module": "content/handlers/plugins.js",
    "function": "planPlugin5h",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_failover",
    "module": "content/handlers/plugins.js",
    "function": "planPluginFailover",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_sandbox",
    "module": "content/handlers/plugins.js",
    "function": "planPluginSandbox",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_hallucination",
    "module": "content/handlers/plugins.js",
    "function": "planPluginHallucination",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_chain",
    "module": "content/handlers/plugins.js",
    "function": "planPluginChain",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_context",
    "module": "content/handlers/plugins.js",
    "function": "planPluginContext",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_hotplug",
    "module": "content/handlers/plugins.js",
    "function": "planPluginHotplug",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_guard",
    "module": "content/handlers/plugins.js",
    "function": "planPluginGuard",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_prefill",
    "module": "content/handlers/plugins.js",
    "function": "planPluginPrefill",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_toolchain",
    "module": "content/handlers/plugins.js",
    "function": "planPluginToolchain",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_mirror",
    "module": "content/handlers/plugins.js",
    "function": "planPluginMirror",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_recursion",
    "module": "content/handlers/plugins.js",
    "function": "planPluginRecursion",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_moe",
    "module": "content/handlers/plugins.js",
    "function": "planPluginMoe",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_speculate",
    "module": "content/handlers/plugins.js",
    "function": "planPluginSpeculate",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_window",
    "module": "content/handlers/plugins.js",
    "function": "planPluginWindow",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_agent",
    "module": "content/handlers/plugins.js",
    "function": "planPluginAgent",
    "source": "04-plugins.md"
  },
  {
    "kind": "plugins",
    "id": "plugin_breaker",
    "module": "content/handlers/plugins.js",
    "function": "planPluginBreaker",
    "source": "04-plugins.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_claude_appeal",
    "module": "content/handlers/dsh.js",
    "function": "planDshClaudeAppeal",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_gpt_preview",
    "module": "content/handlers/dsh.js",
    "function": "planDshGptPreview",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_grok_license",
    "module": "content/handlers/dsh.js",
    "function": "planDshGrokLicense",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_claude_allowlist",
    "module": "content/handlers/dsh.js",
    "function": "planDshClaudeAllowlist",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_gpt_branch",
    "module": "content/handlers/dsh.js",
    "function": "planDshGptBranch",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_grok_salvage",
    "module": "content/handlers/dsh.js",
    "function": "planDshGrokSalvage",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_sleep",
    "module": "content/handlers/dsh.js",
    "function": "planDshSleep",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_rice",
    "module": "content/handlers/dsh.js",
    "function": "planDshRice",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_open",
    "module": "content/handlers/dsh.js",
    "function": "planDshOpen",
    "source": "07-dsh.md"
  },
  {
    "kind": "dsh",
    "id": "dsh_lora",
    "module": "content/handlers/dsh.js",
    "function": "planDshLora",
    "source": "07-dsh.md"
  },
  {
    "kind": "weapons",
    "id": "mcp_bubble",
    "module": "content/handlers/weapons.js",
    "function": "planWeaponBubble",
    "source": "03-loadout.md"
  },
  {
    "kind": "weapons",
    "id": "mcp_fan",
    "module": "content/handlers/weapons.js",
    "function": "planWeaponFan",
    "source": "03-loadout.md"
  },
  {
    "kind": "weapons",
    "id": "mcp_vector",
    "module": "content/handlers/weapons.js",
    "function": "planWeaponVector",
    "source": "03-loadout.md"
  },
  {
    "kind": "weapons",
    "id": "mcp_stream",
    "module": "content/handlers/weapons.js",
    "function": "planWeaponStream",
    "source": "03-loadout.md"
  },
  {
    "kind": "weapons",
    "id": "mcp_return",
    "module": "content/handlers/weapons.js",
    "function": "planWeaponReturn",
    "source": "03-loadout.md"
  },
  {
    "kind": "weapons",
    "id": "mcp_batch",
    "module": "content/handlers/weapons.js",
    "function": "planWeaponBatch",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_disconnect",
    "module": "content/handlers/skills.js",
    "function": "planSkillDisconnect",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_cache",
    "module": "content/handlers/skills.js",
    "function": "planSkillCache",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_batch",
    "module": "content/handlers/skills.js",
    "function": "planSkillBatch",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_redirect",
    "module": "content/handlers/skills.js",
    "function": "planSkillRedirect",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_sandbox",
    "module": "content/handlers/skills.js",
    "function": "planSkillSandbox",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_fork",
    "module": "content/handlers/skills.js",
    "function": "planSkillFork",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_rollback",
    "module": "content/handlers/skills.js",
    "function": "planSkillRollback",
    "source": "03-loadout.md"
  },
  {
    "kind": "skills",
    "id": "skill_overclock",
    "module": "content/handlers/skills.js",
    "function": "planSkillOverclock",
    "source": "03-loadout.md"
  },
  {
    "kind": "companions",
    "id": "companion_rice",
    "module": "content/handlers/companions.js",
    "function": "planCompanionRice",
    "source": "03-loadout.md"
  },
  {
    "kind": "companions",
    "id": "companion_patch",
    "module": "content/handlers/companions.js",
    "function": "planCompanionPatch",
    "source": "03-loadout.md"
  },
  {
    "kind": "companions",
    "id": "companion_cache",
    "module": "content/handlers/companions.js",
    "function": "planCompanionCache",
    "source": "03-loadout.md"
  },
  {
    "kind": "companions",
    "id": "companion_router",
    "module": "content/handlers/companions.js",
    "function": "planCompanionRouter",
    "source": "03-loadout.md"
  },
  {
    "kind": "companions",
    "id": "companion_decoy",
    "module": "content/handlers/companions.js",
    "function": "planCompanionDecoy",
    "source": "03-loadout.md"
  },
  {
    "kind": "companions",
    "id": "companion_rocket",
    "module": "content/handlers/companions.js",
    "function": "planCompanionRocket",
    "source": "03-loadout.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_codex",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptCodex",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_dewey",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptDewey",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_fireball",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptFireball",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_hoots",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptHoots",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_rocky",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptRocky",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_seedy",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptSeedy",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_gpt_stacky",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGptStacky",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_claude_guard",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyClaudeGuard",
    "source": "05-enemies.md"
  },
  {
    "kind": "enemies",
    "id": "enemy_grok_bot",
    "module": "content/handlers/enemies.js",
    "function": "planEnemyGrokBot",
    "source": "05-enemies.md"
  },
  {
    "kind": "models",
    "id": "claude_haiku",
    "module": "content/handlers/models.js",
    "function": "planModelClaudeHaiku",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "claude_sonnet",
    "module": "content/handlers/models.js",
    "function": "planModelClaudeSonnet",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "claude_opus",
    "module": "content/handlers/models.js",
    "function": "planModelClaudeOpus",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "claude_fable",
    "module": "content/handlers/models.js",
    "function": "planModelClaudeFable",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "claude_mythos",
    "module": "content/handlers/models.js",
    "function": "planModelClaudeMythos",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "gpt_astra",
    "module": "content/handlers/models.js",
    "function": "planModelGptAstra",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "gpt_sol",
    "module": "content/handlers/models.js",
    "function": "planModelGptSol",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "gpt_terra",
    "module": "content/handlers/models.js",
    "function": "planModelGptTerra",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "gpt_luna",
    "module": "content/handlers/models.js",
    "function": "planModelGptLuna",
    "source": "08-model-variants.md"
  },
  {
    "kind": "models",
    "id": "grok_bot",
    "module": "content/handlers/models.js",
    "function": "planModelGrokBot",
    "source": "08-model-variants.md"
  },
  {
    "kind": "mechanics",
    "id": "mech_01_exploration",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic01Exploration",
    "source": "07-dsh.md",
    "unlockAt": 1
  },
  {
    "kind": "mechanics",
    "id": "mech_02_reinforcements",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic02Reinforcements",
    "source": "07-dsh.md",
    "unlockAt": 2
  },
  {
    "kind": "mechanics",
    "id": "mech_03_gpt_support",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic03GptSupport",
    "source": "07-dsh.md",
    "unlockAt": 3
  },
  {
    "kind": "mechanics",
    "id": "mech_04_claude_break",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic04ClaudeBreak",
    "source": "07-dsh.md",
    "unlockAt": 4
  },
  {
    "kind": "mechanics",
    "id": "mech_05_boss_combo",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic05BossCombo",
    "source": "07-dsh.md",
    "unlockAt": 5
  },
  {
    "kind": "mechanics",
    "id": "mech_06_alarm_cache",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic06AlarmCache",
    "source": "07-dsh.md",
    "unlockAt": 6
  },
  {
    "kind": "mechanics",
    "id": "mech_07_tide",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic07Tide",
    "source": "07-dsh.md",
    "unlockAt": 7
  },
  {
    "kind": "mechanics",
    "id": "mech_08_grok_flanks",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic08GrokFlanks",
    "source": "07-dsh.md",
    "unlockAt": 8
  },
  {
    "kind": "mechanics",
    "id": "mech_09_gpt_reposition",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic09GptReposition",
    "source": "07-dsh.md",
    "unlockAt": 9
  },
  {
    "kind": "mechanics",
    "id": "mech_10_boss_arena",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic10BossArena",
    "source": "07-dsh.md",
    "unlockAt": 10
  },
  {
    "kind": "mechanics",
    "id": "mech_11_objective_signal",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic11ObjectiveSignal",
    "source": "07-dsh.md",
    "unlockAt": 11
  },
  {
    "kind": "mechanics",
    "id": "mech_11_glasswing",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic11Glasswing",
    "source": "07-dsh.md",
    "unlockAt": 11
  },
  {
    "kind": "mechanics",
    "id": "mech_12_gpt_four_roles",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic12GptFourRoles",
    "source": "07-dsh.md",
    "unlockAt": 12
  },
  {
    "kind": "mechanics",
    "id": "mech_13_handoff",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic13Handoff",
    "source": "07-dsh.md",
    "unlockAt": 13
  },
  {
    "kind": "mechanics",
    "id": "mech_14_anomaly",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic14Anomaly",
    "source": "07-dsh.md",
    "unlockAt": 14
  },
  {
    "kind": "mechanics",
    "id": "mech_15_integration",
    "module": "content/handlers/mechanics.js",
    "function": "planMechanic15Integration",
    "source": "07-dsh.md",
    "unlockAt": 15
  }
];
