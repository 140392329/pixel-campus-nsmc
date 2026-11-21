export const TILE = 32;
export const GAME_W = 960;
export const GAME_H = 540;
export const CAMERA_ZOOM = 2;
export const PLAYER_SPEED = 150;
export const INTERACT_DIST = 64;

export const SAVE_KEY = 'cbmu.save.v1';
export const SETTINGS_KEY = 'cbmu.settings.v1';
export const MEMORY_KEY = 'cbmu.memory.v1';

export const DEFAULT_SETTINGS = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
  playerName: '同学',
  clockSpeed: 1,
};

/** 系统是否开启"减少动态效果"。用于跳过 tween / 相机淡入淡出。 */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
