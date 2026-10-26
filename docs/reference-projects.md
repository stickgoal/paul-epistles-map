# 同类开源项目与可复用数据源（2026-10-18 调研沉淀）

> **来源**：2026-10-18 用户问「网上有没有类似开源项目可以参考」，全网调研结论在此沉淀，供后续里程碑（M3 被捕受审 / M4 罗马尾声 / M6 动画）取用。
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
