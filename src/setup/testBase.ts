import { beforeEach, afterEach, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ReportMergingTool } from '@midscene/core/report';
import { createAgent, getAppId, forceStopApp, clearAppData, disableSystemPopups } from './device';
import type { UnifiedAgent, UnifiedDevice } from './platform';
import type { TestStatus } from '@midscene/core';

export interface SetupOptions {
  /** 每次用例前清除应用数据（登录态、本地文件等全部重置），默认 false */
  clearData?: boolean;
  /** 是否自动 force-stop + launch 应用，默认 true；连贯测试场景设为 false */
  autoLaunch?: boolean;
  /** launch 后等待应用就绪的条件描述，默认检测首页加载完成 */
  waitForReady?: string;
}

export function setupAndroidTest(reportName: string, options: SetupOptions = {}) {
  const {
    clearData = false,
    autoLaunch = true,
    waitForReady = '应用主界面已加载完成',
  } = options;

  let device: UnifiedDevice;
  let agent: UnifiedAgent;
  let systemPopupsDisabled = false;
  const reportMergingTool = new ReportMergingTool();

  beforeEach(async (ctx) => {
    ({ device, agent } = await createAgent(ctx.task.name));

    if (!systemPopupsDisabled) {
      await disableSystemPopups(agent);
      systemPopupsDisabled = true;
    }

    if (autoLaunch) {
      if (clearData) {
        await clearAppData(agent);
      } else {
        await forceStopApp(agent);
      }

      await agent.launch(getAppId());
      // pm clear / bm clean 后冷启动慢，5 秒间隔避免在启动页浪费 AI 轮询
      await agent.aiWaitFor(waitForReady, { timeoutMs: 15000, checkIntervalMs: 5000 });
    }
  });

  afterEach(async (ctx) => {
    const state = ctx.task.result?.state;
    const testStatus: TestStatus =
      state === 'pass' ? 'passed' : state === 'skip' ? 'skipped' : 'failed';

    // 必须先 destroy agent 让报告写入磁盘，再读取 reportFile
    if (agent) {
      await agent.destroy();
    }

    if (agent?.reportFile) {
      reportMergingTool.append({
        reportFilePath: agent.reportFile as string,
        reportAttributes: {
          testId: ctx.task.name,
          testTitle: ctx.task.name,
          testDuration: (Date.now() - (ctx.task.result?.startTime ?? Date.now())) | 0,
          testStatus,
        },
      });
    }
  });

  afterAll(() => {
    let mergedPath: string | null = null;
    try {
      mergedPath = reportMergingTool.mergeReports(reportName, { overwrite: true });
    } catch (err) {
      console.log('[Report] 合并报告失败:', err);
    }

    if (process.env.OPEN_REPORT) {
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
