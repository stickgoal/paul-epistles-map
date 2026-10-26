# geo-story · 保罗故事地图

使徒行传 13–28 章 + 保罗书信的「时间轴故事地图」——随时间轴播放，事件在地图上依次弹出；暂停时可点击事件，查看经文原文、地点信息、今貌照片与历史画作。

- **范围**：AD 46–67，三次传道旅程 → 被捕与受审 → 赴罗马航程 → 罗马被囚与尾声（六章）
- **形态**：单文件离线 HTML，Leaflet + 数据 + 引擎全内联，双击即用
- **前身**：`paul-epistles-map/`（保罗书信写作地点地图，已归档冻结）

## 快速开始

```bash
node build.mjs    # template.html + shared/ + data/ + assets/ → geo-story.html
```

改内容只动 `data/`（事件 / 地点 / 路线 / 章节）与 `template.html`，详见 [docs/plan.md](docs/plan.md)。

## 目录结构

```
geo-story/
├── template.html      # 页面结构 + CSS + UI 编排
├── shared/            # 共享引擎（map-core / route-engine / timeline / fx，构建期内联）
├── data/              # chapters / places / routes / events（核心数据，全 JSON）
├── assets/            # leaflet + med.json + 底图 GeoJSON + media/（本地图片）
├── build.mjs          # 构建：→ geo-story.html
├── verify.mjs         # CDP 验收脚本（A–J + A2–A11 / D3–D7 / J2 + M2-1…M2-8）
├── scripts/
│   ├── verses.mjs     # 双源经文提取与校对（OpenCC 繁→简 + 逐字比对 + 变体分组归一）
│   ├── check-events.mjs # events.json 经文回验（用字逐字一致 + 双源一致，退出码 2 阻断）
│   ├── check-routes.mjs # 事件↔路线映射与描线单调性校验
│   ├── commons.mjs    # Wikimedia Commons 检索与授权核验（429 指数退避）
│   ├── fetch-media.mjs # Commons 图像元数据补全（--write 落盘）
│   ├── measure-fps.mjs # 播放性能探针：帧间隔 / SVG d 重写 / 地图事件风暴 / longtask
│   ├── experiment-rig.mjs # 相机 rig 数学验证（一次性实验，防复发存档）
│   └── run-cdp.ps1    # 验收 runner：只关闭自己启动的 headless Chrome
├── docs/
│   ├── plan.md        # 里程碑计划（M0–M6）、数据模型规范、踩坑记录、事件清单
│   ├── ux-review.md   # UX 评估报告 + 修复落实记录
│   └── reference-projects.md # 同类开源项目与可复用数据源调研（2026-10-18）
└── paul-epistles-map/ # 归档：前身项目（冻结）
```

## 里程碑

| 里程碑 | 主题 | 状态 |
|---|---|---|
| M0 | 重构与引擎分层 | ✅ 完成（目录归档、shared/ 四件套） |
| M1 | 第一次传道旅程端到端 | ✅ 完成（12 事件，CDP 验收全绿） |
| M1.1 | 交互失效修复 + 相机/路线同一时钟重构 | ✅ 完成（见 `docs/ux-review.md` §七） |
| M2 | 第二、三次旅程 + 书信事件 | ✅ 完成（累计 53 事件 / 3 章 / 17 地点，双源经文回验 56/56） |
| M3 | 被捕受审 + 赴罗马航程 | 待开始 |
| M4 | 富媒体与罗马被囚尾声 | 待开始 |
| M5 | 共享引擎回灌归档项目（可选） | 暂缓 |
| M6 | 音效与增强动画（fx 总线已预留订阅点） | 待开始 |

## 验证

验收请用 helper 脚本，**不要手动 `taskkill /IM chrome.exe`**（会杀掉你自己开着的所有 Chrome 窗口）：

```bash
# 一条命令搞定：启动独立 headless Chrome → 跑验收 → 只关闭自己启动的那一个
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 verify.mjs
# 可选窗口尺寸： ... run-cdp.ps1 verify.mjs 1280 800
```

`verify.mjs` 覆盖 A–J 十项 + A2–A11 / D3–D7 / J2 回归断言 + 控制台错误 + 截图 f1/f1b/f2/f3/f4/f5。D4–D7 覆盖 2026-10-17 播放体验轮：到达才弹卡 / 路线精确过点 / 地点呼吸频率 / 播放缩放节奏。M2-1…M2-8 覆盖数据扩容后的不变量：章节年代范围 / 同年顺序 / **章节闸门（事件只驱动本章旅程）** / 地点事件点齐全 / 字段完整性 / 事件↔路线命中 / 时间轴承载力 / 章节筛选。

数据侧还有两道静态回验（改完 `data/` 先跑这两条，再进 CDP 验收）：

```bash
node scripts/check-events.mjs   # 每条经文重新从双源提取并去标点逐字比对，用字不一致即退出码 2
node scripts/check-routes.mjs   # 事件↔路线站点映射完整性 + 按播放顺序推演描线是否单调向前
```

播放期性能探针（帧间隔 / SVG 重写次数 / 地图事件风暴，用于相机与动画改动的量化对比）：

```bash
# 先由 run-cdp.ps1 拉起 Chrome，再跑探针（也可 CDP_PORT/MEASURE_PAGE 指向其他实例）
$env:MEASURE_TAG='before'; $env:MEASURE_SECS='12'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 scripts/measure-fps.mjs
```

> **写交互断言的硬性要求**：点击必须走**真实输入事件**（CDP `Input.dispatchMouseEvent`，
> 见 `verify.mjs` 的 `realClick()`），**不要用 DOM 合成 `.click()`** —— 合成事件绕过浏览器命中测试，
> 无法暴露「元素在 mousedown 与 mouseup 之间变得不可命中」这类缺陷。
> 本项目曾因此让三个真实缺陷长期通过验收（`docs/ux-review.md` §7.1）。
> 同理，凡是要量布局的断言，必须先确认元素处于**可见状态**，否则 `display:none` 后的
> rect 全为 0，任何几何断言都会无条件通过。

图像素材补全（需联网访问 Commons API）：

```bash
node scripts/fetch-media.mjs          # 预览：校验候选文件的授权
node scripts/fetch-media.mjs --write  # 写入 data/events.json 的 media 字段
```

## 数据来源与学术说明

- 年代与地点采用学界主流推定，争议处在事件 `note` 中标注（参照归档项目的标注粒度）
- 经文引用和合本，引用前须对照权威版本校对
- 媒体仅用 CC 许可或公有领域作品，`credit` + 溯源链接必填
- 地图数据 © Natural Earth · 渲染 Leaflet
