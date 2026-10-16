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
├── shared/            # 共享引擎（map-core / route-engine / timeline，构建期内联）
├── data/              # chapters / places / routes / events（核心数据）
├── assets/            # leaflet + med.json + media/（本地图片）
├── build.mjs          # 构建：→ geo-story.html
├── prep-data.mjs      # 地图数据裁剪（仅在调整可视范围时运行）
├── cdp-shot.mjs       # CDP 截图 / 求值工具
├── verify.mjs / verify5.mjs  # 验收脚本
├── docs/plan.md       # 里程碑计划（M0–M5）与数据模型规范
└── paul-epistles-map/ # 归档：前身项目（冻结）
```

## 里程碑

| 里程碑 | 主题 | 状态 |
|---|---|---|
| M0 | 重构与引擎分层 | 进行中（目录 ✅，引擎随 M1 落地） |
| M1 | 第一次传道旅程端到端 | 待开始 |
| M2 | 第二、三次旅程 + 书信事件 | 待开始 |
| M3 | 被捕受审 + 赴罗马航程 | 待开始 |
| M4 | 富媒体与罗马被囚尾声 | 待开始 |
| M5 | 共享引擎回灌归档项目（可选） | 暂缓 |

## 验证

```bash
# 启动带调试端口的 Chrome
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --no-sandbox --disable-gpu --window-size=1680,1000 \
  --remote-debugging-port=9222 --user-data-dir=.cdp-profile about:blank

node verify.mjs     # M1 起编写
node verify5.mjs    # M1 起编写
```

## 数据来源与学术说明

- 年代与地点采用学界主流推定，争议处在事件 `note` 中标注（参照归档项目的标注粒度）
- 经文引用和合本，引用前须对照权威版本校对
- 媒体仅用 CC 许可或公有领域作品，`credit` + 溯源链接必填
- 地图数据 © Natural Earth · 渲染 Leaflet
