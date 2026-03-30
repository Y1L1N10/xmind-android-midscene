import { describe, it, beforeEach } from 'vitest';
import { sleep } from '@midscene/core/utils';
import { setupAndroidTest } from '../src/setup/testBase';

const TEST_EMAIL = 'yilin@xmind.net';
const TEST_PASSWORD = 'xmindyilin';
const WRONG_PASSWORD = 'wrong_password_123';

// clearData: true → 每次用例前 pm clear，确保未登录状态
const { getAgent } = setupAndroidTest('xmind-login-report', { clearData: true });

describe('XMind 登录模块', () => {

  beforeEach(async () => {
    const agent = getAgent();
    await agent.aiTap('左侧导航栏中的"登录"按钮');
    // 等登录页真正渲染完毕再继续，避免 pm clear 冷启动后页面还在加载
    await agent.aiWaitFor('页面显示邮箱输入框和密码输入框', { timeoutMs: 15000 });
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
    await sleep(1000);
    await agent.aiAssert('"验证码登录"Tab 为当前选中状态');
  });

  it('邮箱为空点击登录', async () => {
    const agent = getAgent();
    await agent.aiTap('登录按钮');
    await sleep(1000);
    await agent.aiAssert('页面提示邮箱不能为空，或登录按钮不可点击');
  });

  it('密码为空点击登录', async () => {
    const agent = getAgent();
    await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
    await agent.aiTap('登录按钮');
    await sleep(1000);
    await agent.aiAssert('页面提示密码不能为空，或登录按钮不可点击');
  });

  it('密码错误提示', async () => {
    const agent = getAgent();
    await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
    await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
    await agent.aiTap('登录按钮');
    await sleep(3000);
    await agent.aiAssert('页面显示密码错误的提示信息');
  });

  it('密码可见性切换', async () => {
    const agent = getAgent();
    await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
    await agent.aiAssert('密码输入框的内容被遮挡显示为圆点');
    await agent.aiTap('密码输入框右侧的眼睛图标');
    await sleep(500);
    await agent.aiAssert('密码输入框的内容变为明文可见');
  });

  it('正确账号密码登录成功', async () => {
    const agent = getAgent();
    await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
    await agent.aiInput('密码输入框', { value: TEST_PASSWORD });
    await agent.aiTap('登录按钮');
    await sleep(5000);
    await agent.aiAssert('已离开登录页面，回到应用主界面且出现"我的导图"或者"My Works"');
  });
});
