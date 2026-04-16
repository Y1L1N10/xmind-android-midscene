import { beforeEach, afterEach, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ReportMergingTool } from '@midscene/core/report';
import { createAgent, XMIND_PACKAGE, forceStopApp, clearAppData, disableSystemPopups, type CacheOption } from './device';
import type { AndroidAgent, AndroidDevice } from '@midscene/android';
import type { TestStatus } from '@midscene/core';

export interface SetupOptions {
  /** 每次用例前清除应用数据（登录态、本地文件等全部重置），默认 false */
  clearData?: boolean;
  /** 是否自动 force-stop + launch 应用，默认 true；连贯测试场景设为 false */
  autoLaunch?: boolean;
  /** launch 后等待应用就绪的条件描述，默认检测首页加载完成 */
  waitForReady?: string;
  /** 指定设备序列号（adb devices 中的 udid），不传则使用第一个连接的设备 */
  deviceSerial?: string;
  /** AI 缓存：true 开启 read-write，或指定策略 'read-only' | 'write-only' | 'read-write' */
  cache?: CacheOption;
}

export function setupAndroidTest(reportName: string, options: SetupOptions = {}) {
  const {
    clearData = false,
    autoLaunch = true,
    waitForReady = '应用主界面已加载完成',
    deviceSerial,
    cache: cacheOption,
  } = options;

  let device: AndroidDevice;
  let agent: AndroidAgent;
  let systemPopupsDisabled = false;
  const reportMergingTool = new ReportMergingTool();

  beforeEach(async (ctx) => {
    // 拼接 describe 链路（支持嵌套 describe），作为报告里的分组描述
    const suiteNames: string[] = [];
    let suite = ctx.task.suite;
    while (suite && suite.name) {
      suiteNames.unshift(suite.name);
      suite = suite.suite;
    }
    const groupDescription = suiteNames.join(' › ') || ctx.task.name;
    // 每个用例独立 cacheId，避免多 agent 覆盖同一文件
    const cacheConfig = cacheOption
      ? { id: `${reportName}--${ctx.task.name}`, option: cacheOption }
      : undefined;
    ({ device, agent } = await createAgent(ctx.task.name, deviceSerial, groupDescription, cacheConfig));

    if (!systemPopupsDisabled) {
      await disableSystemPopups(agent);
      systemPopupsDisabled = true;
    }

    if (autoLaunch) {
      // 首次执行 clearData，重跑时只 forceStop（省掉 WebView 冷启动）
      const retryCount = (ctx.task as any).result?.retryCount ?? 0;
      if (clearData && retryCount === 0) {
        await clearAppData(agent);
      } else {
        await forceStopApp(agent);
      }

      await agent.launch(XMIND_PACKAGE);
      // pm clear 后冷启动慢，5 秒间隔避免在启动页浪费 AI 轮询
      await agent.aiWaitFor(waitForReady, { timeoutMs: 15000, checkIntervalMs: 5000 });
    }
  });

  afterEach(async (ctx) => {
    const state = ctx.task.result?.state;
    const testStatus: TestStatus =
      state === 'pass' ? 'passed' : state === 'skip' ? 'skipped' : 'failed';

    // 先把缓存写入磁盘（destroy 不会自动 flush cache）
    if (agent && cacheOption) {
      await agent.flushCache();
    }
    // 必须先 destroy agent 让报告写入磁盘，再读取 reportFile
    if (agent) {
      await agent.destroy();
    }
    // 断开设备连接，释放 scrcpy 会话，避免多次重跑时连接泄漏
    if (device) {
      await device.destroy();
    }

    if (agent?.reportFile) {
      const retryCount = (ctx.task as any).result?.retryCount ?? 0;
      const titleSuffix = retryCount > 0 ? ` (重跑 #${retryCount})` : '';
      reportMergingTool.append({
        reportFilePath: agent.reportFile as string,
        reportAttributes: {
          testId: ctx.task.name + titleSuffix,
          testTitle: ctx.task.name + titleSuffix,
          testDuration: (Date.now() - (ctx.task.result?.startTime ?? Date.now())) | 0,
          testStatus,
        },
      });
    }
  });

  afterAll(() => {
    let mergedPath: string | null = null;
    try {
      // 默认按 日期目录/时间戳 归档，NO_ARCHIVE=1 时退回到覆盖模式
      const archive = !process.env.NO_ARCHIVE;
      if (archive) {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateDir = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const finalName = `${reportName}-${timeStr}`;
        const tmpPath = reportMergingTool.mergeReports(finalName, { overwrite: false });
        // 把生成的报告移动到 midscene_run/report/<日期>/ 下
        if (tmpPath) {
          const targetDir = join(process.cwd(), 'midscene_run', 'report', dateDir);
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          const targetPath = join(targetDir, `${finalName}.html`);
          renameSync(tmpPath, targetPath);
          mergedPath = targetPath;
        }
      } else {
        mergedPath = reportMergingTool.mergeReports(reportName, { overwrite: true });
      }
    } catch (err) {
      console.log('[Report] 合并报告失败:', err);
    }

    if (!process.env.NO_OPEN) {
      try {
        // 优先打开合并报告，否则打开最新的单条报告
        let pathToOpen = mergedPath;
        if (!pathToOpen) {
          const reportDir = join(process.cwd(), 'midscene_run', 'report');
          const files = readdirSync(reportDir)
            .filter((f) => f.endsWith('.html'))
            .map((f) => ({ name: f, mtime: statSync(join(reportDir, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
          if (files.length) pathToOpen = join(reportDir, files[0].name);
        }
        if (pathToOpen) execSync(`open "${pathToOpen}"`);
      } catch {}
    }
  });

  const getAgent = () => agent;
  const getDevice = () => device;

  return { getAgent, getDevice };
}
