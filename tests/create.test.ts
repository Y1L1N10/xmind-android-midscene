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

    it('快捷输入纯文本创建导图', async () => {
      const agent = getAgent();
      await agent.aiTap('"快捷输入"入口');
      await agent.aiWaitFor('弹出"快捷输入"弹窗，显示"创建"按钮', WAIT_OPTS);

      // 一次性粘贴多行文本
      await agent.aiInput('弹窗中的文本输入区域', { value: '项目计划\n需求分析\n用户调研' });
      await agent.aiAssert('弹窗中显示"项目计划"、"需求分析"、"用户调研"文字');

      await agent.aiTap('弹窗底部的"创建"按钮');
      await agent.aiWaitFor('左上角出现"完成"按钮', WAIT_OPTS);

      await agent.aiAssert(
        '页面中存在"项目计划"、"需求分析"、"用户调研"三个节点文字 , "项目计划"在"需求分析"和"用户调研"的中间',
      );
    });

    it('快捷输入粘贴 Markdown 长文本创建导图', async () => {
      const agent = getAgent();
      await agent.aiTap('"快捷输入"入口');
      await agent.aiWaitFor('弹出"快捷输入"弹窗，显示"创建"按钮', WAIT_OPTS);

      // 粘贴完整 Markdown 格式长文本（含标题层级 + 正文段落）
      const mdText = `# 人工智能的未来

人工智能正在深刻改变我们的生活方式。从智能手机中的语音助手，到自动驾驶汽车，再到医疗诊断系统，AI技术已经渗透到社会的各个角落。我们正站在一个技术革命的十字路口，每一个选择都将影响未来数十年的发展方向。回顾过去十年，人工智能从实验室走向了千家万户，速度之快令人惊叹。

## 技术发展历程

近年来，大语言模型的突破让机器具备了理解和生成自然语言的能力。这些模型通过海量数据训练，能够完成翻译、写作、编程等多种复杂任务。深度学习算法的不断优化，使得计算机视觉、语音识别等领域也取得了长足进步。从最早的感知机到如今的深度神经网络，人工智能走过了漫长而曲折的道路。

### 大语言模型的崛起

从早期的统计模型到如今的Transformer架构，自然语言处理经历了翻天覆地的变化。现代大语言模型拥有数千亿参数，能够进行多轮对话、逻辑推理、代码生成，甚至展现出一定程度的创造力。它们不仅改变了人机交互的方式，也重新定义了知识获取的路径。人们不再需要精确的关键词搜索，而是可以用自然语言直接提问，获得结构化的回答。

### 计算机视觉与多模态

图像识别技术已经在安防监控、医学影像、工业检测等领域广泛应用。多模态模型的出现更是打通了文字、图像、音频之间的壁垒，让AI能够同时理解和处理多种类型的信息。未来，具备视觉、听觉、触觉等多感官能力的AI系统将更加接近人类的感知方式，为机器人技术和人机交互带来全新可能。

## 社会影响与变革

AI的普及带来了效率的飞跃，同时也引发了关于就业、隐私和伦理的广泛讨论。许多重复性工作正在被自动化取代，但新的职业机会也在不断涌现。如何平衡技术进步与社会公平，是我们必须面对的重要课题。

### 就业市场的重塑

传统的数据录入、客服、翻译等岗位正在经历深刻转型。与此同时，AI训练师、提示工程师、数据标注专家等新兴职业应运而生。教育体系需要及时调整，培养具备跨学科能力和创新思维的复合型人才，才能适应快速变化的劳动力市场需求。终身学习将不再是一句口号，而是每个人必须拥抱的生活方式。

### 隐私与数据安全

AI系统的训练依赖于大量数据，这引发了人们对个人隐私的担忧。面部识别技术的滥用、用户数据的非法收集、算法偏见等问题频频见诸报端。各国政府正在加快立法步伐，试图在技术创新与公民权利保护之间寻找平衡点。数据治理和隐私保护将成为数字时代最核心的议题之一。

## 未来展望

展望未来，人工智能将继续向通用智能方向演进。人机协作将成为主流工作模式，AI不再是替代人类，而是增强人类能力的伙伴。教育、医疗、科研等领域将因AI的赋能而迎来全新变革。

### 通用人工智能

当前的AI系统大多属于专用智能，擅长特定任务但缺乏跨领域的迁移能力。研究者们正在探索通用人工智能的实现路径，希望创造出能够像人类一样灵活思考、学习和适应的智能体。虽然这一目标仍然充满挑战，但每一步突破都在缩短理想与现实之间的距离。

### 关键挑战与责任

安全性、可解释性和对齐问题仍然是研究重点。确保AI系统符合人类价值观，在可控范围内发展，需要全球社会的共同努力与智慧。技术本身是中性的，关键在于使用它的人。只有建立健全的治理框架，推动负责任的创新，我们才能真正让人工智能造福全人类，开创一个更加美好的未来。`;

      await agent.aiInput('弹窗中的文本输入区域', { value: mdText });

      // 验证预览：首行可见
      await agent.aiAssert('弹窗中显示"人工智能的未来"文字');
      // 滑动到底部，验证末尾内容
      await agent.aiAct('在弹窗的文本输入区域内向下滑动到底部');
      await agent.aiAssert('弹窗中显示"关键挑战与责任"文字');

      await agent.aiTap('弹窗底部的"创建"按钮');
      await agent.aiWaitFor('左上角出现"完成"按钮', WAIT_OPTS);
      // Markdown 层级：# 为中心主题，## 为二级，### 为三级
      await agent.aiAssert(
        '页面中存在"人工智能的未来"中心主题；存在"技术发展历程"、"社会影响与变革"、"未来展望"节点',
      );
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
      await agent.aiAssert('页面中第一类模板分类是"基本"');
      await agent.aiAct('向下滑动模板区域，直到看到"创造力"分类后停止');
      await agent.aiAssert('页面中出现"创造力"模板分类');
    });
  });
});
