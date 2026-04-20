import { describe, it, beforeEach } from 'vitest';
import { setupAndroidTest } from '../../src/setup/testBase';
import { fetchSmsCode } from '../../src/setup/sms';

const TEST_EMAIL = 'yilin@xmind.com';
const TEST_PASSWORD = 'xmindyilin';
const WRONG_PASSWORD = 'wrong_password_123';
const HUAWEI_PHONE = process.env.HUAWEI_PHONE!;
const HUAWEI_PASSWORD = process.env.HUAWEI_PASSWORD!;
const CN_LOGIN_PHONE = process.env.CN_LOGIN_PHONE!;
const CN_DEVICE_SERIAL = process.env.CN_DEVICE_SERIAL;

const WAIT_OPTS = { timeoutMs: 30000, checkIntervalMs: 5000 };

const { getAgent } = setupAndroidTest('xmind-cn-login-report', {
  clearData: true,
  deviceSerial: CN_DEVICE_SERIAL,
  waitForReady: '页面显示"服务条款和隐私政策"标题，或显示"在线导图"分组，或显示"密码登录"Tab',
});

/** 关闭一键登录弹窗：等弹窗加载后直接点"其他方式登录"，不做 AI 判断（更快） */
async function dismissQuickLoginPopup(agent: ReturnType<typeof getAgent>) {
  await new Promise((r) => setTimeout(r, 1500));
  await agent.aiTap('弹窗底部"其他方式登录 >"链接（蓝色文字带右箭头）');
  await new Promise((r) => setTimeout(r, 800));
}

describe('XMind CN 登录模块', () => {

  beforeEach(async () => {
    const agent = getAgent();
    const hasAgreement = await agent.aiBoolean('页面显示"服务条款和隐私政策"标题和"同意使用"按钮');
    if (hasAgreement) {
      await agent.aiTap('页面底部右侧的橙色填充矩形"同意使用"按钮（白色文字，与左侧"不同意"文字按钮并列）');
      await new Promise((r) => setTimeout(r, 1500));
    }
    // 登录页判定：出现"密码登录"/"验证码登录"Tab 或邮箱/手机号输入框
    // 主页判定：出现"在线导图"或"本地导图"分组
    await agent.aiWaitFor('页面显示"密码登录"和"验证码登录"两个Tab，或页面显示"在线导图"和"本地导图"分组', WAIT_OPTS);
    const onHomePage = await agent.aiBoolean('页面显示"在线导图"和"本地导图"分组（首页布局）');
    if (onHomePage) {
      await agent.aiTap('"在线导图"分组下的"登录"按钮（带头像图标的圆角矩形按钮）');
      await agent.aiWaitFor('页面显示"密码登录"和"验证码登录"两个Tab', WAIT_OPTS);
    }
  });

  // ===================== P0 - 核心登录流程 =====================
  describe('P0 - 核心登录流程', () => {
    it('登录页面元素完整', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiAssert(
        '页面顶部显示"登录 Xmind 账户"标题；' +
        '存在"密码登录"和"验证码登录"两个Tab，"密码登录"为选中状态；' +
        '有邮箱输入框和密码输入框；有登录按钮；' +
        '有"忘记密码?"和"创建账户"链接；' +
        '页面底部有"我已阅读并同意"勾选框，包含"服务条款"和"隐私政策"链接；' +
        '有华为第三方登录图标' +
        '有苹果第三方登录图标',
      );
    });

    it('未勾选协议时登录被阻止', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
      await agent.aiInput('密码输入框', { value: TEST_PASSWORD });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面出现提示需要同意服务条款', { timeoutMs: 10000, checkIntervalMs: 3000 });
      await agent.aiAssert('仍停留在登录页面，未跳转到导图页');
    });

    it('一键登录成功', async () => {
      const agent = getAgent();
      const hasPopup = await agent.aiBoolean('页面底部弹出含"一键登录"按钮的弹窗');
      if (!hasPopup) {
        console.log('[跳过] 当前设备无 SIM 卡，不弹出一键登录');
        return;
      }
      await agent.aiTap('弹窗中"我已阅读并同意"前面的勾选框');
      await agent.aiTap('"一键登录"按钮');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"', WAIT_OPTS);
    });

    it('密码登录成功', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiTap('"我已阅读并同意"前面的勾选框');
      await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
      await agent.aiInput('密码输入框', { value: TEST_PASSWORD });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"', WAIT_OPTS);
    });

    it('手机验证码登录成功', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiTap('"我已阅读并同意"前面的勾选框');
      await agent.aiTap('"验证码登录"Tab');
      await agent.aiWaitFor('"验证码登录"Tab 为当前选中状态', { timeoutMs: 5000 });
      await agent.aiInput('手机号输入框', { value: CN_LOGIN_PHONE });
      await agent.aiTap('获取验证码按钮');
      // 阿里云"请完成安全验证"弹窗：勾选"确认您不是机器人"复选框
      await agent.aiWaitFor('页面弹出"请完成安全验证"弹窗，包含"确认您不是机器人"文字和左侧复选框，右下角有 Alibaba Cloud 标识', { timeoutMs: 15000, checkIntervalMs: 3000 });
      await agent.aiTap('"确认您不是机器人"文字左侧的方形复选框');
      await agent.aiWaitFor('获取验证码按钮显示倒计时数字（如"59s"、"58s"等）或"已发送"文字，而非初始的"获取验证码"文字或加载中的三个点', { timeoutMs: 30000, checkIntervalMs: 3000 });

      const code = await fetchSmsCode({ deviceSerial: CN_DEVICE_SERIAL });
      await agent.aiInput('验证码输入框', { value: code });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"', WAIT_OPTS);
    });

    it('华为快捷登录成功', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiTap('"我已阅读并同意"前面的勾选框');
      await agent.aiTap('"第三方快捷登录"下方的华为图标按钮（红色 H 字样的圆形图标）');
      await agent.aiWaitFor('跳转到华为账号登录页面', { timeoutMs: 15000, checkIntervalMs: 3000 });

      await agent.aiInput('手机号或邮箱输入框', { value: HUAWEI_PHONE });
      await agent.aiTap('下一步按钮或继续按钮');
      await agent.aiWaitFor('显示密码输入框', { timeoutMs: 10000, checkIntervalMs: 3000 });

      await agent.aiInput('密码输入框', { value: HUAWEI_PASSWORD });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面显示"我的导图"或"My Works"或“在最近页的导图名字旁边有云图标”', WAIT_OPTS);
    });
  });

  // ===================== P1 - 异常与校验 =====================
  describe('P1 - 异常与校验', () => {
    it('密码错误提示', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiTap('"我已阅读并同意"前面的勾选框');
      await agent.aiInput('邮箱输入框', { value: TEST_EMAIL });
      await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
      await agent.aiTap('登录按钮');
      await agent.aiWaitFor('页面出现红色提示文字', { timeoutMs: 10000, checkIntervalMs: 3000 });
      await agent.aiAssert('页面显示密码错误的提示信息');
    });
  });

  // ===================== P2 - UI 交互与展示 =====================
  describe('P2 - UI 交互与展示', () => {
    it('密码可见性切换', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiInput('密码输入框', { value: WRONG_PASSWORD });
      await agent.aiAssert('密码输入框的内容被遮挡显示为圆点');
      await agent.aiTap('密码输入框右侧的眼睛图标');
      await agent.aiWaitFor('密码输入框的内容变为明文可见', { timeoutMs: 5000 });
    });

    it('一键登录弹窗 - 天翼账号认证服务条款跳转', async () => {
      const agent = getAgent();
      // 不关闭一键登录弹窗，直接点蓝色"天翼账号认证服务条款"链接
      await agent.aiTap('一键登录弹窗中"我已阅读并同意"行的蓝色"天翼账号认证服务条款"链接文字');
      await agent.aiWaitFor('页面顶部标题为"服务与隐私协议"，列表中包含"天翼账号服务协议"和"天翼账号隐私政策"两项', { timeoutMs: 15000, checkIntervalMs: 3000 });
    });

    it('服务条款跳转浏览器', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiTap('"我已阅读并同意"行中的"服务条款"链接文字');
      await agent.aiWaitFor('浏览器页面内容包含"服务条款"', { timeoutMs: 15000, checkIntervalMs: 3000 });
    });

    it('隐私政策跳转浏览器', async () => {
      const agent = getAgent();
      await dismissQuickLoginPopup(agent);
      await agent.aiTap('"我已阅读并同意"行中的"隐私政策"链接文字');
      await agent.aiWaitFor('浏览器页面内容包含"Xmind安卓版隐私政策"', { timeoutMs: 15000, checkIntervalMs: 3000 });
    });
  });
});
