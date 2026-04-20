import { describe, it, beforeEach } from 'vitest';
import { setupAndroidTest } from '../src/setup/testBase';

const FREE_EMAIL = process.env.FREE_EMAIL!;
const FREE_PASSWORD = process.env.FREE_PASSWORD!;

const WAIT_OPTS = { timeoutMs: 30000, checkIntervalMs: 5000 };

const { getAgent } = setupAndroidTest('xmind-free-plan-report', {
  autoLaunch: true,
  waitForReady: '应用主界面已加载完成（有"所有导图"/"最近"入口，或显示"登录"按钮，或显示"服务条款和隐私政策"）',
});

/** 确保已登录为 Free Plan 账户；未登录时自动登录 */
async function ensureLoggedIn(agent: ReturnType<typeof getAgent>) {
  const hasAgreement = await agent.aiBoolean('页面显示"服务条款和隐私政策"标题和"同意使用"按钮');
  if (hasAgreement) {
    await agent.aiTap('页面底部右侧的橙色"同意使用"按钮');
    await new Promise((r) => setTimeout(r, 1500));
  }
  const isLoggedIn = await agent.aiBoolean(
    '左侧栏"我的导图"行下方显示"Free Plan"文字标签（已登录为 Free 用户）',
  );
  if (isLoggedIn) return;

  await agent.aiTap('页面中的"登录"按钮（未登录时的入口）');
  await agent.aiWaitFor('页面显示邮箱输入框和密码输入框', WAIT_OPTS);
  await agent.aiInput('邮箱输入框', { value: FREE_EMAIL });
  await agent.aiInput('密码输入框', { value: FREE_PASSWORD });
  await agent.aiTap('登录按钮');
  await agent.aiWaitFor('左侧栏"我的导图"行下方显示"Free Plan"文字标签', WAIT_OPTS);
}

/** 打开"所有导图"中第一张已有思维导图（需提前准备一张"思维导图"模板生成的导图） */
async function openMindMapFromList(agent: ReturnType<typeof getAgent>) {
  await agent.aiTap('"所有导图"列表中第一个已有导图缩略图卡片（不是"+ 新建导图"占位卡）');
  await agent.aiWaitFor('页面进入导图编辑页，左上角显示"完成"按钮，画布显示"中心主题"和"分支主题"节点', WAIT_OPTS);
}

describe('XMind Free 用户权限校验', () => {

  beforeEach(async () => {
    const agent = getAgent();
    await ensureLoggedIn(agent);
    // 不强制导航到"所有导图"——王冠/侧边栏入口都随处可用，各用例按需导航
  });

  // ===================== P0 - 套餐标识 =====================
  describe('P0 - 套餐标识', () => {
    it('首页与设置页 Free Plan 标识完整', async () => {
      const agent = getAgent();
      await agent.aiAssert(
        '左侧栏顶部有橙色王冠图标按钮（升级入口）；' +
        '"在线导图"分组下的"我的导图"行下方显示"Free Plan"文字标签',
      );
      await agent.aiTap('左侧栏顶部的橙色王冠图标按钮右边的头像');
      await agent.aiWaitFor('页面顶部显示"设置"标题', WAIT_OPTS);
      await agent.aiAssert(
        `账号行显示邮箱"${FREE_EMAIL}"，下方有"Free Plan"文字标签；` +
        '存在"恢复完整版"入口（购物车图标）；' +
        '存在"兑换礼品卡"入口（礼物图标）',
      );
    });
  });

  // ===================== P1 - 付费功能入口（点击触发付费弹窗） =====================
  describe('P1 - 付费功能入口', () => {
    it('新建页 - 锁定模板显示与点击触发付费弹窗', async () => {
      const agent = getAgent();
      await agent.aiTap('左侧栏中的"新建"');
      await agent.aiWaitFor('右侧显示"新建"页面，包含"空白导图"入口和"模板"区域', WAIT_OPTS);
      // 视觉：基本无锁，付费有锁
      await agent.aiAssert(
        '"基本"分类下的"思维导图"、"逻辑图"、"括号图"、"组织结构图"、"树形图"模板缩略图均无锁图标（免费可用）；' +
        '"建筑图示"和"品牌探索"模板缩略图右上角有红色锁形图标（付费锁定）',
      );
      // 点击锁模板触发弹窗
      await agent.aiTap('"建筑图示"模板（缩略图右上角带红色锁图标）');
      await agent.aiWaitFor(
        '弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"',
        { timeoutMs: 15000, checkIntervalMs: 3000 },
      );
    });

    // 三个导图内入口合并为一个用例，共享同一次 app 启动 + 同一张导图
    it('导图编辑页 - 所有付费入口触发付费弹窗（+菜单 / 画布面板 / 演说面板）', { timeout: 600_000 }, async () => {
      const agent = getAgent();
      await openMindMapFromList(agent);

      // ---------- 第一节：节点 + 菜单付费功能（5 个） ----------
      await agent.aiTap('画布中任意一个"分支主题"文字节点');
      await agent.aiWaitFor('"分支主题"节点被选中（高亮边框/选中态）', { timeoutMs: 5000 });

      const plusFeatures = ['待办事项', '任务', '附件', '语音备注', '方程'];
      for (const feature of plusFeatures) {
        await agent.aiTap('顶部中央工具栏中的"+"圆形加号按钮（插入菜单入口）');
        await agent.aiWaitFor('弹出插入菜单，包含"笔记"、"附件"等选项', { timeoutMs: 10000, checkIntervalMs: 3000 });
        await agent.aiTap(`插入菜单中的"${feature}"选项`);
        await agent.aiWaitFor(
          `点击"${feature}"后，弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"`,
          { timeoutMs: 15000, checkIntervalMs: 3000 },
        );
        await agent.aiTap('Premium 付费弹窗右上角的"×"关闭按钮');
        await agent.aiWaitFor('弹窗已关闭，回到导图编辑页', { timeoutMs: 5000 });
        await agent.aiTap('画布中任意一个"分支主题"文字节点');
        await new Promise((r) => setTimeout(r, 500));
      }

      // ---------- 第二节：画布面板付费布局项（紧凑型布局 / 同级主题对齐） ----------
      await agent.aiTap('顶部右侧工具栏中的画笔/样式图标按钮（打开右侧样式面板入口）');
      await agent.aiWaitFor('右侧出现面板，顶部有"样式"、"演说"、"画布"三个 Tab 标签', WAIT_OPTS);
      await agent.aiTap('右侧面板顶部 Tab 行中最右侧的"画布"文字标签（"样式/演说/画布"中第三个）');
      await new Promise((r) => setTimeout(r, 800));

      // 画布面板下滑显露"紧凑型布局"
      for (let attempt = 0; attempt < 5; attempt++) {
        const visible = await agent.aiBoolean('右侧画布面板中"紧凑型布局"选项完整可见');
        if (visible) break;
        await agent.runAdbShell('input swipe 2200 1200 2200 400 300');
        await new Promise((r) => setTimeout(r, 500));
      }
      await agent.aiTap('画布面板中的"紧凑型布局"选项行');
      await agent.aiWaitFor('弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"', { timeoutMs: 15000, checkIntervalMs: 3000 });
      await agent.aiTap('Premium 付费弹窗右上角的"×"关闭按钮');
      await agent.aiWaitFor('弹窗已关闭，回到导图编辑页', { timeoutMs: 5000 });

      // 再确保"同级主题对齐"可见
      for (let attempt = 0; attempt < 3; attempt++) {
        const visible = await agent.aiBoolean('右侧画布面板中"同级主题对齐"选项完整可见');
        if (visible) break;
        await agent.runAdbShell('input swipe 2200 1200 2200 600 300');
        await new Promise((r) => setTimeout(r, 500));
      }
      await agent.aiTap('画布面板中的"同级主题对齐"选项行');
      await agent.aiWaitFor('弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"', { timeoutMs: 15000, checkIntervalMs: 3000 });
      await agent.aiTap('Premium 付费弹窗右上角的"×"关闭按钮');
      await agent.aiWaitFor('弹窗已关闭，回到导图编辑页', { timeoutMs: 5000 });

      // ---------- 第三节：演说面板付费样式（缤纷童趣） ----------
      // 面板仍在右侧，直接切到"演说" Tab
      await agent.aiTap('右侧面板顶部 Tab 行中间的"演说"文字标签（"样式/演说/画布"中第二个）');
      await agent.aiWaitFor('面板显示"演说模式预览"区域，下方有"风格"和"长宽比"两行设置', WAIT_OPTS);
      await agent.aiTap('"风格"设置行');
      await agent.aiWaitFor('弹出样式选择菜单，显示"深色"、"浅色"、"缤纷童趣"等样式缩略图', WAIT_OPTS);
      await agent.aiTap('样式选择菜单中的"缤纷童趣"缩略图');
      await agent.aiWaitFor('弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"', { timeoutMs: 15000, checkIntervalMs: 3000 });
    });
  });

  // ===================== P2 - 付费弹窗详细校验与订阅方案 =====================
  describe('P2 - 付费弹窗详情与订阅方案', () => {
    // canonical 弹窗校验：完整验证弹窗内容
    it('付费弹窗完整内容校验（王冠按钮触发）', async () => {
      const agent = getAgent();
      await agent.aiTap('左侧栏顶部的橙色王冠图标按钮（升级入口）');
      await agent.aiWaitFor(
        '弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"',
        { timeoutMs: 15000, checkIntervalMs: 3000 },
      );
      await agent.aiAssert(
        '弹窗标题为"体验 Premium 的卓越之处"；' +
        '副标题包含"一个计划覆盖所有平台"；' +
        '包含"无限在线导图和存储空间"和"与他人实时协作"两条卖点（带 ✓ 图标）；' +
        '显示价格"HK$769.00/年"（Premium 年订阅价）；' +
        '有红橙渐变填充的"继续"按钮；' +
        '底部有"查看所有计划"链接；' +
        '右上角有"×"关闭按钮',
      );
    });

    // 价格校验：一次进入"查看所有计划"页，切换 Tab 验证 Pro 和 Premium
    it('查看所有计划 - Pro 与 Premium 套餐价格', async () => {
      const agent = getAgent();
      await agent.aiTap('左侧栏顶部的橙色王冠图标按钮（升级入口）');
      await agent.aiWaitFor('弹出 Premium 付费弹窗，标题显示"体验 Premium 的卓越之处"', { timeoutMs: 15000, checkIntervalMs: 3000 });
      await agent.aiTap('弹窗底部的"查看所有计划"文字链接');
      await agent.aiWaitFor('页面显示"Pro"和"Premium"两个 Tab 的订阅方案选择页', { timeoutMs: 15000, checkIntervalMs: 3000 });

      await agent.aiTap('"Pro" Tab');
      await agent.aiAssert(
        '页面标题"立即体验 Pro"；"Pro" Tab 为当前选中状态；' +
        '"连续包月"价格"HK$78.00"；' +
        '"按年"价格"HK$459.00"，右上角有红色"4.9折"折扣标签',
      );

      await agent.aiTap('"Premium" Tab');
      await agent.aiAssert(
        '页面标题"体验 Premium 的卓越之处"；"Premium" Tab 为当前选中状态；' +
        '"连续包月"价格"HK$118.00"；' +
        '"按年"价格"HK$769.00"，右上角有红色"5.4折"折扣标签',
      );
    });
  });
});
