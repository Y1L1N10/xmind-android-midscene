import { AndroidDevice, AndroidAgent, getConnectedDevices } from '@midscene/android';

export const XMIND_PACKAGE = 'net.xmind.doughnut';
export const XMIND_LOGIN_ACTIVITY = `${XMIND_PACKAGE}/net.xmind.bagel.user.ui.WebLoginActivity`;

export async function createAgent(
  testName: string,
  deviceSerial?: string,
  groupDescription?: string,
) {
  const devices = await getConnectedDevices();
  if (!devices.length) throw new Error('没有找到 adb 设备，请检查连接');

  const target = deviceSerial
    ? devices.find((d) => d.udid === deviceSerial)
    : devices[0];
  if (!target) {
    throw new Error(
      `找不到指定设备 ${deviceSerial}，已连接设备：${devices.map((d) => d.udid).join(', ')}`,
    );
  }

  const device = new AndroidDevice(target.udid, {
    scrcpyConfig: { enabled: true },
  });
  await device.connect();

  const agent = new AndroidAgent(device, {
    groupName: testName,
    groupDescription: groupDescription ?? testName,
    aiActionContext:
      '遇到权限弹窗、用户协议弹窗，点击同意或关闭。遇到登录提示，关闭即可。遇到广告弹窗，关闭。' +
      '遇到 Google 密码管理器或系统自动填充弹窗，点击"永不"或关闭。',
  });

  return { device, agent };
}

/**
 * 禁用系统弹窗干扰（自动填充、密码管理器、输入法候选等）
 * 建议在测试套件最开始调用一次
 */
export async function disableSystemPopups(agent: AndroidAgent) {
  await agent.runAdbShell('settings put secure autofill_service null');
  await agent.runAdbShell('settings put secure credential_service null');
  await agent.runAdbShell('ime disable com.google.android.inputmethod.latin/.LatinIME 2>/dev/null || true');
}

/**
 * 强制停止应用（保留数据）
 */
export async function forceStopApp(agent: AndroidAgent, pkg = XMIND_PACKAGE) {
  await agent.runAdbShell(`am force-stop ${pkg}`);
}

/**
 * 清除应用数据（登录状态、本地文件等全部重置）
 */
export async function clearAppData(agent: AndroidAgent, pkg = XMIND_PACKAGE) {
  await agent.runAdbShell(`pm clear ${pkg}`);
}

/**
 * 直接启动指定 Activity，跳过主页导航
 */
export async function launchActivity(agent: AndroidAgent, activity: string) {
  await agent.runAdbShell(`am start -n ${activity}`);
}
