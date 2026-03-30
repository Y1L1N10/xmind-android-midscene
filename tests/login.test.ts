import { describe, it, beforeEach } from 'vitest';
import { setupAndroidTest } from '../src/setup/testBase';

const TEST_EMAIL = 'yilin@xmind.net';
const TEST_PASSWORD = 'xmindyilin';
const WRONG_PASSWORD = 'wrong_password_123';

// checkIntervalMs: 5000 — 登录页冷启动需 6-8 秒，减少无效轮询
const WAIT_OPTS = { timeoutMs: 15000, checkIntervalMs: 5000 };

// clearData: true → 每次用例前 pm clear，确保未登录状态
const { getAgent } = setupAndroidTest('xmind-login-report', {
  clearData: true,
  waitForReady: '左侧导航栏中有"登录"按钮',
});

describe('XMind 登录模块', () => {

  beforeEach(async () => {
    const agent = getAgent();
    await agent.aiTap('左侧导航栏中的"登录"按钮');
    // 登录页冷启动慢，用较长间隔轮询避免浪费 AI 调用
    await agent.aiWaitFor('页面显示邮箱输入框和密码输入框', WAIT_OPTS);
  });

  it('登录页面元素完整', async () => {
    const agent = getAgent();
    await agent.aiAssert(
      '页面顶部显示"登录 Xmind 账户"标题；' +
      '存在"密码登录"和"验证码登录"两个Tab，"密码登录"为选中状态；' +
      '有邮箱输入框（placeholder"输入邮箱/Xmind帐号"）和密码输入框（placeholder"输入密码"）；' +
      '密码输入框右侧有可见性切换图标；' +
      '有登录按钮；' +
      '有"忘记密码?"和"创建账户"链接；' +
      '有 Apple、Google、SSO 三种第三方登录图标；' +
      '底部有服务条款和隐私政策提示文字',
    );
  });

  it('切换到验证码登录Tab', async () => {
    const agent = getAgent();
    await agent.aiTap('"验证码登录"Tab');
    // aiWaitFor 成功即可，不需要再跟一个相同内容的 aiAssert
    await agent.aiWaitFor('"验证码登录"Tab 为当前选中状态', { timeoutMs: 5000 });
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

  it('密码错误提示', async () => {
    const agent = getAgent();
    await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
    await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
    await agent.aiTap('登录按钮');
    // 等待网络请求返回错误提示，间隔稍长
    await agent.aiWaitFor('页面出现红色提示文字', { timeoutMs: 10000, checkIntervalMs: 3000 });
    await agent.aiAssert('页面显示密码错误的提示信息');
  });

  it('密码可见性切换', async () => {
    const agent = getAgent();
    await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
    await agent.aiAssert('密码输入框的内容被遮挡显示为圆点');
    await agent.aiTap('密码输入框右侧的眼睛图标');
    // aiWaitFor 成功即断言通过
    await agent.aiWaitFor('密码输入框的内容变为明文可见', { timeoutMs: 5000 });
  });

  it('正确账号密码登录成功', async () => {
    const agent = getAgent();
    await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
    await agent.aiInput('密码输入框', { value: TEST_PASSWORD });
    await agent.aiTap('登录按钮');
    // 登录需网络请求+页面跳转，间隔 5 秒避免在加载中浪费轮询
    await agent.aiWaitFor('页面显示"我的导图"或"My Works"', { timeoutMs: 15000, checkIntervalMs: 5000 });
  });
});
