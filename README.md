# MotionScope

[![Live Demo](https://img.shields.io/badge/Live-Demo-8062D6?style=for-the-badge&logo=githubpages&logoColor=white)](https://rendonglugit.github.io/MotionScope/)
[![Deploy GitHub Pages](https://github.com/rendonglugit/MotionScope/actions/workflows/pages.yml/badge.svg)](https://github.com/rendonglugit/MotionScope/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[🌐 Live Demo · 在线体验](https://rendonglugit.github.io/MotionScope/)** · [格式与使用说明](#导入约定) · [部署状态](https://github.com/rendonglugit/MotionScope/actions/workflows/pages.yml)

为语聊房 / 直播动效交付打造的开源预览与检查工具。纯前端，通过 GitHub Pages 部署；不需要账号、服务器或数据库。

## 已实现

- **全部 10 类格式都有默认文件**：Lottie、PAG、SVGA、VAP、YYEVA、Spine、Spritesheet、APNG、WebP、GIF。每份示例可下载，来源与许可在信息面板及 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 中说明。
- 文件、多文件、文件夹、ZIP / dotLottie 导入；本地资源关联与缺失提示。
- 播放 / 暂停、定位、逐帧、倍速、循环、A–B 区间。
- 棋盘 / 白 / 深色 / 自定义 / 房间截图背景、缩放、边界、当前透明帧 PNG 导出。
- 尺寸、体积、时长、帧率、帧数来源、播放器版本；格式特有的动态资源与 API 参考。
- Lottie / PAG 文本及图片替换；SVGA 图片替换和叠加文字；VAP / YYEVA 动态融合字段替换。
- Spine 4.2 动作、皮肤和调试骨骼；规则雪碧图行列 / 有效帧数 / FPS、原图及网格查看。
- 检查报告与配置导出、SHA-256 校验后恢复设置与文字；素材、替换图片、房间截图不打包。

## 本地运行

需要 Node.js 24 和 pnpm 11.25.0：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test
pnpm build
pnpm preview
```

默认素材已经随工程提供，运行无需重新下载。播放器与 WASM 均由本站点提供；按格式懒加载。

## 发布到 GitHub Pages

1. 将本工程推送到你的 GitHub 仓库，默认分支使用 `main`。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送到 `main`，或手动运行 **Deploy GitHub Pages** workflow。
4. 成功后访问 `https://<username>.github.io/<repository>/`；用户主页仓库则为 `https://<username>.github.io/`。

已提供 `.github/workflows/pages.yml`，自动执行锁定依赖安装、测试、构建与 Pages 发布。Vite `base: './'` 支持仓库子路径。`dist/` 为完整静态产物，包括示例、WASM 和依赖许可。不要使用 `file://` 直接打开 HTML。

本项目的线上地址为 **[https://rendonglugit.github.io/MotionScope/](https://rendonglugit.github.io/MotionScope/)**。每次推送到 `main` 都会自动执行测试、构建并部署；实际结果以顶部部署状态徽章和 [Actions 运行记录](https://github.com/rendonglugit/MotionScope/actions/workflows/pages.yml) 为准。

首次部署若在 `actions/configure-pages` 提示 `Get Pages site failed / Not Found`，请先确认 Pages 的 Source 为 **GitHub Actions**，再重新运行失败工作流，或推送新的提交触发部署。

## 导入约定

| 格式 | 输入 | 限制 |
| --- | --- | --- |
| Lottie | JSON，或 JSON + 图片，或 ZIP / .lottie | SVG light 播放器不执行 AE 表达式；远程图片需本地提供；字体用系统字体；字形可能限制文字替换 |
| PAG | .pag | libpag 4.1.8 单线程 WASM / WebGL；字体需本机可用 |
| SVGA | .svga | 接入 2.3.2 播放器，支持 proto 和旧 ZIP 解析；音频未启用 |
| VAP | MP4 + 配套 JSON | 先按同名匹配配置，其次接受唯一配置；动态资源预览注入 |
| YYEVA | 带内嵌元数据的 MP4 | 不能用普通 MP4 假装 YYEVA；需浏览器支持其视频编码 |
| Spine | 4.2 JSON / skel + .atlas + PNG，或 ZIP | 只支持 4.2 导出；其他版本明确报错；物理使用静态检查模式 |
| Spritesheet | PNG / JPG / 静态 WebP | 规则无间距网格；设置行列、有效帧数和 FPS。不规则 atlas 暂不支持 |
| APNG | .apng 或动画 .png | UPNG.js 解码并合成 |
| WebP | 动画 .webp | ANMF 解析、按 blend / disposal 合成，浏览器需能解码 WebP |
| GIF | .gif | gifuct-js 解码，Canvas 按 disposal 合成 |

MP4 自动判断：有 VAP JSON 时使用 VAP，否则尝试 YYEVA。需要覆盖时可在视频资源面板选择协议。多套同名纹理请保持目录结构，或分别导入。

**帧语义**：GIF/APNG/WebP 使用每帧时长，FPS 是平均值；Spine 按 30 FPS 采样；PAG 总帧数由时长与帧率计算；视频 seek 是近似定位，不保证精确匹配编码帧。性能和画面需在 App 真机继续验证。

VAP 使用视频解码帧同步调度，暂停后停止绘制，连续拖动进度条会合并定位请求。检查报告中的 `diagnostics` 记录调度模式、绘制计数和回调状态；排查细节见 [VAP review 与回归验证](docs/VAP-review.md)。

单文件限制 100 MB；每次导入最多 500 个文件 / 250 MB；GIF/APNG/WebP 有约 240 MB 解码像素预算。限制用于避免浏览器被大素材拖垮，不代表可保证某台设备的内存占用上限。

## 协作与隐私

没有上传接口或云端存储。本地导入不会自动发送文件；远程 Lottie 图片不会自动请求。默认示例和运行时来自本站。图片替换只接收本地文件。

导出配置包含手动输入的文字（可能是昵称），发送前请检查。报告、素材文件需通过你选择的渠道另行发送；github.io 链接本身不能让别人读取你的本地素材。配置恢复校验素材 SHA-256，图片及场景需重新选择。关闭页面后素材不保留。

## 结构与扩展

- `src/main.js`：工作台、文件列表、交接配置与播放调度。
- `src/core.js`：格式识别、资源关联、ZIP 限制、动图元信息及网格校验。
- `src/adapters/`：统一 `meta / seek / replace / snapshot / destroy` 格式适配接口。
- `public/samples/`：随站点发布的默认素材。
- `tests/core.test.js`：解析边界、时间语义、资源关联、压缩包、默认文件真实性。
- `scripts/`：原创建例生成、官方示例采集、许可收集。
- `docs/需求评估与竞品调研.md`：实现前的研究。

## 许可

应用代码及原创建例为 MIT。播放器和第三方示例保留各自许可；**Spine Runtime 使用独立许可**，请阅读 [Spine Runtimes License](https://esotericsoftware.com/spine-runtimes-license) 和随工程提供的许可文本。开源应用本身不授予 Spine Editor 许可。
