import { describe, it, beforeAll } from 'vitest';
import { setupAndroidTest } from '../src/setup/testBase';
import { XMIND_PACKAGE, forceStopApp } from '../src/setup/device';

const { getAgent } = setupAndroidTest('xmind-mindmap-report', { autoLaunch: false });

describe('XMind 思维导图核心操作', () => {

  beforeAll(async () => {
    const agent = getAgent();
    await forceStopApp(agent);
    await agent.launch(XMIND_PACKAGE);
    await agent.aiWaitFor('能看到导图列表或新建入口', { timeoutMs: 15000 });
  });

  it('首页正常显示', async () => {
    const agent = getAgent();
    await agent.aiAssert('当前是 XMind 应用主界面，能看到导图列表或新建入口');
  });

  it('新建空白思维导图', async () => {
    const agent = getAgent();
    await agent.aiTap('左侧菜单中的"新建"按钮');
    await agent.aiWaitFor('出现新建导图的选项列表', { timeoutMs: 10000 });
    await agent.aiTap('空白思维导图选项');
    await agent.aiWaitFor('进入思维导图编辑界面，存在中心主题节点', { timeoutMs: 10000 });
    await agent.aiAssert('已进入思维导图编辑界面，存在中心主题节点');
  });

  it('编辑中心主题文字', async () => {
    const agent = getAgent();
    await agent.aiDoubleClick('中心主题节点');
    await agent.aiInput('中心主题的文字编辑框', { value: '测试导图' });
    await agent.aiKeyboardPress('Enter');
    await agent.aiWaitFor('中心主题节点的文字显示为"测试导图"', { timeoutMs: 10000 });
    await agent.aiAssert('中心主题节点的文字显示为"测试导图"');
  });

  it('添加子节点', async () => {
    const agent = getAgent();
    await agent.aiTap('中心主题节点"测试导图"');
    await agent.aiTap('添加子节点的按钮');
    await agent.aiInput('新建子节点的文字编辑框', { value: '子节点1' });
    await agent.aiKeyboardPress('Enter');
    await agent.aiWaitFor('页面中存在文字为"子节点1"的节点', { timeoutMs: 10000 });
    await agent.aiAssert('页面中存在文字为"子节点1"的节点');
  });
});
