import { beforeEach, afterEach, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ReportMergingTool } from '@midscene/core/report';
import { createAgent, XMIND_PACKAGE, forceStopApp, clearAppData, disableSystemPopups } from './device';
import type { AndroidAgent, AndroidDevice } from '@midscene/android';
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

  let device: AndroidDevice;
  let agent: AndroidAgent;
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

      await agent.launch(XMIND_PACKAGE);
      // pm clear 后冷启动慢，5 秒间隔避免在启动页浪费 AI 轮询
      await agent.aiWaitFor(waitForReady, { timeoutMs: 15000, checkIntervalMs: 5000 });
    }
  });

  afterEach(async (ctx) => {
    const state = ctx.task.result?.state;
    const testStatus: TestStatus =
      state === 'pass' ? 'passed' : state === 'skip' ? 'skipped' : 'failed';

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
    try {
      reportMergingTool.mergeReports(reportName);
    } catch {
      // 单条用例时不合并，直接看单条报告
    }

    if (process.env.OPEN_REPORT) {
      try {
        const reportDir = join(process.cwd(), 'midscene_run', 'report');
        const files = readdirSync(reportDir)
          .filter((f) => f.endsWith('.html'))
          .map((f) => ({ name: f, mtime: statSync(join(reportDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length) {
          execSync(`open "${join(reportDir, files[0].name)}"`);
        }
      } catch {}
    }
  });

  const getAgent = () => agent;
  const getDevice = () => device;

  return { getAgent, getDevice };
}
