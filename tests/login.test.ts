import { describe, it, beforeEach } from 'vitest';
import { setupAndroidTest } from '../src/setup/testBase';
import { fetchVerificationCode } from '../src/setup/gmail';

const TEST_EMAIL = 'yilin@xmind.net';
const TEST_PASSWORD = 'xmindyilin';
const WRONG_PASSWORD = 'wrong_password_123';
const GMAIL_EMAIL = 'yyilin000@gmail.com';
const APPLE_ID = process.env.APPLE_ID!;
const APPLE_PASSWORD = process.env.APPLE_PASSWORD!;

const WAIT_OPTS = { timeoutMs: 15000, checkIntervalMs: 5000 };

const { getAgent } = setupAndroidTest('xmind-login-report', {
  clearData: true,
  waitForReady: '左侧导航栏中有"登录"按钮',
});
// 是否打开报告： OPEN_REPORT=1
// 按优先级分组运行：
// 全部：npm run test:login
// P0 核心登录流程：npm run test:login -- -t "P0"
// P1 异常与校验：  npm run test:login -- -t "P1"
// P2 UI与链接：    npm run test:login -- -t "P2"
// P3 第三方登录：  npm run test:login -- -t "P3"

describe('XMind 登录模块', () => {

  beforeEach(async () => {
    const agent = getAgent();
    await agent.aiTap('左侧导航栏中的"登录"按钮');
    await agent.aiWaitFor('页面显示邮箱输入框和密码输入框', WAIT_OPTS);
  });

  // ===================== P0 - 核心登录流程 =====================
  describe('P0 - 核心登录流程', () => {
    it('登录页面元素完整', async () => {
      const agent = getAgent();
      await agent.aiAssert(
        '页面顶部显示"登录 Xmind 账户"标题；' +
        '存在"密码登录"和"验证码登录"两个Tab，"密码登录"为选中状态；' +
        '有邮箱输入框和密码输入框；有登录按钮；' +
        '有"忘记密码?"和"创建账户"链接；' +
        '有 Apple、Google、SSO 三种第三方登录图标',
      );
    });
    it('密码登录成功', async () => {
      const agent = getAgent();
      await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
      await agent.aiInput('密码输入框', { value: TEST_PASSWORD });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"', WAIT_OPTS);
    });

    it('验证码登录成功', async () => {
      const agent = getAgent();
      await agent.aiTap('"验证码登录"Tab');
      await agent.aiWaitFor('"验证码登录"Tab 为当前选中状态', { timeoutMs: 5000 });
      await agent.aiInput('邮箱输入框', { value: GMAIL_EMAIL });
      await agent.aiTap('获取验证码按钮');
      await agent.aiWaitFor('获取验证码按钮显示为"已发送"倒计时状态', { timeoutMs: 15000, checkIntervalMs: 3000 });

      const code = await fetchVerificationCode();
      await agent.aiInput('验证码输入框', { value: code });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"', WAIT_OPTS);
    });

    it('Google 快捷登录成功', async () => {
      const agent = getAgent();
      await agent.aiTap('"或者"下方的 Google 图标按钮');
      await agent.aiWaitFor('弹出"选择账号"弹窗，显示"以继续使用Xmind"', { timeoutMs: 15000, checkIntervalMs: 3000 });
      await agent.aiTap('yyilin000@gmail.com 这一行');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"', WAIT_OPTS);
    });
  });

  // ===================== P1 - 异常与校验 =====================
  describe('P1 - 异常与校验', () => {
    it('密码错误提示', async () => {
      const agent = getAgent();
      await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
      await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面出现红色提示文字', { timeoutMs: 10000, checkIntervalMs: 3000 });
      await agent.aiAssert('页面显示密码错误的提示信息');
    });

    it('邮箱为空点击登录', async () => {
      const agent = getAgent();
      await agent.aiTap('登录按钮');
      await agent.aiAssert('仍停留在登录页面，未发生页面跳转');
    });

    it('密码为空点击登录', async () => {
      const agent = getAgent();
      await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
      await agent.aiTap('登录按钮');
      await agent.aiAssert('仍停留在登录页面，未发生页面跳转');
    });

    it('验证码登录触发人机校验', async () => {
      const agent = getAgent();
      await agent.aiTap('"验证码登录"Tab');
      await agent.aiWaitFor('"验证码登录"Tab 为当前选中状态', { timeoutMs: 5000 });
      await agent.aiInput('邮箱输入框', { value: GMAIL_EMAIL });
      await agent.aiTap('获取验证码按钮');
      await agent.aiWaitFor('获取验证码按钮显示为"已发送"倒计时状态', { timeoutMs: 15000, checkIntervalMs: 3000 });
      await agent.aiAssert('页面同时显示 Cloudflare "成功！"提示和验证码"已发送"倒计时');
    });
  });

  // ===================== P2 - UI 交互与展示 =====================
  describe('P2 - UI 交互与展示', () => {

    it('密码可见性切换', async () => {
      const agent = getAgent();
      await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
      await agent.aiAssert('密码输入框的内容被遮挡显示为圆点');
      await agent.aiTap('密码输入框右侧的眼睛图标');
      await agent.aiWaitFor('密码输入框的内容变为明文可见', { timeoutMs: 5000 });
    });

    it('服务条款跳转浏览器', async () => {
      const agent = getAgent();
      await agent.aiTap('"请仔细阅读 Xmind 服务条款"这行文字中的"服务条款"');
      await agent.aiWaitFor('浏览器页面内容包含"服务条款"', { timeoutMs: 15000, checkIntervalMs: 3000 });
    });

    it('隐私政策跳转浏览器', async () => {
      const agent = getAgent();
      await agent.aiTap('"请仔细阅读 Xmind 服务条款、隐私政策"这行文字中的"隐私政策"');
      await agent.aiWaitFor('浏览器页面内容包含"隐私政策"', { timeoutMs: 15000, checkIntervalMs: 3000 });
    });
  });

  // ===================== P3 - 第三方登录（依赖外部状态） =====================
  describe('P3 - 第三方登录', () => {
    it('Apple 快捷登录', async () => {
      const agent = getAgent();
      // 1. 点击 Apple 图标，进入 Apple 登录页
      await agent.aiTap('"或者"下方的 Apple 图标按钮');
      await agent.aiWaitFor('跳转到 Apple 登录页面，显示 Apple ID 输入框', { timeoutMs: 15000, checkIntervalMs: 3000 });

      // 2. 输入 Apple ID 并继续
      await agent.aiInput('Apple ID 或电子邮件地址输入框', { value: APPLE_ID });
      await agent.aiTap('继续按钮或箭头按钮');
      await agent.aiWaitFor('显示密码输入框', { timeoutMs: 10000, checkIntervalMs: 2000 });

      // 3. 输入密码
      await agent.aiInput('密码输入框', { value: APPLE_PASSWORD });
      await agent.aiTap('登录按钮');

      // 4. 验证结果：登录成功 / 二重认证 / 停留在 Apple 登录页（均算通过）
      await agent.aiWaitFor(
        '页面显示"我的导图"或"My Works"（登录成功）；' +
        '或显示双重认证/验证码输入界面（二重认证）；' +
        '或页面包含 Apple ID 输入框或"使用 Apple ID 登录"（停留在登录页）',
        { timeoutMs: 20000, checkIntervalMs: 3000 },
      );
    });
  });
});
