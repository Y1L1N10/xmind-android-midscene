import { describe, it, beforeEach } from 'vitest';
import { setupAndroidTest } from '../src/setup/testBase';

const WAIT_OPTS = { timeoutMs: 15000, checkIntervalMs: 5000 };

const { getAgent } = setupAndroidTest('xmind-create-report', {
  autoLaunch: true,
  waitForReady: '应用主界面已加载完成',
});

describe('XMind 新建页面', () => {

  beforeEach(async () => {
    const agent = getAgent();
    await agent.aiTap('左侧导航栏中的"新建"');
    await agent.aiWaitFor('右侧显示"新建"页面，包含"空白导图"入口', WAIT_OPTS);
  });

  // ===================== P0 - 页面元素与核心功能 =====================
  describe('P0 - 页面元素与核心功能', () => {
    it('新建页面元素完整', async () => {
      const agent = getAgent();
      await agent.aiAssert(
        '页面标题显示"新建"；' +
        '存在"空白导图"、"快捷输入"、"导入"三个入口；' +
        '存在"模板"区域，包含"基本"分类',
      );
    });

    it('通过空白导图新建', async () => {
      const agent = getAgent();
      await agent.aiTap('"空白导图"入口');
      await agent.aiWaitFor('页面中显示"中心主题"文字，左上角有"完成"按钮', WAIT_OPTS);
      await agent.aiAssert('页面中显示"中心主题"文字，左上角有"完成"按钮');
    });

    it('通过模板新建思维导图', async () => {
      const agent = getAgent();
      await agent.aiTap('"思维导图"文字');
      await agent.aiWaitFor('左上角出现"完成"按钮，页面中显示导图节点内容', WAIT_OPTS);
      await agent.aiAssert('左上角有"完成"按钮，页面中显示导图节点内容');
    });

    it('快捷输入创建导图', async () => {
      const agent = getAgent();
      // 打开快捷输入弹窗
      await agent.aiTap('"快捷输入"入口');
      await agent.aiWaitFor('弹出"快捷输入"弹窗，显示"创建"按钮', WAIT_OPTS);

      // 输入中心主题 + 二级主题
      await agent.aiAct(
        '点击弹窗中的文本输入区域，输入"项目计划"，按回车键换行，输入"需求分析"',
      );

      // 缩进 → 验证
      await agent.aiTap('弹窗左下角右箭头缩进按钮');
      await agent.aiAssert('弹窗中显示"项目计划"和"需求分析"文字');

      // 回退缩进 → 重新缩进（验证回退按钮可用）
      await agent.aiAct(
        '点击弹窗左下角左箭头回退按钮，再点击右箭头缩进按钮',
      );

      // 换行输入三级主题
      await agent.aiKeyboardPress('Enter');
      await agent.aiAct('在弹窗中当前光标位置输入"用户调研"');
      // 缩进
      await agent.aiTap('弹窗左下角右箭头缩进按钮');
      // 创建
      await agent.aiTap('弹窗底部的"创建"按钮');

      // 验证导图生成：三层节点
      await agent.aiWaitFor('左上角出现"完成"按钮', WAIT_OPTS);
      await agent.aiAssert('页面中存在"项目计划"文字；存在"需求分析"节点；存在"用户调研"节点');
    });
  });

  // ===================== P1 - 模板分类与更多模板 =====================
  describe('P1 - 模板分类与展示', () => {
    it('基本模板分类完整', async () => {
      const agent = getAgent();
      await agent.aiAssert(
        '"基本"分类下包含"思维导图"、"逻辑图"、"括号图"、"组织结构图"、"树形图"模板',
      );
    });

    it('知识管理模板分类展示', async () => {
      const agent = getAgent();
      await agent.aiAssert(
        '页面中存在"知识管理"模板分类，包含"解决问题的步骤"、"GRAP 框架基础"等模板',
      );
    });

    it('通过逻辑图模板新建', async () => {
      const agent = getAgent();
      await agent.aiTap('"逻辑图"文字');
      await agent.aiWaitFor('左上角出现"完成"按钮，页面中显示导图节点内容', WAIT_OPTS);
      await agent.aiAssert('左上角有"完成"按钮，页面中显示导图节点内容');
    });
  });

  // ===================== P2 - 快捷输入与导入 =====================
  describe('P2 - 快捷输入与导入', () => {
    it('导入入口可用', async () => {
      const agent = getAgent();
      await agent.aiTap('"导入"入口');
      await agent.aiWaitFor('弹出文件选择器或导入界面', WAIT_OPTS);
    });

    it('模板区域可滚动', async () => {
      const agent = getAgent();
      await agent.aiAct('向下滑动模板区域');
      await agent.aiAssert('页面中出现"会议和计划"模板分类');
    });
  });
});
