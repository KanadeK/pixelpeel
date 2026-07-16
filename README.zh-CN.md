# PixelPeel

> 逐像素揭开 UI 变化。

[![CI](https://github.com/KanadeK/pixelpeel/actions/workflows/ci.yml/badge.svg)](https://github.com/KanadeK/pixelpeel/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/KanadeK/pixelpeel/actions/workflows/pages.yml/badge.svg)](https://github.com/KanadeK/pixelpeel/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[English](README.md) · [简体中文](README.zh-CN.md)

无需上传，在浏览器本地对比两张 UI 截图并导出 PR 差异报告。拖入修改前后的截图，即可用四种视图检查变化。

**在线 Demo：[https://kanadek.github.io/pixelpeel/](https://kanadek.github.io/pixelpeel/)**

![PixelPeel 工作区中的 UI 截图对比](docs/screenshot.png)

## 功能

- 通过文件选择、拖放或剪贴板粘贴导入 PNG、JPEG、WebP。PixelPeel 会在浏览器中实际解码文件，拒绝无效图片和超过 4000 万像素的图片，并显示文件名、解码后尺寸和文件大小，支持替换与清除。
- 尺寸一致时直接比较；尺寸不同时，将两张图片规范化到较大的透明 RGBA 画布，可选择居中或左上对齐。
- 使用四种模式检查变化：
  - **Peel 滑杆**——通过鼠标、触控或键盘拖动分隔线，揭示 Before 与 After。
  - **Overlay 叠加**——在 0%–100% 范围内调整 After 图层透明度。
  - **Blink 闪烁**——按 250、500 或 1000 毫秒交替显示图片，支持暂停、切到后台时暂停，并遵守减少动态效果设置。
  - **Diff 差异**——生成真实的像素差异热力图，并显示变化像素、总像素、变化比例、原始尺寸和阈值。
- 支持适应屏幕、100%、缩放和平移；这些查看操作不会改变源像素或差异计算。可切换浅色、深色与透明棋盘格预览背景。
- 导出原始规范化分辨率的差异 PNG 或排版好的 PR 报告 PNG，也可复制用于 Pull Request 或 Issue 的 Markdown 摘要。
- 支持英文与简体中文、浅色与深色主题，并适配桌面和窄屏布局。
- 加载仓库内置示例，无需提供自己的文件即可体验全部对比模式。

## 隐私

**图片永远不会离开你的浏览器。** PixelPeel 只使用本机浏览器 API 解码、规范化、比较并导出图片，不包含后端、账号系统、分析、遥测、远程日志或图片上传接口。

图片数据不会写入 `localStorage`、IndexedDB、Cookie 或其他持久化浏览器存储。刷新页面后，已导入图片会自然清空。语言偏好可能保存在本地，但其中不含图片数据。只有在你主动操作时，应用才会下载导出文件或复制 PR 摘要。

透明棋盘格、浅色和深色画布仅用于预览，不会写入导出图片，也不会参与像素差异计算。

和任何本地应用一样，浏览器、操作系统、扩展以及你选择的文件仍属于安全边界的一部分。安全问题请参阅 [SECURITY.md](SECURITY.md)。

## 快速开始

需要 [Node.js](https://nodejs.org/) 24 与 npm。使用 `nvm` 时可直接读取仓库中的 `.nvmrc`。

```bash
nvm use
npm ci
npm run dev
```

打开 Vite 输出的本地地址即可。项目不需要后端或环境变量。

## 构建

```bash
npm run build
npm run preview
```

生产文件输出到 `dist/`。Vite 已针对 GitHub Pages 使用的 `/pixelpeel/` 基础路径配置。

## 测试

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest 覆盖图片规范化、RGBA 差异行为、文件验证、格式化、导出与翻译；Playwright 覆盖主要的导入、对比、语言、主题、复制、导出和响应式流程。

## 项目结构

```text
pixelpeel/
├── src/                 React 界面、翻译、图片处理与导出逻辑
├── public/              随仓库打包的静态资源与本地示例图片
├── tests/               自动化测试共用的确定性测试素材
├── e2e/                 Playwright 端到端测试
├── docs/screenshot.png  来自真实应用的 README 截图
├── .github/             CI、Pages 部署、模板与 Dependabot
└── vite.config.ts       Vite 与 GitHub Pages 子路径配置
```

部分测试文件可能与其测试的源文件放在一起。

## 键盘快捷键

文本输入框或范围控件获得焦点时，不会触发这些快捷键。

| 按键     | 操作                     |
| -------- | ------------------------ |
| `1`      | Peel 模式                |
| `2`      | Overlay 模式             |
| `3`      | Blink 模式               |
| `4`      | Diff 模式                |
| `F`      | 适应屏幕                 |
| `0`      | 以 100% 查看             |
| `Space`  | 暂停或继续 Blink         |
| `R`      | 重置视图                 |
| `Escape` | 关闭非必要浮层或帮助面板 |

## 浏览器支持

PixelPeel 面向最新版稳定 Chrome、Edge、Firefox 和 Safari。浏览器需要支持图片解码、Canvas 2D、Object URL、文件下载与剪贴板访问。剪贴板行为可能受浏览器权限和安全上下文规则影响；剪贴板不可用时仍可通过文件方式导入。

## 路线图

v0.1.0 有意聚焦于可靠的浏览器内单组图片对比。批量比较、CLI 或 CI 视觉回归流程、URL 截图、视频或 GIF 对比、Figma 集成、浏览器扩展与多人协作是可能的未来方向。这些只是想法，不代表已承诺的功能或时间表；当前应用中不会为它们放置不可用的按钮。

PixelPeel 不需要账号、云同步、AI 分析或服务端图片处理。

## 参与贡献

欢迎提交缺陷报告、无障碍改进、测试、文档和范围清晰的代码修改。发起 Pull Request 前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和[行为准则](CODE_OF_CONDUCT.md)。

如需报告漏洞，请按照 [SECURITY.md](SECURITY.md) 操作，不要在公开 Issue 中发布敏感细节。

## 许可证

Copyright © 2026 KanadeK。PixelPeel 基于 [MIT License](LICENSE) 发布。
