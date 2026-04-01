/**
 * 平台抽象层：通过环境变量 PLATFORM 切换 Android / HarmonyOS
 *
 * 用法：
 *   PLATFORM=harmony npm test      # 在鸿蒙设备上运行
 *   PLATFORM=android npm test      # 在安卓设备上运行（默认）
 *   npm test                       # 默认安卓
 */

import type { AndroidAgent, AndroidDevice } from '@midscene/android';
import type { HarmonyAgent, HarmonyDevice } from '@midscene/harmony';

// ─── 平台类型 ───────────────────────────────────────────────
export type Platform = 'android' | 'harmony';

/** 统一的 Agent 类型（两者的 AI 方法完全一致） */
export type UnifiedAgent = AndroidAgent | HarmonyAgent;

/** 统一的 Device 类型 */
export type UnifiedDevice = AndroidDevice | HarmonyDevice;

// ─── 平台检测 ───────────────────────────────────────────────
export function getPlatform(): Platform {
  const env = (process.env.PLATFORM ?? 'android').toLowerCase();
  if (env === 'harmony' || env === 'harmonyos') return 'harmony';
  return 'android';
}

export function isHarmony(): boolean {
  return getPlatform() === 'harmony';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}
