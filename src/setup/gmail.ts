/**
 * 通过 IMAP 从 Gmail 读取 XMind 验证码
 *
 * 需要在 .env 中配置：
 *   GMAIL_USER=yyilin000@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */
// @ts-expect-error imapflow 没有类型声明
import { ImapFlow } from 'imapflow';

async function searchLatestCode(sinceTime: number): Promise<string | null> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // IMAP since 只精确到天，搜今天的然后代码里过滤时间
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messages = await client.search({
        from: 'notifications@mail.xmind.net',
        since: today,
      });

      if (!messages.length) return null;

      // 取最新一封
      const latest = messages[messages.length - 1];
      const msg = await client.fetchOne(latest, { source: true, envelope: true });

      // 检查邮件时间是否在 sinceTime 之后
      const msgDate = msg.envelope?.date ? new Date(msg.envelope.date).getTime() : 0;
      if (msgDate < sinceTime) {
        console.log(`[Gmail] 最新邮件时间 ${new Date(msgDate).toLocaleTimeString()} 早于请求时间，跳过`);
        return null;
      }

      const body = msg.source.toString();

      // HTML: is: <span ...>812445</span>
      // 纯文本: is:\n419530
      const match = body.match(/code\s+for\s+Xmind\s+is:[\s\S]*?>(\d{4,8})<\/span>/i)
        || body.match(/code\s+for\s+Xmind\s+is:\s*[\r\n]*\s*(\d{4,8})/i);

      return match ? match[1] : null;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * 轮询 Gmail 获取最新的 XMind 验证码
 * @param maxWaitMs 最大等待时间，默认 60 秒
 * @param pollIntervalMs 轮询间隔，默认 5 秒
 */
export async function fetchVerificationCode(
  maxWaitMs = 60000,
  pollIntervalMs = 5000,
): Promise<string> {
  // 记录请求发起时间，只接受之后收到的邮件
  const sinceTime = Date.now() - 60_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const code = await searchLatestCode(sinceTime);
      if (code) {
        console.log(`[Gmail] 获取到验证码: ${code}`);
        return code;
      }
    } catch (err) {
      console.log(`[Gmail] 查询失败: ${err}`);
    }
    console.log(`[Gmail] 未找到验证码，${pollIntervalMs / 1000}s 后重试...`);
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`未能在 ${maxWaitMs / 1000} 秒内从 Gmail 获取到验证码`);
}
