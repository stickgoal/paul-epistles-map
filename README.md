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
├── verify.mjs         # CDP 验收脚本（A–J + A2–A9 回归断言）
├── scripts/
│   ├── extract.mjs    # 和合本经文提取（OpenCC 繁→简 + 双源交叉）
│   ├── extract2.mjs   #   同上（第二轮校对）
│   ├── fetch-media.mjs # Commons 图像元数据补全（--write 落盘）
│   └── run-cdp.ps1    # 验收 runner：只关闭自己启动的 headless Chrome
├── docs/
│   ├── plan.md        # 里程碑计划（M0–M6）、数据模型规范、踩坑记录
│   └── ux-review.md   # UX 评估报告 + 修复落实记录
└── paul-epistles-map/ # 归档：前身项目（冻结）
```

## 里程碑

| 里程碑 | 主题 | 状态 |
|---|---|---|
| M0 | 重构与引擎分层 | ✅ 完成（目录归档、shared/ 四件套） |
| M1 | 第一次传道旅程端到端 | ✅ 完成（12 事件，CDP 验收 10/10 通过） |
| M2 | 第二、三次旅程 + 书信事件 | 待开始 |
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

`verify.mjs` 覆盖 A–J 十项 + A2/A3/A4/A5/A6/A7/A8/A9 九条回归断言 + 控制台错误 + 截图 f1/f1b/f2/f3/f4/f5。

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
