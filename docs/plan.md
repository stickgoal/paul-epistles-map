# geo-story · 保罗故事地图 — 项目计划

> **一句话**：随时间轴播放保罗三次传道旅程与赴罗马的全程，事件在地图上依次弹出；暂停时可点击任意事件，查看经文原文、地点信息、今貌照片与历史画作。
>
> **范围**：AD 46–67。六章结构：三次传道旅程 → 被捕与受审 → 赴罗马航程 → 罗马被囚与尾声。书信写作作为一类事件纳入（直接复用 `paul-epistles-map/` 归档项目中的 13 封书信数据）。
>
> **前身**：`paul-epistles-map/`（已归档冻结，git 历史完整保留）。可复用引擎上抽至 `shared/`，构建期内联，产物保持「单文件离线 HTML、双击即用」的传统。

## 里程碑总览

| 里程碑 | 主题 | 内容 | 验收标准 | 状态 |
|---|---|---|---|---|
| M0 | 重构与引擎分层 | 目录归档；`shared/` 引擎分层（fx / map-core / route-engine / timeline）；新构建管线；本计划文档 | 归档项目可原样构建；新项目可构建空页面 | ✅ 完成 |
| M1 | 第一次传道旅程端到端 | ch1 全部 12 个事件（含塞浦路斯士求保罗）；事件驱动播放 + 点击详情 + 章节导航 | CDP 脚本断言 + 截图核对 | ✅ 完成（CDP 验收 A–J 十项全绿，零控制台错误） |
| M2 | 第二、三次旅程 | ch2 / ch3 事件 + 书信事件（帖前后 / 林前后 / 罗马书） | 同上 | 待开始 |
| M3 | 被捕受审 + 赴罗马 | ch4 / ch5：圣殿骚乱、四重审讯、马耳他船难 | 同上 | 待开始 |
| M4 | 富媒体与尾声 | ch6；照片 / 画作本地 webp + Wikimedia 署名回退 | 媒体加载与回退断言 | 待开始 |
| M5 | 共享回灌（可选） | `paul-epistles-map` 改用 `shared/` 引擎 | 归档 `verify.mjs` 全绿 | 暂缓（归档优先，避免无收益改动） |
| M6 | 音效与增强动画 | GS.fx 总线订阅点落地：WebAudio 合成音效 / 事件弹出增强动画 | 不破坏现有 A–J 断言 | 待开始（用户已提出需求） |

> **为什么引擎随 M1 抽取**：`shared/` 的抽象边界（哪些参数化、哪些回调）只有出现真实消费方后才能定形；M0 先冻结目录与构建管线，M1 边写消费方边上抽，避免无消费者的预先抽象。
>
> **M1 踩坑记录（防复发）**：CSS `var(--x}` 漏写右括号，未闭合函数会令解析器吞掉其后全部规则——`.place`/`.ev-dot` 整段静默失效，地点核心退化为 0×0 不可点，且控制台无任何报错。**纪律：改完 `template.html` 的 CSS 必须 `node build.mjs` + `node verify.mjs` 全量回归，不接受「只改了一行」的直觉判断。**
>
> **M1 修复轮踩坑记录（2026-10-16 用户反馈「描线不同步 / 进入时位置不准」）**：
> 1. **同年事件排序**：`sort` 的 tie-break 用 id 字典序会把叙事顺序打乱（保罗先讲道后出海）。**纪律：同年事件必须保持 events.json 手工顺序（按原索引稳定排序），A2 断言看守。**
> 2. **divIcon 子元素定位双扣除**：JS 设 `left/top` 与 CSS `margin` 都做居中修正会叠加成 2 倍偏移（ev-dot 恒定偏 6px）。**居中只做一方。**
> 3. **Leaflet 尺寸缓存中间态**：iframe/窗口缩放/CSS 过渡不派发 window resize，`trackResize` 收不到，`_size` 停留在某帧 0 宽——marker 全错位且 invalidateSize 不重新 fitBounds。**用 ResizeObserver 直接观察容器；fitBounds 前校验尺寸，0 宽会让 zoom 爆到 max。**
> 4. **验收脚本时序脆弱**：鼠标点击 + 截图耗时可能漂移过 dwell 边界，造成「step 跳序」假阴性。**状态断言优先用 API 精确控制，真实鼠标留给交互冒烟。**
>
> **UX 修复轮踩坑记录（2026-10-16 落实 `docs/ux-review.md` 的 11 项）**：
> 1. **⚠️ 危险命令 `taskkill /F /IM chrome.exe`**：会终止**用户自己开着的所有 Chrome 窗口**（实测一次误杀 11 个进程）。**纪律：验收一律走 `scripts/run-cdp.ps1`，它记录 PID 后用 `taskkill /PID <pid> /T` 只终止自身进程树。** 同理避免任何 `/IM` 形式的批量杀进程。
> 2. **`.ps1` 文件必须纯 ASCII**：PowerShell 5.1 在无 UTF-8 BOM 时按 GBK 解码，注释里的中文会乱码并让整份脚本语法崩溃（`@echo off` 报「意外的标记 off」）。且需设 `[Console]::OutputEncoding = UTF8`，否则 node 的中文输出被按 GBK 显示，**极易把显示乱码误判为产品缺陷**。
> 3. **CDP 表达式里不要用 `\uXXXX`**：`Runtime.evaluate` 传输时反斜杠转义会被二次处理，`/·/` 这类正则静默不匹配。改用 `String.fromCharCode(183)`。
> 4. **绝对不要用 `/IM` 批量杀进程做「收尾清理」**：这是本项目最严重的一次工具误用，已写入用户级记忆。
> 5. **Commons 全文搜索不能直接取第一条**：会把植物学名（Lystra lanata）、现代风景区排在古代遗址之前。**图像素材必须人工指定精确文件名 + API 校验存在性与授权。**
> 6. **绝对定位的 hover transform 会覆盖定位**：圆点错位用 `style.transform` 会被 `:hover{transform:scale()}` 顶掉，**像素偏移必须走 CSS 变量**（本项目用 `--dx`）。
> 7. **`pointer-events:none` 与 click 监听互斥**：章节色带带此属性时 click 永不触发，且不会有任何报错。

## 1. 架构

### 1.1 目录结构

```
geo-story/
├── template.html        # 页面结构 + CSS + UI 编排（侧栏 / 详情 / 播放控件）
├── shared/              # 与 paul-epistles-map 共用的引擎（构建期内联，产物仍是单文件）
│   ├── fx.js            #   事件总线（音效 / 增强动画订阅点，M6 消费）
│   ├── map-core.js      #   地图基底：GeoJSON 底图 / 经纬网 / flyTo / 点亮 / 涟漪 / 标签避位
│   ├── route-engine.js  #   平滑路径 / 累计里程 / 按年代截取点亮 / 路线光点 / 旅程重播
│   └── timeline.js      #   时间轴控件（拖拽 / 键盘 / 圆点 / 色带）+ 播放调度 + 事件序列播放
├── data/                # 纯数据（改内容只动这里）
│   ├── chapters.json    #   六章元数据
│   ├── places.json      #   地点库：坐标 / 古今名 / 现代归属 / 备注
│   ├── routes.json      #   四段旅程路径点（命名途经点）
│   └── events.json      #   事件库（核心资产，见 §1.4）
├── assets/
│   ├── leaflet.js / .css / med.json / countries-110m.json / topojson-client.min.js
│   └── media/           #   本地图片（webp 优先）；缺失时回退外链
├── build.mjs            # 构建：template + shared + data + assets → geo-story.html
├── prep-data.mjs        # 地图数据裁剪（仅在需要调整可视范围时运行）
├── cdp-shot.mjs         # CDP 截图 / 求值工具（从归档项目原样搬入）
├── verify.mjs           # CDP 验收脚本（M1 起编写，A–J 十项）
├── scripts/             # 经文提取管线（OpenCC 繁→简 + 双源交叉，M2 加事件时复用）
├── docs/plan.md         # 本文件
├── paul-epistles-map/   # 归档：保罗书信地图（冻结，不再改动）
└── README.md
```

### 1.2 构建管线

`build.mjs` 读取 `template.html`，替换占位符后产出单文件 `geo-story.html`：

| 占位符 | 来源 | 说明 |
|---|---|---|
| `@@LEAFLET_CSS@@` | `assets/leaflet.css` | 过滤含 `url(` 的行 |
| `@@LEAFLET_JS@@` | `assets/leaflet.js` | 去 sourceMappingURL、转义 `</script` |
| `@@GEOJSON@@` | `assets/med.json` | 地中海裁剪 GeoJSON |
| `@@GS_MAPCORE@@` | `shared/map-core.js` | 共享引擎 |
| `@@GS_ROUTES@@` | `shared/route-engine.js` | 共享引擎 |
| `@@GS_TIMELINE@@` | `shared/timeline.js` | 共享引擎 |
| `@@GS_FX@@` | `shared/fx.js` | 共享引擎（事件总线） |
| `@@DATA_CHAPTERS@@` / `@@DATA_PLACES@@` / `@@DATA_ROUTES@@` / `@@DATA_EVENTS@@` | `data/*.json` | 数据 |

```bash
node build.mjs   # → geo-story.html（Leaflet + 数据 + 引擎全内联，离线可用）
```

### 1.3 模块职责

| 模块 | 职责 | 来源 |
|---|---|---|
| `shared/map-core.js` | 地图初始化、底图 / 经纬网 / 控件；`flyToCity` / `litCity` / `ripple` / 城市标签自动避位 | 自 `template.html` 平移抽取 |
| `shared/route-engine.js` | `smoothPath` 平滑、累计里程、`applyTime` 按年代逐段点亮、路线光点、旅程重播动画 | 自 `template.html` 平移抽取 |
| `shared/timeline.js` | 时间轴渲染 / 拖拽 / 键盘 / 播放循环；**新增**：事件序列调度（光标逐事件推进 + 到达回调 + dwell 停留） | 自 `template.html` 平移 + 扩展 |
| `shared/fx.js` | 事件总线 `GS.fx.on/off/emit`；M6 音效与增强动画的订阅点 | 新写 |
| `data/places.json` | 地点：`{ id, cn, en, modern, ll, note, ctx }` | 新写（整合归档 `CITIES` + `CTX` + 新增） |
| `data/routes.json` | 旅程：`{ id, name, from, to, color, stops:[{cn,ll}...], desc }` | 自归档 `JOURNEYS` 扩展（途经点加名） |
| `data/events.json` | 事件（§1.4） | 新写，核心资产 |
| `data/chapters.json` | 章节：`{ id, name, years, range, from, to, color }` | 新写 |
| `template.html` | 页面结构 + CSS + UI 编排；事件类型色板；详情面板富媒体布局 | 以归档模板为基底改写 |

### 1.4 事件数据模型

```js
// data/events.json —— 字段规范（JSON 数组，每项一个事件）
{
  id: 'paphos-sergius',        // 语义化 slug，用于 hash 深链 #e/paphos-sergius
  ch: 'ch1',                   // 所属章节
  type: 'preach',              // arrival | preach | miracle | persecution | trial | letter | council
  from: 46, to: 46,            // 年代（可为区间，如 {from:46,to:48}）
  title: '士求保罗信主',        // 中文标题
  en: 'Sergius Paulus Believes',
  place: 'paphos',             // 关联 places.json 地点 id
  brief: '以吕马受罚，士求保罗信主；扫罗始称保罗',  // 一句话摘要（时间轴 tooltip / 事件卡）
  narrative: '……',            // 叙事 2–4 句（学术中立语气）
  verses: [                    // 经文（和合本），可多节
    { ref: '使徒行传 13:9-12', text: '……' }
  ],
  media: [                     // 媒体（本地优先，缺失回退外链）
    { kind: 'photo',           // photo | art
      title: '帕福斯石质地基马赛克（士求保罗府邸遗址推定）',
      src: 'assets/media/paphos-sergius-mosaic.webp',   // 本地相对路径，可缺省
      credit: 'Photo: xxx, CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/…' }     // 署名 / 溯源链接
  ],
  note: '……'                   // 可选：年代 / 地点 / 史实的学术争议标注
}
```

> **M1 定形说明**：事件数据全部走 JSON 数组配置（用户硬性要求，非硬编码）；M1 的 12 个事件已验证「改数据 → `node build.mjs` → 无需改代码即可上线」的闭环。

## 2. 播放与交互设计

### 2.1 事件驱动播放（与书信地图「年份扫描」的区别）

- **播放 = 按事件序列推进**：时间轴光标平滑移至下一事件年代 → 到达 → 地图上该事件标记弹出（pop 动画）+ 事件卡滑入 → 停留 dwell（默认 5s，可配 0.5x / 1x / 2x）→ 继续下一事件
- **智能跟随**：事件地点在视口外才 `flyTo`，避免全程镜头眩晕；路线沿年代延伸由 `route-engine` 负责
- 拖动时间轴 / 打开详情 / 点击章节 → 自动暂停

### 2.2 控件

播放 / 暂停、上一事件 / 下一事件（步进）、速度切换、章节下拉跳转、重置视图、图层开关（路线 / 事件 / 标签）

### 2.3 详情面板（点击事件标记 / 时间轴圆点 / 章节列表项）

标题 + 年代 → 地点（古今名 + 现代归属）→ 叙事 → 经文（多节，和合本）→ 媒体（照片 / 画作网格，本地缺失显示「在线查看」）→ 争议标注（如有）→ 「在地图上定位」

### 2.4 深链与键盘

- `#e/<事件id>` 直达事件详情（如 `#e/paphos-sergius`）；`#ch/<章节id>` 跳到章节
- 空格 播放 / 暂停 · ← → 步进事件 · Esc 返回列表

## 3. 视觉

沿用归档项目的 Apple 极简体系（CSS 变量原样迁移）。事件类型色板（在旅程色基础上扩展）：

| 类型 | 色值 | 类型 | 色值 |
|---|---|---|---|
| arrival 启程 / 抵达 | `#8fa3b8` | persecution 逼迫 / 骚乱 | `#a34a33` |
| preach 传道 / 教导 | `#8fa79a` | trial 被捕 / 审讯 | `#7d6b5d` |
| miracle 神迹 | `#b39c8a` | letter 书信写作 | `#a493b6` |
| council 教会决议 | `#6f7f74` | | |

## 4. 数据规范（学术纪律）

1. **年代推定**：所有事件年代采用学界主流推定；争议处必须写 `note`（参照归档项目的标注粒度）
2. **经文**：统一和合本；引用前须对照纸质 / 权威电子版校对
3. **媒体版权**：仅使用 CC 许可或公有领域作品；`credit` 与 `url` 必填；本地文件用 webp，单张 ≤ 300KB
4. **新增事件流程**：只改 `data/events.json`（+ `places.json` / `routes.json`）→ `node build.mjs` → CDP 验收（经文用 `scripts/extract.mjs` 管线提取校对）

## 5. M1 事件清单（第一次传道旅程 · 徒 13–14 + 徒 15）

| # | id | 年代 | 事件 | 地点 | 类型 | 关键经文 |
|---|---|---|---|---|---|---|
| e01 | antioch-commission | AD 46 | 安提阿受差遣：圣灵分派巴拿巴与扫罗 | 安提阿（叙利亚） | arrival | 徒 13:2-3 |
| e02 | paphos-sergius | AD 46 | 帕弗：以吕马受罚，士求保罗信主；扫罗始称保罗 | 帕弗（塞浦路斯） | preach | 徒 13:6-12 |
| e03 | antioch-pisidia-sermon | AD 46–47 | 彼西底的安提阿：会堂讲论基督复活 | 安提阿（彼西底） | preach | 徒 13:16-41 |
| e04 | antioch-pisidia-expelled | AD 47 | 外邦人欢喜信主；犹太人挑唆逼迫，二人离城 | 安提阿（彼西底） | persecution | 徒 13:48-50 |
| e05 | iconium-stay | AD 47 | 以哥念：放胆讲道，主借他们的手迹赐恩，多人信主 | 以哥念 | preach | 徒 14:1-3 |
| e06 | lystra-lame-walk | AD 47 | 路司得：生来瘸腿的行走 | 路司得 | miracle | 徒 14:8-10 |
| e07 | lystra-stoning | AD 47 | 众人喧哗献祭；保罗被石头打不死；次日离去 | 路司得 | persecution | 徒 14:11-20 |
| e08 | derbe-teaching | AD 47 | 特庇：宣讲福音，教导多人 | 特庇 | preach | 徒 14:20-21a |
| e09 | return-visit | AD 47–48 | 回访诸城坚固门徒，选立长老，禁食交托 | 路司得 → 以哥念 → 安提阿 | preach | 徒 14:21-23 |
| e10 | antioch-report | AD 48 | 归回安提阿：汇报神同工的一切事 | 安提阿（叙利亚） | arrival | 徒 14:24-28 |
| e11 | galatians-letter | AD 48–49 | 写《加拉太书》为真道辩护（推定于安提阿） | 安提阿（推定） | letter | 加 1:6-9 |
| e12 | jerusalem-council | AD 49 | 耶路撒冷会议：外邦信徒不受割礼之约束 | 耶路撒冷 | council | 徒 15:1-29 |

> e11 直接复用归档项目 `EPISTLES` 中 gal 的数据（年代 AD 48–49、安提阿、争议标注），验证「书信事件」与既有数据的衔接。

## 6. 章节规划（后续里程碑的事件源）

| 章节 | 名称 | 年代 | 经文范围 | 里程碑 |
|---|---|---|---|---|
| ch1 | 第一次传道旅程 | AD 46–48 | 徒 13–14（+徒 15） | M1 |
| ch2 | 第二次传道旅程 | AD 49–52 | 徒 15:36–18:22 | M2 |
| ch3 | 第三次传道旅程 | AD 52–57 | 徒 18:23–21:17 | M2 |
| ch4 | 被捕与受审 | AD 57–59 | 徒 21–26 | M3 |
| ch5 | 赴罗马航程 | AD 59–60 | 徒 27–28:16 | M3 |
| ch6 | 罗马被囚与尾声 | AD 60–67 | 徒 28:17-31 + 书信 + 传统 | M4 |

## 7. 验证方案

- **工具**：`cdp-shot.mjs`（原样搬入）+ 新写 `verify.mjs`；headless Chrome 真实时间驱动（冻结 CSS 过渡的 `--virtual-time-budget` 截图模式有伪影，禁用）
- **断言不变量（反漂移）**：事件总数 == 数据声明数；播放至终态时最后一个事件详情可打开；点击事件标记后详情含经文引用；媒体本地缺失时显示回退链接；控制台零错误
- **M1 十项**：A 启动态 / B 点击详情 / C 返回列表 / D 播放 / E 步进 / F 深链 / G 章节筛选 / H 地点筛选 / I 重置 / J 移动端 + 截图 f1–f5
- **截图核对**：每里程碑关键态截图（播放中事件卡 / 详情富媒体 / 移动端）

## 8. 已知限制与风险

1. **地图精度**：110m Natural Earth 数据在 zoom ≥ 9 时海岸线偏粗；城市级细节作为已知限制，必要时升级 50m 数据（体积换精度）
2. **媒体外链**：Wikimedia 外链需联网；本地优先 + 回退链接兜底
3. **换行符形态**：仓库 blob 为 LF，Windows 工作区因 `core.autocrlf=true` 检出为 CRLF；构建产物继承 CRLF（与归档项目既有形态一致），非 bug
