# 测试运行命令速查

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `NO_OPEN` | 未设置（自动打开） | `NO_OPEN=1` 跑完不打开报告 |
| `NO_ARCHIVE` | 未设置（自动归档） | `NO_ARCHIVE=1` 覆盖模式，不按日期归档 |

## 运行全部测试

```bash
npm test                    # 运行 tests/ 下所有用例
```

## 按模块运行

```bash
npm run test:login          # 登录模块
npm run test:create         # 新建页面
npm run test:mindmap        # 思维导图操作
npm run test:regression     # 内核兼容性回归
npm run test:sync           # 同步
npm run test:demo           # demo 目录（实验性用例）
```

## 按优先级运行

### 登录模块

```bash
npm run test:login -- -t "P0"    # P0 核心登录流程（密码/验证码/Google登录）
npm run test:login -- -t "P1"    # P1 异常与校验（密码错误/人机校验）
npm run test:login -- -t "P2"    # P2 UI交互（密码可见性/服务条款/隐私政策）
npm run test:login -- -t "P3"    # P3 第三方登录（Apple）
```

### 新建页面

```bash
npm run test:create -- -t "P0"   # P0 页面元素与核心功能（空白导图/模板/快捷输入）
npm run test:create -- -t "P1"   # P1 模板分类与展示
npm run test:create -- -t "P2"   # P2 快捷输入与导入
```

## 跑单条用例

用 `-t` 匹配用例名关键词：

```bash
npm run test:login -- -t "密码登录成功"
npm run test:create -- -t "快捷输入纯文本"
npm run test:create -- -t "Markdown"
npm run test:regression -- -t "全元素测试图"
```

## 常用组合

```bash
# 跑完不打开报告
NO_OPEN=1 npm run test:login

# 覆盖模式（不归档）
NO_ARCHIVE=1 npm run test:login

# 指定用例 + 不归档 + 不打开
NO_ARCHIVE=1 NO_OPEN=1 npm run test:login -- -t "密码登录成功"
```

## 用例清单

### login.test.ts

| 优先级 | 用例 |
|--------|------|
| P0 | 登录页面元素完整 |
| P0 | 密码登录成功 |
| P0 | 验证码登录成功 |
| P0 | Google 快捷登录成功 |
| P1 | 密码错误提示 |
| P1 | 验证码登录触发人机校验 |
| P2 | 密码可见性切换 |
| P2 | 服务条款跳转浏览器 |
| P2 | 隐私政策跳转浏览器 |
| P3 | Apple 快捷登录 |

### create.test.ts

| 优先级 | 用例 |
|--------|------|
| P0 | 新建页面元素完整 |
| P0 | 通过空白导图新建 |
| P0 | 通过模板新建思维导图 |
| P0 | 快捷输入纯文本创建导图 |
| P0 | 快捷输入粘贴 Markdown 长文本创建导图 |
| P1 | 基本模板分类完整 |
| P1 | 知识管理模板分类展示 |
| P1 | 通过逻辑图模板新建 |
| P2 | 导入入口可用 |
| P2 | 模板区域可滚动 |

### regression.test.ts

| 用例 |
|------|
| 打开本地文件中的"全元素测试图"能正常渲染 |
| 打开"所有导图"中的任意一份能正常渲染 |
| 新建空白导图后可添加自由主题 |

### mindmap.test.ts

| 用例 |
|------|
| 首页正常显示 |
| 新建空白思维导图 |
| 编辑中心主题文字 |
| 添加子节点 |
