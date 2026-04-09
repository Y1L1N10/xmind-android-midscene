# v1.7 报告解析新功能 — 快速跑通

## 新增 API

```ts
import { splitReportFile, reportFileToMarkdown } from '@midscene/core';
```

### 1. 提取截图 + JSON

```ts
const result = splitReportFile({
  htmlPath: './midscene_run/report/xxx.html',
  outputDir: './output-data',
});
```

### 2. 转 Markdown

```ts
const result = await reportFileToMarkdown({
  htmlPath: './midscene_run/report/xxx.html',
  outputDir: './output-markdown',
});
```

### 3. CLI 方式

```bash
# 提取 JSON + 截图
npx @midscene/web report-tool --action split \
  --htmlPath ./midscene_run/report/xxx.html \
  --outputDir ./output-data

# 转 Markdown
npx @midscene/web report-tool --action to-markdown \
  --htmlPath ./midscene_run/report/xxx.html \
  --outputDir ./output-markdown
```

---

## TODO

- [ ] 跑一次测试生成一份归档报告
- [ ] 用 CLI 跑 `split`，检查输出的 JSON 和截图
- [ ] 用 CLI 跑 `to-markdown`，检查输出的 Markdown
- [ ] 确认输出内容完整（用例名、状态、耗时、截图、错误信息）
