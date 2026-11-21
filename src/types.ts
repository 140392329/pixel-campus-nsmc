export type Facing = 'up' | 'down' | 'left' | 'right';
export type ClockPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScheduleSlot {
  from: string;
  to: string;
  anchorId: string;
  zoneId: string;
  activity: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  spriteKey: string;
  color: number;
  persona: string;
  knowledge: string[];
  greeting: string[];
  fallbacks: string[];
  schedule: ScheduleSlot[];
  defaultAnchor: string;
  wander: { radiusPx: number; speed: number; pauseMs: [number, number] };
  limits: { cooldownSec: number; maxTurns: number; maxChars: number };
}

export interface NpcRuntimeState {
  def: NpcDef;
  pos: { x: number; y: number };
  facing: Facing;
  anchorId: string;
  zoneId: string;
  activity: string;
  mode: 'wander' | 'walk_to_anchor' | 'talking' | 'idle';
  cooldownUntil: number;
  lastChatAt: number;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  at: number;
}

export interface LlmSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
  playerName: string;
  /** 虚拟时钟倍率：0.5 / 1 / 2，现实 1 秒对应游戏 1/2、1、2 分钟。 */
  clockSpeed: number;
}

export interface DialogContext {
  npc: NpcDef;
  state: NpcRuntimeState;
  now: { minutes: number; hhmm: string; phase: ClockPhase };
  zoneName: string;
  playerName: string;
  memory: ChatTurn[];
}

export type LlmErrorKind =
  | 'no_key'
  | 'cors'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'server'
  | 'aborted'
  | 'bad_response'
  | 'unknown';

export interface LlmError {
  kind: LlmErrorKind;
  message: string;
  status?: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  rect: Rect;
  style: 'chinese' | 'modern' | 'dorm' | 'stadium';
  door?: { x: number; y: number; w: number; h: number; target: string; spawn: string };
}

export interface ZoneDef {
  id: string;
  name: string;
  rect: Rect;
}

export interface AnchorDef {
  id: string;
  x: number;
  y: number;
  zoneId: string;
}

export type Terrain = 'grass' | 'lawn' | 'path' | 'plaza' | 'track' | 'court';

export interface GroundPatch {
  rect: Rect;
  terrain: Terrain;
}

export type PropKind =
  | 'ginkgo'
  | 'pine'
  | 'tree'
  | 'bush'
  | 'flower'
  | 'lamp'
  | 'bench'
  | 'sign'
  | 'stone'
  | 'fence'
  | 'flag'
  | 'pavilion'
  | 'lotus';

export interface PropDef {
  kind: PropKind;
  x: number;
  y: number;
  flip?: boolean;
  label?: string;
  scale?: number;
}

export interface CampusMap {
  id: string;
  name: string;
  width: number;
  height: number;
  patches: GroundPatch[];
  waters: Rect[];
  buildings: BuildingDef[];
  blockers: Rect[];
  zones: ZoneDef[];
  anchors: AnchorDef[];
  props: PropDef[];
  spawn: { x: number; y: number };
}

export interface InteriorDef {
  id: string;
  name: string;
  width: number;
  height: number;
  wallColor: number;
  floorColor: number;
  furniture: Array<{ rect: Rect; color: number; label?: string }>;
  exit: { x: number; y: number; w: number; h: number };
  spawn: { x: number; y: number };
  zone: ZoneDef;
  anchors: AnchorDef[];
}
