# XMind Android / HarmonyOS Midscene 自动化测试项目

## 项目概述
基于 [Midscene](https://midscenejs.com/) 的 XMind 应用 UI 自动化测试，通过 AI 视觉驱动与设备交互，无需依赖 DOM 或 accessibility labels。支持 **Android（ADB）** 和 **HarmonyOS（HDC）** 双平台。

## 技术栈
- **测试框架**: Vitest
- **自动化驱动**: @midscene/android（ADB + AI 视觉识别）、@midscene/harmony（HDC + AI 视觉识别）
- **环境变量**: dotenv-cli 加载 `.env`
- **平台切换**: 环境变量 `PLATFORM=android|harmony`（默认 android）

## 项目结构
```
src/setup/
  platform.ts    — 平台抽象层：类型定义、平台检测（PLATFORM 环境变量）
  device.ts      — 设备连接、Agent 创建、应用重置工具（双平台兼容）
  testBase.ts    — 共享测试生命周期（setupAndroidTest）+ 报告合并 + 自动打开报告
  gmail.ts       — Gmail IMAP 验证码获取
tests/
  *.test.ts      — 测试用例文件
```

## 双平台架构

### 平台切换
通过 `PLATFORM` 环境变量切换平台，不需要修改测试代码：
```bash
# Android（默认）
npm test

# HarmonyOS
PLATFORM=harmony npm test
npm run test:harmony
```

### 平台差异对照

| 方面 | Android | HarmonyOS |
|------|---------|-----------|
| 连接工具 | ADB | HDC |
| 包/驱动 | `@midscene/android` | `@midscene/harmony` |
| 设备类 | `AndroidDevice` | `HarmonyDevice` |
| Agent 类 | `AndroidAgent` | `HarmonyAgent` |
| Shell 命令 | `runAdbShell()` | `runHdcShell()` |
| 强制停止 | `am force-stop <pkg>` | `aa force-stop -b <bundle>` |
| 清除数据 | `pm clear <pkg>` | `bm clean -n <bundle> -c` |
| 应用标识 | 包名 `net.xmind.doughnut` | Bundle Name |
| AI 方法 | **完全一致** | **完全一致** |

### 关键函数
- `getAppId()` — 根据平台返回正确的应用标识（Android 包名 / HarmonyOS Bundle Name）
- `createAgent(testName)` — 自动根据平台创建对应的 Device + Agent
- `forceStopApp(agent)` — 平台无关的强制停止
- `clearAppData(agent)` — 平台无关的数据清除
- `runShell(agent, command)` — 平台无关的 shell 命令执行

## 关键约定

### 新建测试文件

使用 `setupAndroidTest(reportName, options?)` 初始化，不要手写 beforeEach/afterEach/afterAll 的设备创建和报告合并逻辑。

**options 参数：**
| 选项 | 默认值 | 说明 |
|------|--------|------|
| `clearData` | `false` | `true` 时每次用例前清除全部应用数据（登录态、本地文件） |
| `autoLaunch` | `true` | `true` 时自动 force-stop + launch 应用；连贯测试设为 `false` |
| `waitForReady` | `'应用主界面已加载完成'` | launch 后等待应用就绪的 AI 条件描述 |

**独立用例模板**（每个用例互不依赖，如登录测试）：
```ts
import { describe, it, beforeEach } from 'vitest';
import { sleep } from '@midscene/core/utils';
import { setupAndroidTest } from '../src/setup/testBase';

// clearData: true 确保每次用例都是未登录的干净状态
const { getAgent } = setupAndroidTest('报告名称', { clearData: true });

describe('测试模块名', () => {
  beforeEach(async () => {
    const agent = getAgent();
    // testBase 已自动 clearData + launch，这里只做额外导航
    await agent.aiAct('导航到目标页面');
    await sleep(2000);
  });

  it('用例描述', async () => {
    const agent = getAgent();
    await agent.aiAct('操作描述');
    await agent.aiAssert('断言描述');
  });
});
```

**连贯用例模板**（用例之间有前后依赖，如思维导图操作）：
```ts
import { describe, it, beforeAll } from 'vitest';
import { sleep } from '@midscene/core/utils';
import { setupAndroidTest } from '../src/setup/testBase';
import { getAppId, forceStopApp } from '../src/setup/device';

// autoLaunch: false，由 beforeAll 手动控制启动
const { getAgent } = setupAndroidTest('报告名称', { autoLaunch: false });

describe('测试模块名', () => {
  beforeAll(async () => {
    const agent = getAgent();
    await forceStopApp(agent);
    await agent.launch(getAppId());
    await sleep(3000);
  });

  it('步骤一', async () => { /* ... */ });
  it('步骤二（依赖步骤一的结果）', async () => { /* ... */ });
});
```

### 应用标识引用
始终使用 `getAppId()` 获取当前平台的应用标识，不要硬编码包名。
如需在平台特定代码中引用，可使用 `XMIND_PACKAGE`（Android）或 `XMIND_HARMONY_BUNDLE`（HarmonyOS）。

### AI 指令语言
`aiAct` / `aiAssert` 的描述统一使用**中文**，与应用界面语言一致，便于 AI 视觉识别匹配。

### 性能优化
- **合并 AI 调用**：多步连续操作尽量合成一条 `aiAct` 指令（如"输入邮箱，输入密码，点击登录"），减少 AI 推理次数
- **合并断言**：同一页面的多项检查合并为一次 `aiAssert`，用分号分隔
- **避免不必要的 sleep**：只在等待页面跳转、网络请求等场景使用

### 应用状态管理
- `forceStopApp(agent)` — 强制停止应用（保留数据），适合导图测试
- `clearAppData(agent)` — 清除全部应用数据（登录态、文件等），适合登录测试
- 通过 `setupAndroidTest` 的 `clearData` / `autoLaunch` 选项控制，不要在测试文件里手动调用 shell 清除命令

## 常用命令

### Android（默认）
```bash
npm test                # 运行所有测试
npm run test:mindmap    # 仅运行思维导图测试
npm run test:login      # 仅运行登录测试
npm run test:sync       # 仅运行同步测试
npm run test:watch      # watch 模式
npm run test:report     # 运行全部测试并自动打开报告
```

### HarmonyOS
```bash
npm run test:harmony            # 运行所有测试（鸿蒙）
npm run test:harmony:mindmap    # 仅运行思维导图测试（鸿蒙）
npm run test:harmony:login      # 仅运行登录测试（鸿蒙）
npm run test:harmony:report     # 运行全部测试并自动打开报告（鸿蒙）
```

或在任意命令前加 `PLATFORM=harmony`：
```bash
PLATFORM=harmony npm run test:mindmap -- -t "新建"
```

## 跑单条用例（按名称关键词匹配）
```bash
npm run test:mindmap -- -t "新建"
npm run test:login -- -t "登录页面"
```

## 自动打开报告
在任意命令前加 `OPEN_REPORT=1`，执行完成后自动在浏览器打开报告：
```bash
OPEN_REPORT=1 npm run test:login
OPEN_REPORT=1 npm run test:login -- -t "正确账号密码登录成功"
OPEN_REPORT=1 npm run test:mindmap
```

或直接用 `npm run test:report`（默认带 `OPEN_REPORT=1`，可追加参数）：
```bash
npm run test:report -- tests/login.test.ts -t "密码错误"
```

## 运行前提

### Android
- ADB 已连接 Android 设备（`adb devices` 可见）
- `.env` 文件已配置（含 AI 模型相关 key）
- XMind 应用已安装在目标设备上

### HarmonyOS
- HDC 已连接鸿蒙设备（`hdc list targets` 可见）
- `.env` 文件已配置（含 AI 模型相关 key）
- XMind 应用已安装在目标鸿蒙设备上
- 确认 `XMIND_HARMONY_BUNDLE`（device.ts）为正确的鸿蒙 Bundle Name

## 报告
测试报告自动生成在 `midscene_run/report/` 目录下，已被 `.gitignore` 忽略。
