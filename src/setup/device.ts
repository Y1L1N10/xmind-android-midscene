import { getPlatform, isHarmony, type UnifiedAgent, type UnifiedDevice } from './platform';

// ─── 应用包名 / Bundle Name ─────────────────────────────────
/** Android 包名 */
export const XMIND_PACKAGE = 'net.xmind.doughnut';
/** HarmonyOS Bundle Name（请根据实际鸿蒙包名修改） */
export const XMIND_HARMONY_BUNDLE = 'app.xmind.cronut';

/** 根据当前平台返回正确的应用标识 */
export function getAppId(): string {
  return isHarmony() ? XMIND_HARMONY_BUNDLE : XMIND_PACKAGE;
}

export const XMIND_LOGIN_ACTIVITY = `${XMIND_PACKAGE}/net.xmind.bagel.user.ui.WebLoginActivity`;

// ─── 创建 Agent ──────────────────────────────────────────────
export async function createAgent(testName: string): Promise<{ device: UnifiedDevice; agent: UnifiedAgent }> {
  if (isHarmony()) {
    return createHarmonyAgent(testName);
  }
  return createAndroidAgent(testName);
}

const AI_ACTION_CONTEXT =
  '遇到权限弹窗、用户协议弹窗，点击同意或关闭。遇到登录提示，关闭即可。遇到广告弹窗，关闭。';

async function createAndroidAgent(testName: string) {
  const { AndroidDevice, AndroidAgent, getConnectedDevices } = await import('@midscene/android');
  const devices = await getConnectedDevices();
  if (!devices.length) throw new Error('没有找到 ADB 设备，请检查连接');

  const device = new AndroidDevice(devices[0].udid, {
    scrcpyConfig: { enabled: true },
  });
  await device.connect();

  const agent = new AndroidAgent(device, {
    groupName: testName,
    aiActionContext:
      AI_ACTION_CONTEXT +
      '遇到 Google 密码管理器或系统自动填充弹窗，点击"永不"或关闭。',
  });

  return { device, agent };
}

async function createHarmonyAgent(testName: string) {
  const { HarmonyDevice, HarmonyAgent, getConnectedDevices } = await import('@midscene/harmony');
  const devices = await getConnectedDevices();
  if (!devices.length) throw new Error('没有找到 HDC 设备，请检查连接（hdc list targets）');

  const device = new HarmonyDevice(devices[0].deviceId);
  await device.connect();

  const agent = new HarmonyAgent(device, {
    groupName: testName,
    aiActionContext: AI_ACTION_CONTEXT,
  });

  return { device, agent };
}

// ─── 禁用系统弹窗干扰 ───────────────────────────────────────
export async function disableSystemPopups(agent: UnifiedAgent) {
  if (isHarmony()) {
    // 鸿蒙暂无需额外禁用系统弹窗，可根据实际情况补充
    return;
  }
  const androidAgent = agent as import('@midscene/android').AndroidAgent;
  await androidAgent.runAdbShell('settings put secure autofill_service null');
  await androidAgent.runAdbShell('settings put secure credential_service null');
  await androidAgent.runAdbShell('ime disable com.google.android.inputmethod.latin/.LatinIME 2>/dev/null || true');
}

// ─── Shell 命令封装 ──────────────────────────────────────────
/** 在当前平台设备上执行 shell 命令 */
export async function runShell(agent: UnifiedAgent, command: string): Promise<string> {
  if (isHarmony()) {
    return (agent as import('@midscene/harmony').HarmonyAgent).runHdcShell(command);
  }
  return (agent as import('@midscene/android').AndroidAgent).runAdbShell(command);
}

// ─── 应用状态管理 ────────────────────────────────────────────
/**
 * 强制停止应用（保留数据）
 */
export async function forceStopApp(agent: UnifiedAgent, appId?: string) {
  const id = appId ?? getAppId();
  if (isHarmony()) {
    await runShell(agent, `aa force-stop -b ${id}`);
  } else {
    await runShell(agent, `am force-stop ${id}`);
  }
}

/**
 * 清除应用数据（登录状态、本地文件等全部重置）
 */
export async function clearAppData(agent: UnifiedAgent, appId?: string) {
  const id = appId ?? getAppId();
  if (isHarmony()) {
    // -d 清除数据，-c 仅清缓存；两者都清确保完全重置
    await runShell(agent, `bm clean -n ${id} -d -c`);
  } else {
    await runShell(agent, `pm clear ${id}`);
  }
}

/**
 * 直接启动指定 Activity（仅 Android）
 * 鸿蒙请使用 agent.launch(bundleName) 启动
 */
export async function launchActivity(agent: UnifiedAgent, activity: string) {
  if (isHarmony()) {
    console.warn('[Platform] launchActivity 仅支持 Android，鸿蒙请使用 agent.launch(bundleName)');
    return;
  }
  await runShell(agent, `am start -n ${activity}`);
}
