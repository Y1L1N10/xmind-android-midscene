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

// ─── 应用版本 ───────────────────────────────────────────────
/** 应用版本：海外版(overseas) / 国内版(china) / 鸿蒙(harmony) */
export type AppVariant = 'overseas' | 'china' | 'harmony';

/**
 * 获取当前应用版本
 * 优先级：VARIANT 环境变量 > 平台自动推断
 * - harmony 平台 → harmony
 * - android 平台默认 overseas，可通过 VARIANT=china 覆盖
 */
export function getVariant(): AppVariant {
  const env = process.env.VARIANT?.toLowerCase();
  if (env === 'china') return 'china';
  if (env === 'harmony') return 'harmony';
  if (env === 'overseas') return 'overseas';
  return isHarmony() ? 'harmony' : 'overseas';
}

// ─── 功能特性检测 ────────────────────────────────────────────
/** 是否有 Google 快捷登录 */
export const hasGoogleLogin = () => getVariant() === 'overseas';
/** 是否有 Apple 快捷登录 */
export const hasAppleLogin = () => getVariant() === 'overseas';
/** 是否有 SSO 登录 */
export const hasSSOLogin = () => getVariant() === 'overseas';
/** 是否有华为一键登录（登录页首屏） */
export const hasHuaweiLogin = () => getVariant() === 'harmony';
/** 验证码登录是否使用邮箱（否则用手机号） */
export const hasEmailVerification = () => getVariant() === 'overseas';
/** 进入登录页是否需要跳过华为一键登录首屏 */
export const hasHuaweiEntryPage = () => getVariant() === 'harmony';
