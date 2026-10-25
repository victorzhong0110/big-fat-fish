/** V2 data and port contracts. Per-function implementation status is in architecture-manifest.json. */
export type Id = string;
export type Tick = number;
export type Faction = 'claude' | 'gpt' | 'grok';
export type Mode = 'tutorial' | 'short' | 'expedition' | 'api';
export type Phase = 'preparing' | 'exploring' | 'boss' | 'pluginChoice' | 'loraTraining' | 'paused' | 'victory' | 'defeat' | 'withdrawal';
export type Vec2 = Readonly<{ x: number; y: number }>;
export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export type DeepReadonly<T> = T extends Json ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type StateSnapshot = DeepReadonly<GameState>;
export type Result<T> = { ok: true; value: T } | { ok: false; code: string; message: string };
export interface Versions { schema: number; core: string; content: string; }
export interface Diagnostic { code: string; message: string; relatedIds: readonly Id[]; }
export interface RandomState { seed: number; cursor: number; }
export interface RandomDraw { value: number; next: RandomState; }
export type RandomStreams = Readonly<Record<'world' | 'reward' | 'combat' | 'dsh' | 'lora' | 'event', RandomState>>;
export interface ClockState { accumulatorMs: number; suspended: boolean; backlogMs: number; domain: 'world' | 'ui' | null; }
export interface FrameSchedule { worldSteps: number; uiSteps: number; nextClock: ClockState; performancePause: boolean; }
export interface Command { id: Id; seq: number; clock: 'world' | 'ui'; targetTick: Tick; type: string; payload: Json; }
export interface InputSample { device: 'keyboard' | 'mouse' | 'touch' | 'system'; type: string; timestampMs: number; payload: Json; }
export interface InputState { move: Vec2; aim: Vec2; firing: boolean; heldKeys: readonly string[]; pointerIds: readonly number[]; }
export interface InputClockMapping { worldTick: Tick; uiTick: Tick; phase: Phase; sampleOriginMs: number; worldOriginMs: number; uiOriginMs: number; worldPaused: boolean; uiPaused: boolean; }
export interface CommandBatch { commands: readonly Command[]; nextInput: InputState; }
export interface CommandResult { accepted: boolean; reason: string | null; plan: SystemPlan; }
export interface DomainEvent { id: Id; runId: Id; tick: Tick; seq: number; type: string; sourceId: Id | null; targetId: Id | null; payload: Json; }
export interface PersistenceIntent { id: Id; kind: 'discovery' | 'checkpoint' | 'settlement' | 'unlock'; payload: Json; }
export interface StateChange { target: 'player' | 'entity' | 'world' | 'flow' | 'progression' | 'runtime' | 'random'; id: Id; operation: string; payload: Json; }
export interface SystemPlan {
  changes: readonly StateChange[];
  effects: readonly EffectRequest[];
  events: readonly DomainEvent[];
  persistence: readonly PersistenceIntent[];
  diagnostics: readonly Diagnostic[];
}
export type EffectPlan = SystemPlan;
export interface EffectRequest { id: Id; chainId: Id; generation: number; sourceId: Id; kind: string; payload: Json; }
export interface EffectQueue { pending: readonly EffectRequest[]; processedIds: readonly Id[]; spawnedThisTick: number; }
export interface EffectDrain { nextWorking: GameState; deaths: readonly DeathRecord[]; events: readonly DomainEvent[]; persistence: readonly PersistenceIntent[]; diagnostics: readonly Diagnostic[]; nextQueue: EffectQueue; exhausted: boolean; }
export interface BaseStats { maxHp: number; moveSpeed: number; armor: number; damageMultiplier: number; critChance: number; critMultiplier: number; }
export interface StatModifier { id: Id; sourceId: Id; stat: keyof BaseStats | 'weaponInterval' | 'skillCooldown' | 'dashCooldown' | 'pickupRadius'; operation: 'add' | 'multiply'; value: number; expiresAt: Tick | null; }
export interface TimerState { remaining: number; duration: number; domain: 'world' | 'ui'; }
export interface StatusState { id: Id; kind: string; sourceId: Id; remaining: number; requiredInputs: number; completedInputs: number; modifiersApplied: readonly Id[]; }
export interface ShieldState { id: Id; sourceId: Id; amount: number; expiresAt: Tick; seq: number; }
export interface ShellState { maxHp: number; hp: number; broken: boolean; weakArcDegrees: number; stunRemaining: number; enraged: boolean; }
export interface EntityState {
  id: Id; definitionId: Id; kind: 'player' | 'enemy' | 'companion' | 'projectile' | 'pickup' | 'obstacle' | 'objective' | 'decoy';
  faction: Faction | null; team: 'player' | 'enemy' | 'neutral';
  position: Vec2; previousPosition: Vec2; velocity: Vec2; facingRadians: number; radius: number;
  hp: number; maxHp: number; armor: number; shieldIds: readonly Id[]; statusIds: readonly Id[];
  modelProfileId: Id | null; shell: ShellState | null; collisionProfileId: Id;
  sourceId: Id; creditOwner: 'player' | 'enemy' | 'none'; attackId: Id | null;
  rewardPolicy: 'normal' | 'elite' | 'group' | 'none'; distillEligible: boolean;
  dying: boolean; dead: boolean; expiresAt: Tick | null; timers: Readonly<Record<string, TimerState>>;
  runtime: Readonly<Record<string, Json>>;
}
export interface WeaponState { instanceId: Id; definitionId: Id; originalQuality: 0 | 1 | 2; cooldown: number; temporaryQuality: number | null; updateExpiresAt: Tick | null; }
export interface Loadout { weapons: readonly WeaponState[]; activeWeaponIndex: number; skillId: Id; skillCooldown: number; companionId: Id | null; companionCooldown: number; dashCooldown: number; }
export interface PlayerState { entityId: Id; baseStats: BaseStats; modifiers: readonly StatModifier[]; loadout: Loadout; invulnerableRemaining: number; controlImmuneRemaining: number; }
export interface PickupState { id: Id; kind: 'riceXp' | 'gpuFragment' | 'part' | 'weapon' | 'skill'; amount: number; position: Vec2; instanceId: Id | null; collected: boolean; }
export interface ObjectiveState { id: Id; kind: string; active: boolean; completed: boolean; progress: number; requiredEntityIds: readonly Id[]; rewardId: Id; }
export interface SpawnRequest { id: Id; groupId: Id; enemyId: Id; position: Vec2; at: Tick; modelProfileId: Id; budgetId: Id; rewardPolicy: EntityState['rewardPolicy']; distillEligible: boolean; }
export interface EncounterBudget { id: Id; total: number; reserved: number; spawned: number; maxAlive: number; }
export interface PressureEvent { id: Id; mechanicId: Id; phase: 'queued' | 'telegraph' | 'active' | 'completed' | 'cancelled'; startedAt: Tick | null; remaining: number; budgetId: Id; runtime: Readonly<Record<string, Json>>; }
export interface MapState { id: Id; biomeIndex: number; width: number; height: number; exploredCells: readonly Id[]; obstacleIds: readonly Id[]; checkpointIds: readonly Id[]; exitIds: readonly Id[]; navigationRevision: number; }
export interface WorldState { map: MapState; entities: Readonly<Record<Id, EntityState>>; pickups: Readonly<Record<Id, PickupState>>; statuses: Readonly<Record<Id, StatusState>>; shields: Readonly<Record<Id, ShieldState>>; objectives: readonly ObjectiveState[]; spawnQueue: readonly SpawnRequest[]; budgets: readonly EncounterBudget[]; pressureEvents: readonly PressureEvent[]; }
export interface PluginState { id: Id; rank: 1 | 2; origin: 'run' | 'difficulty'; runtime: Readonly<Record<string, Json>>; }
export interface DshSlot { id: Id; options: Readonly<Record<string, string>>; }
export interface DistillTrack { stage: 0 | 1 | 2 | 3; samples: number; }
export interface AttackHitRecord { attackId: Id; targetId: Id; expiresAt: Tick; }
export interface DamageBudgetEntry { tick: Tick; spent: number; }
export interface PluginChoice { id: Id; level: number; candidates: readonly { id: Id; rank: 1 | 2 }[]; rerollsUsed: number; replacingId: Id | null; resolved: boolean; }
export interface LevelReward { id: Id; level: number; loraRequired: boolean; pluginRequired: boolean; }
export interface LoraTrial { id: Id; level: number; target: 'maxHp' | 'damageMultiplier' | 'moveSpeed' | 'armor'; phase: 'ready' | 'running' | 'resolved'; uiTick: Tick; result: 'perfect' | 'underfit' | 'overfit' | null; }
export interface LoraTrialCreation { trial: LoraTrial; nextRandom: RandomState; }
export interface LoraState { inputHeld?: boolean; active: LoraTrial | null; pendingLevels: readonly number[]; modifiers: readonly StatModifier[]; underfitRemaining: number; overfitRemaining: number; resolvedTrialIds: readonly Id[]; }
export interface DshCycleState { remaining: number; pendingOutcome: 'update' | 'reset' | null; triggerSeq: number; lastAdvancedTick: Tick | null; }
export interface BossState { entityId: Id; faction: Faction; phase: number; telegraph: Json; resetNodes: readonly { id: Id; hp: number; consumed: boolean; position: Vec2 }[]; resetRemaining: number; resetCooldown: number; spawnGroupSeq: number; }
export interface ApiState { elapsedTicks: Tick; bossIndex: number; materialMinute: number; fragmentsThisMinute: number; partsThisMinute: number; }
export interface DifficultySnapshot { level: number | 'api'; mode: Mode; mechanicIds: readonly Id[]; difficultyPerkIds: readonly Id[]; modelProfileIds: Readonly<Record<Faction, Id>>; hpMultiplier: number; damageMultiplier: number; spawnBudgetMultiplier: number; }
export interface StartSnapshot { runtimeProfile?: 'core-preview' | 'full'; runId?: Id; treeNodeIds: readonly Id[]; dsh: readonly DshSlot[]; loadout: Loadout; difficulty: DifficultySnapshot; }
export interface FlowState { suspendedResumePhase?: Phase | null; phase: Phase; resumePhase: Phase | null; queuedLevelRewards: readonly LevelReward[]; choice: PluginChoice | null; settlementPending: boolean; pluginRerollsUsed?: number; }
export interface GameState {
  versions: Versions; runId: Id; seed: number; tick: Tick; uiTick: Tick; revision: number; lastWorldAdvanceTick: Tick | null; input: InputState; lastCommandSeq: number;
  start: StartSnapshot; flow: FlowState; random: RandomStreams; player: PlayerState; world: WorldState;
  level: number; xpRemainder: number; totalTokens: number; plugins: readonly PluginState[];
  dshRuntime: Readonly<Record<Id, Json>>; dshCycle: DshCycleState; lora: LoraState;
  distillRuntime?: Readonly<Record<string, Json>>; distill: Readonly<Record<Faction, DistillTrack>>; damageBudgets: Readonly<Record<Id, readonly DamageBudgetEntry[]>>;
  bosses: readonly BossState[]; api: ApiState | null; inventory: { gpuFragments: number; parts: number };
  attackHits: readonly AttackHitRecord[]; processedRewardIds: readonly Id[]; processedCommandIds: readonly Id[]; pendingEffects: EffectQueue;
}
export interface GameSession { readonly runId: Id; readonly revision: number; }
export interface Definition { id: Id; kind: string; displayName: string; parameters: Readonly<Record<string, Json>>; version: string; }
export interface MechanicDefinition extends Definition { unlockAt: number; scope: 'ai' | 'world' | 'objective' | 'event' | 'boss'; appliesTo: readonly Id[]; handlerId: Id; exclusions: readonly Id[]; }
export interface ContentCatalog { version: string; definitions: Readonly<Record<Id, Definition>>; mechanics: readonly MechanicDefinition[]; }
export interface ValidationReport { valid: boolean; diagnostics: readonly Diagnostic[]; }
export interface EvaluationContext { state: StateSnapshot; catalog: Readonly<ContentCatalog>; event: DomainEvent | null; entityId: Id | null; random: RandomState; }
export interface AttackContext extends EvaluationContext { aim: Vec2; weapon: WeaponState | null; }
export interface HandlerRegistry { bindings: Readonly<Record<Id, string>>; implementedIds: readonly Id[]; }
export interface Collision { id: Id; sourceId: Id; targetId: Id; contact: Vec2; incomingDirection: Vec2; timeOfImpact: number; }
export interface CollisionResult { hits: readonly Collision[]; diagnostics: readonly Diagnostic[]; }
export interface NavigationQuery { entityId: Id; origin: Vec2; destination: Vec2; collisionProfileId: Id; }
export interface NavigationResult { reachable: boolean; path: readonly Vec2[]; }
export interface DamageRequest { id: Id; sourceId: Id; creditOwner: EntityState['creditOwner']; sourceKind: 'weapon_primary' | 'weapon_secondary' | 'skill' | 'plugin_secondary' | 'companion' | 'distilled' | 'dsh' | 'enemy'; attackId: Id; projectileId: Id | null; targetId: Id; baseDamage: number; contact: Vec2; incomingDirection: Vec2; generation: number; chainId: Id; critEligible: boolean; expiresAt: Tick; }
export interface DamageResolution { accepted: boolean; allowedBeforeDefense: number; shellDamage: number; shieldDamage: number; hpDamage: number; plan: SystemPlan; }
export interface QuotaResolution { sourceId: Id; allowedDamage: number; budgetSpent: number; plan: SystemPlan; }
export interface WeaponStats { damage: number; interval: number; projectileSpeed: number; projectileRadius: number; pellets: number; spreadRadians: number; range: number; maxHits: number; damageMultiplierApplied: boolean; }
export interface ControlRequest { id: Id; sourceId: Id; targetId: Id; kind: 'root' | 'slow' | 'skillBan' | 'companionBan'; baseDuration: number; baseRequiredInputs: number; appliedModifierIds: readonly Id[]; }
export interface ControlResolution { blocked: boolean; consumedInterceptorId: Id | null; duration: number; requiredInputs: number; plan: SystemPlan; }
export interface ShellResolution { blocked: boolean; damage: number; broke: boolean; plan: SystemPlan; }
export interface ShieldResolution { absorbed: number; remainingDamage: number; plan: SystemPlan; }
export interface DeathRecord { entityId: Id; sourceId: Id; creditOwner: EntityState['creditOwner']; faction: Faction | null; rewardPolicy: EntityState['rewardPolicy']; distillEligible: boolean; groupId: Id | null; }
export interface RewardPlan { plan: SystemPlan; rewardIds: readonly Id[]; }
export interface Profile {
  version: number; revision: number; gpuCards: number; gpuFragments: number; parts: number;
  purchasedTree: readonly Id[]; discovered: readonly Id[]; unlockedWeapons: readonly Id[]; unlockedSkills: readonly Id[];
  unlockedCompanions: readonly Id[]; unlockedDsh: readonly Id[]; equippedDsh: readonly DshSlot[];
  highestDifficulty: number; apiUnlocked: boolean; facilities: readonly Id[];
  discoveryLedger: readonly Id[]; unlockLedger: readonly Id[]; settlementLedger: readonly Id[];
  checkpoint: Checkpoint | null;
}
export interface ProfilePlan { expectedRevision: number; next: Profile; events: readonly DomainEvent[]; }
export interface StartRequest { mode: Mode; difficulty: number | 'api'; seed: number; weaponIds: readonly Id[]; skillId: Id; companionId: Id | null; }
export interface Checkpoint { id: Id; versions: Versions; revision: number; digest: string; state: GameState; }
export interface Settlement { difficulty?: number | 'api'; mode?: Mode; id: Id; runId: Id; outcome: 'victory' | 'defeat' | 'withdrawal'; gpuFragments: number; parts: number; survivedTicks: number; bossKills: number; discoveries: readonly Id[]; }
export interface StorageRecord { revision: number; profile: Profile; }
export interface StoragePort { read(): Promise<Result<StorageRecord>>; compareAndSwap(expectedRevision: number, next: StorageRecord): Promise<Result<StorageRecord>>; }
export interface AssetRequest { id: Id; source: string; kind: 'sprite' | 'music' | 'sfx'; }
export interface AssetRecord { id: Id; loaded: boolean; error: string | null; }
export interface PresentationPort { render(snapshot: RenderSnapshot): void; present(events: readonly DomainEvent[]): void; dispose(): void; }
export interface InputPort { poll(): readonly InputSample[]; suspend(): void; dispose(): void; }
export interface AudioPort { unlock(): Promise<void>; play(events: readonly DomainEvent[]): void; suspend(): void; dispose(): void; }
export interface RuntimePorts { storage: StoragePort; presentation: PresentationPort; input: InputPort; audio: AudioPort; }
export interface RenderEntity { radius: number; team: EntityState['team']; hp: number; maxHp: number; telegraphRemaining: number; shieldAmount: number; id: Id; kind: string; position: Vec2; facingRadians: number; spriteId: Id; modelLabel: string | null; hpFraction: number; weakArcDegrees: number | null; statusLabels: readonly string[]; }
export interface RenderSnapshot { revision: number; tick: Tick; uiTick: Tick; phase: Phase; entities: readonly RenderEntity[]; hud: Json; panel: Json; }
export interface UiAction { id: Id; type: string; payload: Json; }
export interface ViewHandle { id: Id; }
export interface AudioHandle { id: Id; }
export interface InputHandle { id: Id; }
export interface ApplicationHandle { id: Id; }
export interface ApplicationOptions { ports: RuntimePorts; catalog: ContentCatalog; profile: Profile; }
export interface ApplicationActionResult { kind: 'started' | 'continued' | 'saved' | 'settled' | 'profileUpdated' | 'queued' | 'disposed'; runId: Id | null; revision: number | null; }
export interface BootstrapOptions { mountElementId: string; assets: readonly AssetRequest[]; }
export interface BrowserRuntime { app: ApplicationHandle; input: InputHandle; view: ViewHandle; audio: AudioHandle; inputState: InputState; storage: StoragePort; }
export interface Recording { versions: Versions; initial: GameState; commands: readonly Command[]; digests: readonly { tick: Tick; digest: string }[]; }
export interface TickResult { next: GameState; events: readonly DomainEvent[]; persistence: readonly PersistenceIntent[]; diagnostics: readonly Diagnostic[]; }
