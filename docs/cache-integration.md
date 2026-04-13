# AI 缓存接入方案

## 背景

Midscene 每次 `aiTap` / `aiAct` / `aiAssert` 都会调用视觉模型做规划和定位，耗时 3-5s 且消耗 API 额度。对于 UI 稳定、操作重复的用例（如登录），开启缓存可以显著提速并降低成本。

## 缓存原理

| 缓存类型 | 存储内容 | 对应操作 |
|----------|----------|----------|
| Planning | 任务描述 → 执行工作流 | `aiAct()` |
| Locate | 元素描述 → 定位策略 | `aiTap()` / `aiInput()` / `aiLocate()` |

命中缓存时跳过 AI 推理，直接复用上次的规划和定位结果。

## 改动范围

| 文件 | 改动说明 |
|------|----------|
| `src/setup/device.ts` | `createAgent` 新增 `cache` 参数，透传给 `AndroidAgent` |
| `src/setup/testBase.ts` | `SetupOptions` 新增 `cache` 选项，传给 `createAgent` |
| `tests/login.test.ts` | `setupAndroidTest` 加 `cache: true` 开启缓存 |

## 选项设计

```ts
setupAndroidTest('xmind-login-report', {
  clearData: true,
  cache: true,             // 开启缓存，默认 read-write 策略
  // cache: 'read-only',   // 只读缓存，不写入新条目（适合 CI 回归）
  // cache: 'write-only',  // 只写缓存，不读取（适合重新录制）
});
```

### 缓存 ID

使用 `reportName` 作为 cacheId，同一测试文件共享缓存：

```
midscene_run/cache/xmind-login-report.cache.yaml
```

### 缓存策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `read-write` | 读 + 写（默认） | 日常开发迭代 |
| `read-only` | 只读不写 | CI 回归，锁定缓存避免漂移 |
| `write-only` | 只写不读 | UI 改版后重新录制缓存 |

## 验证步骤

以"密码登录成功"用例为基准对比。

### 第 1 步：清除旧缓存

```bash
rm -rf midscene_run/cache/
```

### 第 2 步：首次执行（录制缓存）

```bash
npm run test:login -- -t "密码登录成功"
```

**检查项：**

- [ ] 用例正常通过，耗时记为 T1（预计 80-90s）
- [ ] 缓存文件已生成：`ls midscene_run/cache/` 应出现 `xmind-login-report.cache.yaml`
- [ ] 打开 `.cache.yaml` 可以看到 `type: plan` 和 `type: locate` 条目

### 第 3 步：再次执行（命中缓存）

```bash
npm run test:login -- -t "密码登录成功"
```

**检查项：**

- [ ] 用例正常通过，耗时记为 T2
- [ ] T2 明显低于 T1（预期降幅 30%-60%）
- [ ] 终端日志有 cache hit 相关输出

### 第 4 步：验证缓存失效场景

```bash
# 清除缓存后再跑，耗时应回到 T1 水平
rm -rf midscene_run/cache/
npm run test:login -- -t "密码登录成功"
```

**检查项：**

- [ ] 耗时回到 T1 水平，确认缓存确实生效过

## 注意事项

- 缓存按 prompt **精确匹配**：`aiAct('点击登录按钮')` 和 `aiAct('点击 登录 按钮')` 是两条缓存
- UI 改版后需要删除 `.cache.yaml` 重新录制，否则定位到旧坐标会导致失败
- 单条操作可跳过缓存：`await agent.aiTap('xxx', { cacheable: false })`
- 缓存文件已在 `.gitignore` 中忽略（`midscene_run/` 目录）
