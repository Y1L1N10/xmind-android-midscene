import { beforeEach, afterEach, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { sleep } from '@midscene/core/utils';
import { ReportMergingTool } from '@midscene/core/report';
import { createAgent, XMIND_PACKAGE, forceStopApp, clearAppData, disableSystemPopups } from './device';
import type { AndroidAgent, AndroidDevice } from '@midscene/android';
import type { TestStatus } from '@midscene/core';

export interface SetupOptions {
  /** 每次用例前清除应用数据（登录态、本地文件等全部重置），默认 false */
  clearData?: boolean;
  /** 是否自动 force-stop + launch 应用，默认 true；连贯测试场景设为 false */
  autoLaunch?: boolean;
  /** launch 后的等待时间（ms），默认 3000 */
  launchWaitMs?: number;
}

export function setupAndroidTest(reportName: string, options: SetupOptions = {}) {
  const { clearData = false, autoLaunch = true, launchWaitMs = 3000 } = options;

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
      // 重置应用状态：clearData 会清除所有数据，否则只 force-stop
      if (clearData) {
        await clearAppData(agent);
      } else {
        await forceStopApp(agent);
      }

      await agent.launch(XMIND_PACKAGE);
      await sleep(launchWaitMs);
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
    let reportPath: string | undefined;

    try {
      reportPath = reportMergingTool.mergeReports(reportName) as unknown as string;
    } catch {
      // 单条用例时不合并，取最后一条单独报告
      reportPath = agent?.reportFile as string | undefined;
    }

    if (reportPath && process.env.OPEN_REPORT) {
      try {
        execSync(`open "${reportPath}"`);
      } catch {}
    }
  });

  const getAgent = () => agent;
  const getDevice = () => device;

  return { getAgent, getDevice };
}
