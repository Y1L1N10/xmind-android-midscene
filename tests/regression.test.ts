import { describe, it } from 'vitest';
import { sleep } from '@midscene/core/utils';
import { setupAndroidTest } from '../src/setup/testBase';

/**
 * 内核兼容性回归测试
 *
 * 背景：donut 项目目标是 ES2015，但新内核 vk 用了 Object.hasOwn (ES2022) 等
 * 高版本 API，导致旧浏览器内核（iOS Safari < 15.4 / Chrome < 99 / Firefox < 92）
 * 的用户打开导图时直接报错白屏。
 *
 * 目的：每次更新内核后，在低版本测试机上跑一遍，验证导图能正常打开渲染。
 *
 * 目标设备：ALNYUN2C26H01586（低版本 Android，旧 WebView 内核）
 *
 * 运行方式：
 *   npm run test:regression                          # 运行全部回归用例
 *   OPEN_REPORT=1 npm run test:regression            # 运行后自动打开报告
 *   npm run test:regression -- -t "白屏"             # 按用例名关键词筛选
 *
 * 前置条件：
 *   1. 设备 ALNYUN2C26H01586 已通过 adb 连接（adb devices 可见）
 *   2. 设备上 XMind 已登录
 *   3. "本地文件"中存在名为"全元素测试图"的导图
 *   4. "所有导图"中至少有一份导图
 *   5. 每次更新内核后跑一遍，确保新内核在旧 WebView 上仍可渲染
 */

/** 列表加载等待：旧设备较慢，给足超时 */
const LIST_WAIT = { timeoutMs: 20000, checkIntervalMs: 3000 };
/** 打开导图后的渲染等待：业务上限 10 秒（白屏判定阈值） */
const RENDER_WAIT = { timeoutMs: 10000, checkIntervalMs: 3000 };

const { getAgent } = setupAndroidTest('xmind-regression-report', {
  autoLaunch: true,
  deviceSerial: 'ALNYUN2C26H01586',
  waitForReady: '应用主界面已加载完成',
});

describe('XMind 内核兼容性回归', () => {
  it('打开本地文件中的"全元素测试图"能正常渲染', async () => {
    const agent = getAgent();

    // 进入"本地文件"
    await agent.aiTap('左侧导航栏中的"本地文件"');
    await agent.aiWaitFor('右侧显示本地文件列表', LIST_WAIT);

    // 等待文件列表完全加载（旧设备较慢）
    await agent.aiWaitFor('右侧文件列表中出现标题为"全元素测试图"的导图卡片', LIST_WAIT);

    // 打开"全元素测试图"
    await agent.aiTap('标题为"全元素测试图"的导图卡片');

    // 旧版文件会弹"旧版文件升级"提示，点"复制并继续"保留原文件
    await sleep(1500);
    const hasUpgradeDialog = await agent.aiBoolean(
      '当前页面是否弹出"旧版文件升级"对话框',
    );
    if (hasUpgradeDialog) {
      await agent.aiTap('对话框中的"复制并继续"按钮');
    }

    // 10 秒内必须进入编辑界面，否则视为白屏失败
    await agent.aiWaitFor('左上角出现"完成"按钮，且画布中能看到导图节点', RENDER_WAIT);
    // 画布稳定后再断言，避免命中加载中的瞬间
    await sleep(2000);
    await agent.aiAssert('页面非白屏，能看到导图节点内容');
  });

  it('打开"所有导图"中的任意一份能正常渲染', async () => {
    const agent = getAgent();

    // 进入"所有导图"
    await agent.aiTap('左侧导航栏中的"所有导图"');
    await agent.aiWaitFor('右侧显示导图列表', LIST_WAIT);

    // 打开列表中的第一份导图
    await agent.aiTap('列表中的第一份导图卡片');

    // 给加载留 1 秒启动时间，避免首帧命中过渡状态
    await sleep(1000);
    // 10 秒内必须进入编辑界面，否则视为白屏失败
    await agent.aiWaitFor('左上角出现"完成"按钮，且画布中能看到导图节点', RENDER_WAIT);
    // 画布稳定后再断言，避免命中加载中的瞬间
    await sleep(2000);
    await agent.aiAssert('页面非白屏，能看到导图节点内容');
  });

  it('新建空白导图后可添加自由主题', async () => {
    const agent = getAgent();

    // 进入"新建"页，创建空白导图（确保画布干净，不受已有自由主题干扰）
    await agent.aiTap('左侧导航栏中的"新建"');
    await agent.aiWaitFor('右侧显示"新建"页面，包含"空白导图"入口', LIST_WAIT);
    await agent.aiTap('"空白导图"入口');
    await sleep(1000);
    await agent.aiWaitFor('左上角出现"完成"按钮，画布中只显示"中心主题"节点', RENDER_WAIT);

    // 点击画布空白处，弹出功能按钮菜单
    await agent.aiTap('画布右上方或下方没有任何节点的空白区域');
    await agent.aiWaitFor('画布上弹出功能按钮菜单，包含"添加自由主题"选项', LIST_WAIT);

    // 点击"添加自由主题"
    await agent.aiTap('"添加自由主题"按钮');

    // 验证：画布中新增了一个自由主题节点
    await agent.aiWaitFor('画布中除"中心主题"外，出现一个新的"自由主题"节点', RENDER_WAIT);
    await agent.aiAssert('画布中同时存在"中心主题"和"自由主题"两个节点');
  });
});
