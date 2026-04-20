/**
 * 通过 ADB 从设备短信收件箱读取 XMind 验证码
 *
 * 短信格式：【Xmind思维导图】验证码：175212，您正在进行注册/登录验证...
 */
import { execSync } from 'node:child_process';

function readLatestSmsCode(sinceTime: number, deviceSerial?: string): string | null {
  // 设备端 shell 会再次解析参数，> 必须包在引号里防止被当作重定向。
  // 用单引号包整条 shell 命令，内部 --sort 和 --where 用双引号。
  const serialFlag = deviceSerial ? `-s ${deviceSerial} ` : '';
  const inner = `content query --uri content://sms/inbox --sort "date DESC" --where "date>${sinceTime}"`;
  const raw = execSync(
    `adb ${serialFlag}shell '${inner}'`,
    { encoding: 'utf-8', timeout: 10000 },
  );

  if (!raw || raw.includes('No result found')) return null;

  // 逐行解析，找第一条包含 Xmind 的短信
  for (const line of raw.split('\n')) {
    if (!line.includes('Xmind')) continue;

    const bodyMatch = line.match(/body=(.*?)(?:,\s*\w+=|$)/);
    if (!bodyMatch) continue;

    const codeMatch = bodyMatch[1].match(/验证码[：:]\s*(\d{4,8})/);
    if (codeMatch) return codeMatch[1];
  }

  return null;
}

/**
 * 轮询 ADB 短信获取最新的 XMind 验证码
 * @param maxWaitMs 最大等待时间，默认 60 秒
 * @param pollIntervalMs 轮询间隔，默认 5 秒
 */
export async function fetchSmsCode(
  options: { deviceSerial?: string; maxWaitMs?: number; pollIntervalMs?: number } = {},
): Promise<string> {
  const { deviceSerial, maxWaitMs = 60000, pollIntervalMs = 5000 } = options;
  const sinceTime = Date.now() - 60_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const code = readLatestSmsCode(sinceTime, deviceSerial);
      if (code) {
        console.log(`[SMS] 获取到验证码: ${code}`);
        return code;
      }
    } catch (err) {
      console.log(`[SMS] 查询失败: ${err}`);
    }
    console.log(`[SMS] 未找到验证码，${pollIntervalMs / 1000}s 后重试...`);
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`未能在 ${maxWaitMs / 1000} 秒内从短信获取到验证码`);
}
