# 同类开源项目与可复用数据源（2026-10-18 调研沉淀）

> **来源**：§1–§4 为 2026-10-18 用户问「网上有没有类似开源项目可以参考」的全网调研结论；§5 为 2026-10-27 用户问「从 battles-of-the-romans 能得到哪些启发」的**源码级**深拆（扒了完整 `index.html` 与内嵌数据 JSON），供后续里程碑（M3 被捕受审 / M4 罗马尾声 / M6 动画）取用。
> **纪律提醒**：引用任何外部数据前先看许可证——CC BY 需署名，CC BY-SA 有传染性（会要求衍生数据同协议发布）。geo-story 自身的产物是单文件离线 HTML，若内嵌 SA 数据会牵连整份产物的协议，须单独评估。

## 1. 最像的开源同类

| 项目 | 技术栈 | 可借鉴点 |
|---|---|---|
| [garridolecca/pauls-journeys](https://github.com/garridolecca/pauls-journeys) | ArcGIS Maps SDK for JS + Calcite | 四次宣教旅程、30+ 城市、经文筛选、古今地名切换（2026-03 仍活跃） |
| [viz.bible/journeys](https://viz.bible/journeys) | Mapbox（Robert Rouse） | 地图圈数据最细，逐节经文落点 |
| [Gitee zhenghong-wang/Jesus-map](https://gitee.com/zhenghong-wang/Jesus-map) | 中文前端 | 中文人物时间线地图的交互范式 |
| paulineletters.com / wsb.bible/atlas / Anselm Atlas | 在线服务 | 见的是**产品形态**（书信作者分布 → 人物 → 地图联动），未见开源 |

> ArcGIS / Mapbox 类项目均依赖在线 CDN 与 token，会破坏 geo-story「单文件离线、双击即用」的形态——**只取交互与数据结构，不取运行时依赖**。

## 2. 现成开源数据（geo-story 可直接接）

| 数据集 | 许可 | 规模 | 与本项目的契合度 |
|---|---|---|---|
| [robertrouse/theographic-bible-metadata](https://github.com/robertrouse/theographic-bible-metadata) | CC BY-SA 4.0（2026-10 仍更新） | 31,102 节 KJV + 3,067 人物 + ~1,030 地点 + 450 事件（含 Acts 时间线）+ `geo/pauls_journeys_all.geojson` + `bible-places.geojson`（Linked Places 格式） | **最高**——与 `data/events.json` / `places.json` / `routes.json` 三件套结构最同构，可作为 M3/M4 的事件源与地点坐标校核源 |
| [openbibleinfo/Bible-Geocoding-Data](https://github.com/openbibleinfo/Bible-Geocoding-Data) | CC BY 4.0 | 1,342 古地名 + 6,621 GeoJSON/KML + 识别置信度 + 442 条来源引用 | **高**——「识别置信度 + 来源引用」的字段设计正合本项目的学术纪律（地点note 标注争议），可用来校核现有 17 个地点的坐标与古今名 |
| [Pleiades](https://pleiades.stoa.org/) | CC BY | 42k 古代地名 | 古代地名权威库，可查「推罗/特罗亚」这类同形异地的标准名 |
| [DARE imperium.ahlfeldt.se](https://imperium.ahlfeldt.se/) | CC BY | 罗马帝国矢量底图 | 底图精度高于 Natural Earth 110m，是 M4「罗马城郊」精度的备选 |
| ORBIS Stanford | — | 罗马道路与海路模型 | 校正「保罗的行程是否走海路/陆路」的行进判定 |
| Natural Earth / OpenHistoricalMap | 公版 / CC | 通用底图 | 现用（Natural Earth 裁剪版 `assets/med.json`） |

## 3. 架构与动画参考

| 库 / 项目 | 许可 | 借鉴点 |
|---|---|---|
| [StoryMapJS](https://github.com/NUKnightLab/StoryMapJS)（NUKnightLab） | MIT | slide 式故事地图，JSON 驱动，与本项目「章节 = slide」同构 |
| [Odyssey.js](https://github.com/CartoDB/odyssey.js)（CARTO，已归档） | BSD | scroll / torque 模板可读，但已停更，只取架构 |
| [TimeMapper](https://github.com/okfn/TimeMapper) | 公共领域 | TimelineJS + Leaflet + 表格数据三件套 |
| [scrollama](https://github.com/russellsamora/scrollama)（MIT） | MIT | IntersectionObserver 滚动叙事，README 收录 Scrollytelling-Mapbox 案例 |
| [Leaflet.Polyline.SnakeAnim](https://github.com/IvanSanchez/Leaflet.Polyline.SnakeAnim)（IvanSanchez, 335★） | MIT | 描线生长 + 「地图跟随蛇头」——正是 geo-story 相机 rig 的同款思路；但其 per-frame `panTo` 会触发全场景重投影，本项目的 `map._rawPanBy` 零事件通道更优 |
| [Leaflet.MovingMarker](https://github.com/ewoken/Leaflet.MovingMarker)（ewoken, 350★, MIT） | MIT | 沿路线移动 marker + `addStation` 站点停留 = 本项目的 dwell 需求 |
| [cambecc/earth](https://github.com/cambecc/earth)（MIT, 6.6k★） | MIT | 时间轴 scrub + 播放 + 插值动画的 UX 标杆（earth.nullschool.net） |
| [AntV L7](https://github.com/antvis/L7)（MIT） | MIT | WebGL 飞线 / 水波纹 / 点亮城市动画 + camera flyTo，中文文档；GPU 动画备选（M6 若需更重的视觉效果） |

## 4. 结论（对本项目的行动项）

1. **M3/M4 的事件与地点可优先查 theographic 与 Bible-Geocoding**：前者补事件（450 条 Acts 事件里挑 ch4–ch6），后者校核地点（置信度 + 来源引用正好填 `places.json` 的 `note`）。
2. **底图若要提精度再考虑 DARE / Pleiades**，当前 Natural Earth 110m 已是已知限制（M3 的罗马城郊会放大这个问题）。
3. **动画升级不必换技术栈**：L7 / canvas 方案留到 M6 需求明确时再评估；本项目 `map._rawPanBy` + `flyTo` 的零重投影通道已能覆盖现有体验需求。
4. **许可证是硬约束**：SA 类数据不内嵌进单文件产物；只作为「对照与校核来源」，人工核对后把结论写进本项目自己的 `data/`。

---

## 5. 专题深拆：iosiflazaridis / battles-of-the-romans（2026-10-27）

> **来源**：2026-10-27 用户问「从这个网站能得到哪些启发」，**完整扒了 GitHub 源码**（`index.html` 2.44 MB 单文件，含内嵌 JSON + 358 行手写 JS），非仅读页面。
> **性质**：与 §1 的「开源同类」不同——它不是开源项目，是作者独立编译的**数据专题站**。README 未标 CC 许可，**数据不可搬，只取方法与模式**。
> **地址**：<https://iosiflazaridis.github.io/battles-of-the-romans/>（源仓库 `github.com/iosiflazaridis/battles-of-the-romans`，姊妹站 *Where the Greeks Fought* c.700 BCE–c.10 CE 与 1461–Today）

### 5.1 它是什么

**Where the Romans Fought** —— 1,709 场有名称的罗马陆战与海战（753 BCE 建城 → 1475 CE 克里米亚 Theodoro 陷落），涵盖王国 / 共和国 / 帝国（东西宫廷合一）/ 1204 后全部罗马继承政权。

核心数字（页面 `facts` 区与 CSV 实测一致）：

| 指标 | 值 | 说明 |
|---|---|---|
| 战役总数 | 1,709 | 内嵌 JSON `rows.length` |
| 结果已知 | 1,469 | 计入胜负统计 |
| 罗马内战 | 236 | 映射并列出，**但不计入评分** |
| 结果未知 | 4 | 不计分 |
| 位置置信 known / approximate / region-only | 586 / 812 / 311 | 三档，见 §5.5 |
| borderline 条目 | 649 | 「可能不完全符合收录规则，但为避免遗漏而保留」 |
| traditional 条目 | 94 | 「仅见于后世传统记载，现代史家存疑」 |
| 希腊语使用者比例估计 | 1,709 条，其中 **1,061 条低置信** | 估算依据写入 `note` |
| 研究批次 / 核查轮次 | 21 批 / 12 轮 | 12 轮核查后：+123 战役、修正 129 字段、删 7 条 |

页面结构：Map（地图）→ Wins and losses（胜负）→ All battles（全部战役表）→ Images（18 张图）→ How it was made（研究方法）→ Calls made（判断规则）→ Left out（排除项）。

### 5.2 技术底座实测（我们**不抄**的部分）

| 维度 | 它的做法 |
|---|---|
| 地图引擎 | **零依赖自写 SVG**，无 Leaflet / Mapbox / D3 |
| 投影 | Natural Earth 底图 + **Mercator**；实测拟合 `x = 14.9986·lon + 157.46`、`y = -14.9833·merc(lat) + 1031.39`，viewBox 900 × 653 |
| 缩放 | 改 `viewBox`（`setVB` / `zoomAt`），`maxZoom = 16`；双指 pinch 手写 pointer 事件 |
| 渲染 | 全部 SVG DOM，路径数据内嵌（`land` 53 KB、`bo` 52 KB、`fine` 105 KB） |
| 数据 | `<script type="application/json" id="data">` 约 2.4 MB；另发 CSV / JSON / XLSX |
| 字体 | **Google Fonts 外链**（Marcellus / Gentium Book Plus / IBM Plex Sans Condensed） |
| 主题 | CSS 变量 + `prefers-color-scheme` 双份变量 + `[data-theme]` 手动覆盖 |

**结论：不换技术栈。** 我们的 `map._rawPanBy` 零事件通道（d 重写 -94%、moveend -98%）在性能上优于它每帧改 viewBox 的做法；它的 Google Fonts 外链还会破坏 geo-story「单文件离线、双击即用」的形态。**只取信息设计与数据建模，不取运行时依赖。**

### 5.3 启发一：可审计性三件套（★ 最高价值）

它的数据诚实度是整个项目最值得学的部分，由三块拼成：

1. **`How it was made`（方法章）** —— 不是免责声明而是**可复核的操作手册**：「什么算一场战役」（有名称 + 罗马力量作为主交战方或具名盟军 + 发生过实际交战；围城只有在真打起来才算）、罗马的判定范围（王国/共和国/帝国东西合一/1204 后继承国；**附庸王与盟友不算罗马，罗马人在外国军队服役也不算罗马战役**）、传统战役的处理、胜负的判定口径（**以战场上的实际胜利为准，不以战略结果为准**；围城攻城方胜 / 解围守方胜；双方都宣称胜利且现代研究无定论 → 记平局）。
2. **`Calls made`（判断规则章）** —— 凡规则留有解释空间，逐条给 **「The call / Why / Alternative」三段**：我这样判定 + 为什么 + 另一种处理方式。读者自己权衡。
3. **`Left out`（排除项章）** —— **被排除的项目逐条列出排除原因**（未命名遭遇战、无战事的屠杀与占领、传说、重复记录、不满足「罗马为交战方或独立盟军」条件），连 12 轮核查中删掉的 7 条也在其中。

外加**每条记录内嵌两段理由**：`db`（why doubted，存疑理由）与 `bd`（why borderline，边界理由），UI 上以 `Traditional` / `Borderline` 标签呈现，hover 标签即读理由。

**对 geo-story 的落点：**

- 我们 `places.json` 有 `note`、`events.json` 有 `note`，但**只有散文，没有「排除项」页与「判断规则」页**。他 1,709 条撑得起这两页，我们 84 条事件更该做。
- 建议新增页面章节 **「我们如何取舍」**（对应 Calls made）与 **「未纳入的内容」**（对应 Left out），后者逐条写明为什么某段经文/某次事件不进地图。
- 建议把 `note` 从**单字段散文**升级为**两个正交字段**：
  - `precision`：`known` / `approximate` / `region-only`（位置置信，见 §5.5）
  - `doubt`：存疑/边界理由的结构化字段 + 是否 traditional / borderline 布尔位
- 现有 `plan.md` §4「数据规范（学术纪律）」已有「争议处必须写 note」这条，但**纪律写在文档里、读者看不到**——应上页面。

### 5.4 启发二：复合标记（饼图点）

**每个地点画成一个小型饼图**，而不是普通圆点：

- **面积** ∝ 该地战役数（半径 `2.2 + 1.9·√n`，单位随缩放归一）
- **扇区** = 对手构成，从 12 点方向起按图例顺序顺时针排（`a0 = -π/2` 起累加）
- **颜色** = 对手类别（9 类：希腊人 / 波斯与东方 / 意大利诸族 / 迦太基与非洲 / 西欧 / 巴尔干与斯拉夫 / 草原·塞尔柱·奥斯曼 / 阿拉伯 / **灰色=内战**）
- **形状**：陆战=圆，海战=菱形（用 `clipPath` 把扇区裁进菱形），只有区域已知=虚线圆环，地图外（Caledonia / Nubia / Arabia）=**边缘三角**指向地图外框
- **聚合**：按 (类型, 地点) 分组 + 距离阈值（`th = 7u` / `nth = 16u`）合并，缩小时合并、放大时拆开
- **标签**：按缩放级别设阈值（`z≥3` 全部标、`z≥1.6` 需 ≥2 场或重要度 ≥2、更低需 ≥3）控制密度；`getBBox()` 碰撞检测 + 4 个候选位（左/右/上/下）+ 两套命中策略（普通位不许压小点，大簇位可压小点但不许压别的标签或出框），放不下就**不画**而不是硬挤

**对 geo-story 的落点：** 我们现在地点是单色点。30 地点 / 84 事件的规模正好适合改成**扇区 = 事件类型占比**（宣教 / 受审 / 书信 / 航行），一眼看出「安提阿是宣教枢纽、罗马是书信终点」。`plan.md` §3 已有 7 类事件色板，可直接拿来当扇区配色。注意与 `map-core.js` 现有的 `litCity` / `ripple` 呼吸动画的叠加关系。

### 5.5 启发三：位置三级置信（★ 与 §5.3 同批做）

`known`（586）/ `approximate`（812）/ `only within their region`（311），三档在地图上以实心 / 近似 / 虚线环区分，CSV 里也有 `location` 列。

**对我们的具体价值：**

- **米利大岛（Melite）**——是马耳他还是地中海某小岛，学界至今有争议（徒 28:1-10 遇风暴、保罗获救）。我们现在的 `ll` 是单值坐标，**没有表达「这个点其实有争议」**。
- 保罗晚年的**罗马城郊**、**以弗所**定位同理。
- 我们 `places.json` 的 `note` 已在散文里提争议（符合 `plan.md` §4 纪律），但**标记本身看不出置信度**——读者在地图上无法分辨「精确定位」与「大概在那一带」。

**落点：** `places.json` 加 `precision` 字段（`known` / `approximate` / `region`），地图标记按档位变形，详情面板标注定位依据。这是**低成本高回报**——只改数据 + 一个映射函数。

### 5.6 启发四：时间轴的密度视图与空白段处理（中）

它的时间轴（`#tl`，SVG 900 × 160）不是纯滑杆：

- **分段权重非线性轴**：`TL.segs` 给每段时间一个权重因子 `f`，`tlX()` 累加映射——**可以为「事件密集段放大、空白段压缩」定制**，正好适配我们 AD 46–67 里 AD 48–49 密、AD 57–59 疏的实际分布。
- **柱状堆叠密度图**：按 bin 统计各类型事件数堆叠着色；**筛选外的柱子降到 0.22 透明度**（`binIn`/`binOut` 双层），一眼看出「此刻在视野内 vs 被滤掉」。
- **空白段自动跳过**：Play 时用 `anyIn(a, z)` 判断该年段是否有任何事件，无则整段跨过去——不让播放在空档上「空转」。
- 年份滑杆参数：`win = 25`（25 年窗口）、`step = 5`、`ms = 55`（每 tick 55ms）、区间 -760 → 1480。

**对 geo-story 的落点：** 现在 `shared/timeline.js` 是纯滑杆 + 事件序列调度。可加**一条事件密度带**（沿时间轴按年段堆叠事件类型），让「哪几年密集、哪几年空白」本身成为信息。注意：我们的播放是**事件驱动**（推进到事件才停），与它的**年份扫描**模型不同——只取密度带与空白段跳过的算法，不改播放模型。

### 5.7 启发五：工程完备度（中 · 低成本）

| 项 | 它怎么做 | 我们的现状 |
|---|---|---|
| 深色模式 | `:root` + `@media (prefers-color-scheme: dark)` + `[data-theme="dark"]` 三套同值变量 | `template.html` 命中 `prefers-color-scheme` **0 次**，无深色模式 |
| 键盘可达 | 表格行 `tabIndex=0`、`keydown` Enter/Space 触发、`aria-pressed` / `aria-expanded` / `aria-hidden`、`:focus-visible` 描边 | 已有部分（`plan.md` §2.4 深链与键盘），需补 `aria` 与焦点样式 |
| 详情折叠 | `aria-expanded` + 单选展开（`state.open`） | 已有类似模式 |
| 数据导出 | CSV / JSON / XLSX 三格式 | 无；`data/*.json` 可直接导出 |
| 截图产物 | 18 张 3200 × 1800 PNG（地图 / 意大利 / 巴尔干 / 安纳托利亚与东方 / 胜负表 / 十四部分清单） | 无 |
| 语义化 HTML | `<dl>` 定义列表排详情、`role="img"`、`<title>` | — |

### 5.8 其他值得记的技术细节

- **局部高精度底图叠加**：`fine` 层用更高精度路径覆盖一个矩形区域（实测 `fineRect` = lon 10°–30.5°、lat 35.5°–42.5°，正是地中海核心区），粗底图之外再画一遍精细海岸线。对应我们 M4「罗马城郊」精度问题的一种轻量解法（不必整体换 DARE 底图）。
- **地图↔列表双向跳转**：`showOnMap(r)`（列表行 → 地图定位并选中）/ `showInList(r)`（地图详情 → 列表筛选到该条）。我们已有 `#p/` 与 `#e/` 深链，可对齐。
- **统计表行即筛选器**：胜负表每行点击 → 直接筛选下方战役列表（`filterList({ fc: ... })`），表格与图表互为入口。
- **系列化样式**：`index.html` 内注释明写 `/* series stylesheet (from the Greek Cities sites) */` —— 姊妹站共用同一套 CSS 变量体系；作者的「同系列专题站」模式（同一套视觉骨架 × 不同数据集）值得作为我们后续专题（如「罗马帝国疆界」「新约写作地点」）的模板。

### 5.9 本节行动项

1. **数据层（M3 一起做）**：`places.json` 加 `precision` 字段；`events.json` / `places.json` 的 `note` 拆为结构化 `doubt` + `precision`，取代单字段散文。
2. **页面层（新增两章）**：「我们如何取舍」+「未纳入的内容」——把 `plan.md` §4 的学术纪律从文档搬到读者可见处。
3. **标记层**：地点标记改为扇区复合点（面积=事件数，扇区=事件类型）。
4. **时间轴（M6 或 M3 顺带）**：叠加事件密度带 + 空白段跳过。
5. **工程层**：深色模式（CSS 变量三套）、`aria` 与焦点样式、JSON/CSV 导出。
6. **不做**：不换 Leaflet、不搬它的数据、不引入 Google Fonts 外链。
