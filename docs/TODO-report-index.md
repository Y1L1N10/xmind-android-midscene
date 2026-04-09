# 历史趋势 index.html — TODO

把零散的归档报告聚合成一个测试质量看板：`midscene_run/report/index.html`。
打开它能看到最近 N 次运行的通过率趋势、每条用例的稳定性/耗时趋势，并跳转到对应详情报告。

---

## 目标体验

```bash
npm run test:login
# 跑完 → 自动归档 → 自动更新 index.html → 自动打开总览
```

总览里能直接看出：
- 整体通过率走势
- 每条用例最近 N 次稳定性、平均耗时、趋势（变快/变慢）
- flaky 用例（同一用例既 pass 又 fail 过）
- 任意一条记录可点击跳到归档详情报告

---

## 数据来源策略

- **主方案**：每次跑完在归档目录写一份 `summary-<时间>.json`（结构化、稳定）
- **补救方案（可选）**：写迁移脚本解析现有归档 HTML 里的 `<script type="midscene_web_dump">` JSON，把老归档也补上 summary

先做主方案，老归档迁移留 P2。

---

## summary.json 数据格式（单次运行）

```json
{
  "runId": "2026-04-09_14-23-05",
  "reportName": "xmind-login-report",
  "module": "login",
  "startedAt": "2026-04-09T14:23:05+08:00",
  "duration": 372000,
  "git": { "branch": "main", "commit": "5907bda" },
  "device": { "model": "Pixel 6", "androidVersion": "14" },
  "appVersion": "1.2.3",
  "totals": { "total": 12, "passed": 10, "failed": 2 },
  "cases": [
    {
      "title": "密码登录成功",
      "describe": "P0 - 核心登录流程",
      "status": "passed",
      "duration": 85040,
      "errorMessage": null
    }
  ],
  "reportPath": "2026-04-09/xmind-login-report-14-23-05.html"
}
```

---

## index.html 页面结构

### Block 1：总览卡片
最近 N 次运行 / 总用例数 / 通过率 / 平均耗时 / flaky 数

### Block 2：通过率趋势折线
横轴时间，纵轴通过率，hover 显示当次失败用例

### Block 3：用例稳定性表格（核心）
| 用例 | 模块 | 最近通过率 | 平均耗时 | 趋势 | 最近一次 |
|---|---|---|---|---|---|
| 密码登录成功 | login P0 | 30/30 ✅ | 85s | ➡️ | [详情](...) |
| Google 快捷登录 | login P0 | 22/30 ⚠️ | 62s | 📉 | [详情](...) |

支持点表头排序、模块筛选、用例名搜索。

### Block 4：运行历史列表（可折叠）
按时间倒序，每行一次运行，附跳转链接。

---

## 技术选型

- 不引入框架：纯 HTML + CDN Chart.js + 几十行 vanilla JS
- 数据 inline 到 `<script>` 里，单文件可分享
- 表格自己写 sort，折线交给 Chart.js

---

## 实施步骤（分阶段）

### 阶段 1：写 summary（0.5 天）
- [ ] 新建 `src/setup/reportSummary.ts`，导出 `writeRunSummary(data)`
- [ ] 改 `testBase.ts`：在 `afterEach` 里收集每条用例结果到一个数组
- [ ] `afterAll` 末尾把数组 + 元数据写成 `summary-<时间>.json` 到归档目录
- [ ] 顺手抓 git commit / branch、设备信息（adb getprop）、XMind 版本
- [ ] 跑两次验证 JSON 字段齐全

### 阶段 2：聚合脚本（0.5 天）
- [ ] 新建 `scripts/generate-index.ts`
- [ ] 扫描 `midscene_run/report/**/summary-*.json`
- [ ] 按 `reportName` 分组，按 `startedAt` 排序
- [ ] 对每条用例做聚合：通过率、平均/中位耗时、最近 5 次 vs 之前 5 次的趋势、flaky 标记
- [ ] 加 `npm run report:index` 命令
- [ ] 先输出 JSON 到 stdout 验证逻辑

### 阶段 3：HTML 模板（0.5 天）
- [ ] 新建 `scripts/index-template.html`（总览卡 + 折线 + 表格 + 历史列表）
- [ ] 联调：`generate-index.ts` 把数据 inject 进模板，输出到 `midscene_run/report/index.html`
- [ ] 浏览器打开调样式

### 阶段 4：自动化 + 增强（0.5 天）
- [ ] `testBase.ts` afterAll 末尾自动调一次聚合脚本（`NO_INDEX=1` 可关闭）
- [ ] 默认跑完更新 index 并打开它（替代当前打开单次报告的逻辑，或保留两个都开）
- [ ] README/CLAUDE.md 里补一段使用说明

### 阶段 5（可选 P2）：老归档迁移
- [ ] 写 `scripts/migrate-old-reports.ts`
- [ ] 解析现有 HTML 里的 `midscene_web_dump` 反推 summary.json
- [ ] 一次性跑完补齐历史

---

## 文件清单

```
src/setup/reportSummary.ts        # 新
src/setup/testBase.ts             # 改：收集 + 写 summary + 触发聚合
scripts/generate-index.ts         # 新
scripts/index-template.html       # 新
scripts/migrate-old-reports.ts    # 新（P2）
package.json                      # 新增 report:index 命令
docs/TODO-report-index.md         # 本文档
```

---

## 备注

- 阶段 1~4 做完就可用，每阶段独立，可分多次提交
- 聚合脚本要做成幂等的：随时可重跑、不依赖运行顺序
- index.html 单文件无依赖（Chart.js 走 CDN），方便分享给团队
- 如果未来切到 CI，把 `midscene_run/report/` 整个目录作为 artifact 上传即可
