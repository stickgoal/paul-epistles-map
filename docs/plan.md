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
| M2 | 第二、三次旅程 | ch2 / ch3 事件 + 书信事件（帖前后 / 林前后 / 罗马书） | 同上 | ✅ 完成（53 事件 / 3 章 / 17 地点，CDP 验收 A–J + M2-1…M2-8 全绿，零控制台错误） |
| M3 | 被捕受审 + 赴罗马 | ch4 / ch5：圣殿骚乱、四重审讯、马耳他船难 | 同上 | ✅ 完成（84 事件 / 5 章 / 30 地点，CDP 验收 A–J + M3-1…M3-10 全绿） |
| M4 | 富媒体与尾声 | ch6 罗马被囚与尾声 13 事件；39 张图本地 webp + 内联 + 署名溯源 | 媒体加载 / 回退 / 授权断言 | ✅ 完成（97 事件 / 6 章，M4-1…M4-8 全绿，零控制台错误） |
| M5 | 共享回灌（可选） | `paul-epistles-map` 改用 `shared/` 引擎 | 归档 `verify.mjs` 全绿 | 暂缓（归档优先，避免无收益改动） |
| M6 | 音效与增强动画 | GS.fx 总线订阅点落地：WebAudio 合成音效（零素材）/ 抵达外扩动画 | 不破坏现有 A–J 断言 | ✅ 完成（`shared/audio.js` + 开关持久化，M6-1…M6-4 全绿） |
| M7 | 构图重构：全屏地图 | 整屏交给地图，侧栏 / 时间轴 / 图例 / 图层开关 / 缩放全部改为浮在地图上的玻璃卡片；安全区（insets）随浮层自适应；**播放期镜头完全静止**；呼吸环放慢至 9s | D3 断言「参考点漂移 = 0、中心/缩放不变、路线仍在生长」；D6 周期 ≥ 8s；J/J2 全屏地图 + 抽屉 | ✅ 完成（D3 `maxRefDriftPx:0` / `moveend:0`；37 项断言全绿，零 JS 异常） |
| M8 | 标签密度分级 | 去掉常显的「N 个事件」计数；地点按事件数分三级（L1 ≥6 / L2 2–4 / L3 0–1），按 zoom 逐级展开；**占不到位就隐藏**（旧算法只能挪与缩短，任何标签必须显示）；悬停 / 选中 / 播放到达可临时提升；播放期地名收敛到当前章节；小视口 L1 再筛前 3 | M8-1 首屏 28→6、零重叠；M8-2 悬停恢复；M8-3 播放收敛；M8-4 暂停复原 | ✅ 完成（41 项断言全绿，零 JS 异常） |
| M9 | 构图收敛：地图最大化 + 时间轴贴底 + 锚定浮窗 | 侧栏**默认收起**（整块滑出屏幕，只在点「事件」时以覆盖层召回）；时间轴收进底部 16px 把手（「▲ AD 46 · 3/97」），鼠标移近热区 / 点击 / 键盘聚焦 / 播放中才展开；事件与地点详情从左侧面板改为**贴着地图锚点**的浮窗（上方优先、放不下翻到下方、左右夹在视口内、小三角始终指锚点）；首屏引导横幅退役，可发现性并入把手 + 首屏自动展开 2.6s | W-1 地图铺满且面板整块滑出；W-2 首屏自动展开→收起、把手读数；W-3 hover 展开 / 移开收起 / 真实点击播放；W-4 浮窗锚定（gap = 18px、`--ax` 在卡内、整卡在视口内）；W-5 平移后浮窗跟随（±2px）；W-6 关闭复位 | ✅ 完成（W-1…W-6 全绿，零 JS 异常） |
| M9.1 | 旅程重播停在结束状态 | 点图例里的某段旅程 → 15s 光点沿线行进 → 到位后光点在终点停 1.2s → 收走光点与拖尾，把路线本体定格成整段描完（`pin`）；定格态与当前年份无关，直到拖时间轴 / 播放 / 换旅程 / 取消聚焦 | R-1 真实点击「第二次传道旅程」（AD 46 起始年份早于其 AD 49 起点）：`pinned === ['j2']`、路线点数 == 路径点数、终点光点在末点、流光 `paused`、图例仍高亮；R-2 拖到 AD 56 后定格撤销、交还年份驱动 | ✅ 完成（R-1…R-2 全绿，零 JS 异常） |
| M9.2 | 视野放大 + 领域扩到全球 | ① **放大**：`STORY_FIT` 留白由「长边的 12% 同时加到两轴」改为**逐轴 3.5%**（下限 0.5°），纬度不再成为约束；`zoomSnap .5 → .25` 让 fit 停在 6.25 而不是被向下取整到 6.0 —— 1440×900 首屏内容占比 **53%×45% → 89%×76%**。② **加领域**：底图由「裁到 −25..68E / 8..62N 的 `med.json`」改为**全球 110m**（`scripts/make-basemap.mjs` → `assets/world.json`，176 features / 157KB），经纬网同步扩到全球 10° 一档，动态 `minZoom` 整套删除 | 三视口（1440×900 / 1680×1000 / 430×932）实测：首屏 `contentPct` 89×76 / 91×82 / 74×18，最小缩放下 `worldMiss = 0`（视野永不越出可绘制范围）；全量 verify 全绿 | ✅ 完成 |
| M9.3 | 旅程地名 + 底部旅程切换（2026-11-02 用户需求） | ① **旅程地名**：选中/播放某段旅程时，把该旅程的站点与本章事件地点**全部强制显示**（`routePins`），并切到紧凑形态（`body.route-focus` 下隐藏英文名与事件计数）——首屏只有 6 个 L1，一段旅程 9–13 个站点里大半是 L2/L3，不强制就「光点在走、名字不亮」。② **底部切换**：时间轴里加一排旅程 chip（全部 + 5 段），点一段即选中并重播 15s 描线，点已选中的再播一次，点「全部」取消聚焦；与右上图例共用 `state.route`，选中态双向同步。③ 顺带：**音效默认静音**（用户「关闭声音」） | S-1 chip 齐备且全在视口内；S-2 真实点击 j2 → `route==='j2'`、chip 与图例同步高亮、`.route-focus` 生效；S-3 该旅程 13 个地名**全部显示**、零越界零重叠；S-4 再点同一 chip = 重播；S-5 切 j5 后地名换成另一组；S-6「全部」回到 6 个 L1；S-7 窄屏 chip 横向滚动且可点 | ✅ 完成（S-1…S-7 全绿，零 JS 异常；窄屏 430×932 下 12 个旅程地名全部显示、零越界、不压缩放按钮） |
| M9.4 | 地名标签可点（2026-11-02 用户需求） | 用户：「点击名字也可以弹出窗口」。`.city-tip` 由 `pointer-events:none` 改为 `auto + cursor:pointer`，点击等同点地点核心（同一个 `openPlace`）；容器上做**捕获阶段**的事件委托（标签是 tooltip pane 里的独立元素，且 `placeLabels` 会反复改它的 innerHTML，逐元素挂监听会被冲掉）；悬停与圆点合并成一份计数（`hoverEnter/hoverLeave`），使「圆点 → 名字」这一跳不会让光标底下的名字消失、也不会漏 pin | T-1 真实点击「哥林多」标签 → `state==='place:corinth'`、卡片标题正确、标签仍可见；T-2 再点「以弗所」换卡；T-2b 点空白仍能关窗；T-3 从标签按住拖动 → 地图平移且**不**开卡；T-4 窄屏 tap 标签同样开卡且卡片在视口内 | ✅ 完成（T-1…T-4 全绿，零 JS 异常） |

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
>
> **播放抖动修复轮踩坑记录（2026-10-17 用户反馈「动画播放时抖得厉害」）**：
> 1. **⚠️ Leaflet 每帧 `setView(animate:false)` 会触发全场景 SVG 重投影**：setView 走 `_moveStart/_move/_moveEnd` 全事件链，其中 `moveend → L.Renderer._update → _updatePaths` 把**整个场景**（地中海底图 + 经纬网 + 全部路线）的每条 path 重新投影并重写 `d` 属性，`zoomend → _onZoomEnd` 再全量 `_project`。实测 12s 播放 **31,466 次 d 重写 / 250 次 moveend**。相机跟车（`camFollow`）必须走 `map._rawPanBy`（纯 pane transform，零事件零重投影），缩放改走 `setZoom/flyTo` 的 CSS 动画通道（`_animatingZoom` 期间 Leaflet 主动跳过路径重建）。修复后 **1,870 次 d 重写 / 4 次 moveend（-94% / -98%）**。
> 2. **`zoomSnap:.5` 会把逐帧插值的缩放假量化成瞬跳**：跟车时按 `t^1.6` 插值的 zoom 被 `_limitZoom` 对齐到 0.5 步长，2.6s 行程里只有 5.5→6.0→6.5 三个值，每次跳变就是一次全场景重建 + 可见的尺度抽搐。**离散动画优于逐帧插值**：起步 `setZoom` 拉远、到达 `flyTo` 推近，两个 0.25–0.55s 的 Leaflet 原生动画即可，视觉节奏不变。
> 3. **rig 只挪 pane，Leaflet 内部状态（`_lastCenter/_pixelOrigin`）会陈旧**：后续任何 `flyTo` 会从陈旧中心起跳。必须在每段行程结束（及 pause / 步进 / 打开详情前）用一次 `setView(containerPointToLatLng(视觉中心), zoom, {animate:false})` 对齐；`containerPointToLatLng` 读实时 pane 位置，与 rig 位移严格一致（实测残差 0px）。
> 4. **延迟启动的 seek 要防竞态**：缩放动画（250ms）与 rig 平移不能同窗进行（两套坐标系统互相打架），描线延迟 380ms 启动；窗口内若发生 暂停→重播，过时的 timeout 必须靠 `playToken` 令牌失效，否则两条 seek 同时跑。
> 5. **验收新增「事件风暴」回归**：D3 断言在 travel 窗口内统计 map `moveend` 次数（旧实现 ~150 次/窗口，新实现 ≤4），把「每帧 setView」这个反模式钉在回归里。性能探针：`scripts/measure-fps.mjs`（rAF 帧间隔 + setAttribute('d') 计数 + 地图事件计数 + longtask）。

> **M2 踩坑记录（2026-10-26，第二、三次旅程 + 41 条新事件）**：
> 1. **⚠️ 经文不能靠人眼转录**：`scripts/verses.mjs` 提取的 41 节经文，我手工写进 `events.json` 时就抄错了两处用字（「米推利**宁**」应为「米推利**尼**」、「过了**几天**」应为「过了**这几天**」），肉眼完全看不出。**修法：新增 `scripts/check-events.mjs`，把 events.json 的每条经文重新从双源提取并去标点逐字比对**，退出码 2 阻断。现在 56 条经文用字 56/56 一致、双源 56/56 一致。
> 2. **路线站点缺 `p` 字段 = 描线完全不动且不报错**：`route-engine` 的 `seek()` 靠 `stops[].p === ev.place` 找站点，M2 重写 j2/j3 时所有站点都漏了 `p`，结果是「事件照常弹卡，线却不动」。**新增 `scripts/check-routes.mjs` 静态校验事件↔路线映射与描线单调性。**
> 3. **⚠️ `seek()` 只按地点匹配会跨旅程串线**：M1 的「耶路撒冷会议」（ch1，place=jerusalem）同时命中了 j2/j3 的耶路撒冷站点，把第二、三次旅程的线在 AD 49 就一路画到耶路撒冷。**修法：routes.json 增加章节锚点 `ch`，`seek()` 只驱动本章所属旅程**（M2-3 断言看守：ch1 事件后 j2/j3 的 `hold` 必须仍为 null）。
> 4. **章节年代范围要覆盖其全部事件**：ch1 声明 AD 46–48，却含 AD 49 的耶路撒冷会议与 48–49 的《加拉太书》——M2-1 断言按「事件落在章节区间内」校验，直接把它照出来。已把 ch1 改为 46–49，并把 j1 路线延到耶路撒冷（徒 15:2-3 上耶路撒冷开会），使会议事件真正推动描线。
> 5. **事件数翻 4 倍会撑破窄屏布局**：时间轴圆点从 12 个（3 行）变 53 个（4 行），轨道 60→73px，窄屏事件列表被压到只剩 2 行。**修法：窄屏地图 37→34dvh、隐藏键盘提示行（触屏无键盘）、引导横幅内边距收紧**；J2 断言改测「引导横幅收起后的稳态 ≥3 行」。
> 6. **「初始视野」断言必须在未播放状态下测**：A4 断言原本排在全片播放之后，相机已停在最后一个事件（耶路撒冷）附近，于是 6 处地点被判「不在视口内」——假失败。**修法：A4 前先重新导航页面**。
> 7. **全片播放的验收超时随事件数线性增长**：12 事件按 12× 倍速跑完约 12s，53 事件同样倍速要 42s，原 80×400ms 的等待窗口必然超时，末尾断言全部失真。**修法：倍速提到 24×、等待窗口放宽到 150×400ms**。
> 8. **Commons API 会返回 429**：批量核验媒体授权时随机被限流。**修法：`scripts/commons.mjs` 加指数退避重试**；媒体一律「先按关键词检索 → 人工挑选 → 用 API 校验存在性与授权」，绝不凭记忆拼文件名。
> 9. **`.ev-dot` 不在 `.place` 里**：事件点挂在 Leaflet 图标容器上（与 `.place` 同级），用 `.place .ev-dot` 查询永远返回 0——M2-4 断言因此一次假失败。断言应按 `data-ev` 逐事件反查。
> 10. **路线站点顺序要按路加记述校正**：j3 原先在「以弗所 → 腓立比」之间插了一个「特罗亚」，与徒 20 的实际航路（以弗所 → 马其顿诸城 → 腓立比 → 哥林多 → 腓立比 → 特罗亚 → 米利都）不符。已按徒 20:1-6、20:13-16 重排，并补入帖撒罗尼迦与庇哩亚两站。

> **M4 踩坑记录（2026-10-30，ch6 + 富媒体本地化）**：
> 1. **事件数组的章节顺序会悄悄改变同年排序**：`gen-m3.mjs` 原先「先插 ch5 再插 ch4」（倒序插入以避开下标推移），结果 ch5 整块排在 ch4 之前；而 `SEQ` 的同年 tie-break 用的是数组下标，于是 AD 59 的「无可定罪」（ch4 末）被排到同年的「从凯撒利亚上船」之后，播放顺序与叙事顺序相反。**修法：生成器统一按 `CH_ORDER` 稳定重排，章内手工叙事顺序原样保留。**
> 2. **详情面板重复「图 像」标题 + 网格套网格**：`renderMedia()` 已返回带标题与 `.d-media` 容器的整块，`openEvent()` 又包了一层 —— 于是出现两个标题，且内层 `.d-media` 变成外层网格的一个格子（截图 g6 可见「图 像｜历 史 艺 术」并排）。**纪律：渲染函数返回整块时，调用方只拼接、不再包壳。**
> 3. **媒体断言不能只查 `<img>` 存在**：必须 `complete && naturalWidth > 0` —— 内联 data URI 也可能因编码错误解码失败，而 DOM 里照样有一个 `<img>`。
> 4. **内联后首帧约 4.7s，固定等待窗口会读到中间态**：97 事件 + 39 张内联图的单文件在无 GPU 的 headless 下 `DOMContentLoaded ≈ 4.4s`，时间轴轨道要到首帧才定型。原 4200ms 等待让 A3 读到「标记偏移 7px」、A5 读到「77 对假重叠」——**都是采样过早，不是产品缺陷**。修法：等待放宽到 6000ms，并把时间轴的等宽重试从 `setTimeout` 改成 `requestAnimationFrame`（rAF 先于绘制，轨道高度在第一帧就定型，用户看不到 60px → 114px 的跳动）。
> 5. **Leaflet `_size` 陈旧会让全部标记整体偏移**：时间轴轨道高度由簇模型异步写入，地图列高度随之变化；`invalidateSize()` 原先被放在 `locked` 判断之后，而 `locked` 会被首次 `settle()` 自己的 `fitBounds` 置真 ⇒ 此后尺寸永不修正（实测偏移 7px）。**修法：尺寸修正无条件执行，只把「视野重适配」交给 `locked`。**
> 6. **Commons 元数据的 `Artist` 有四种噪声**：重复（`Unknown author Unknown author`）、免责声明（`No machine-readable author provided...`）、工具尾巴（`Details on Google Art Project`）、角色后缀（`– artist (Flemish)`）。**署名必须由脚本清洗后回填，不手写、不直出。**

> **M6 踩坑记录（2026-10-30，音效与增强动画）**：
> 1. **`AudioContext` 必须在用户手势的调用栈里创建/恢复**：页面加载时直接 `new AudioContext()` 会被自动播放策略置为 `suspended`，后续 `play()` 静默无声却毫无报错。修法：`GS.audio.init()` 懒建（首次开关或首次播放点击时），`play()` 内先 `resume()` 再出声；M6-3 直接断言 `ctx.state === 'running'` 且确有振荡器在跑。
> 2. **抵达外扩动画不能碰 `transform`**：`.ev-dot` 上已有 `dotpop` 用 `transform: scale()` 做弹出，两个 animation 同时写 `transform` 会互相覆盖（表现为「有时弹、有时不弹」）。修法：`arriveRing` 只动 `box-shadow` 扩散，与 `dotpop` 正交。
> 3. **动画断言要读 `animationName`，不要看类名**：类名在动画被 `prefers-reduced-motion` 压成 `.01ms` 时依然存在，读类名等于无条件通过。M6-4 轮询 `.ev-dot.arrive` 并取 `getComputedStyle(...).animationName === 'arriveRing'` 才算数（配合 `Emulation.setEmulatedMedia` 解除 reduced-motion）。
> 4. **音效开关必须真实点击**：初版 M6-1 用 DOM `.click()` 一次就绿，但那样测不到「按钮被 `.tl-cap` 遮挡」这类真实缺陷 —— 与 §9 的教训同源。已改 `realClick()`；同时把断言判定搬到 Node 侧（页面只回传 `aria-pressed` / `localStorage` / `GS.audio.state` 快照），避免在模板字符串里再套 `${}`。

> **M7 踩坑记录（构图重构：全屏地图 + 浮动浮层 + 播放期镜头静止）**：
> 1. **⚠️ CSS 自定义属性在 Leaflet 容器子树内不重新解析**：`--tlh`（底部时间轴实测高度）写在 `:root` 上，`.mapctl` 的 `bottom: calc(var(--tlh) + 16px)` 却按**旧值**算——`var-probe` 探针显示 `:root` 已是 `261px`，而 `.mapctl` 的 computed `bottom` 仍按 `152px` 得出 `275px`。原因是 `#map` 是 Leaflet 容器（`overflow:hidden` + 自成层叠上下文），其子树内的自定义属性取值停留在首次计算。**修法：所有依赖 `--tlh` / `--panelw` 的浮层（`.chips` / `.mapctl` / `.legend` / `.now`）一律搬到 `#map` 之外的 `.app` 层。** 教训：`--x` 在 `position:absolute` 浮层里「看起来没生效」时，先查它是不是某个独立层叠上下文的后代。
> 2. **⚠️ Leaflet 角容器不包住浮动的子控件**：`.leaflet-control{float:left;clear:both}` 让 `.leaflet-top`/`.leaflet-bottom` 的高度恒为 0，于是把角容器 `bottom` 抬到时间轴之上后，控件仍从容器底边往下溢（实测 `bottom:269px` 而控件落在 `y=676`，正好压在时间轴上）。`margin-bottom` / flex 列两种尝试均无效。**修法：彻底放弃 `L.control.zoom` 与 `L.control.scale`，改用模板自带的 `.mapctl` 浮层按钮**（`map.zoomIn(1)` / `map.zoomOut(1)`）。同理，任何要参与布局的控件都不要交给 Leaflet 的角容器托管。
> 3. **`fitBounds` 的 padding 只影响缩放，不影响居中**：它按 padding 求 zoom，但中心仍是**容器中心**——全屏地图下故事内容被左侧面板与底部时间轴压住（罗马紧贴面板右缘、耶路撒冷被时间轴盖住）。`fit-probe` 实测「安全区中心 `[918,337]` vs 故事中心 `[918,383]`」相差 46px。**修法：自写 `fitStory()`**——先用 `getBoundsZoom(b, false, pad)` 求缩放，再把地理中心 `project` 后平移到安全区中心点再 `unproject`，最后 `flyTo/setView`。
> 4. **首次 fit 拿到的是「浮层还没长高」时的安全区**：`fits` 日志 `[56,16,175,412]` → `[56,16,190,412]` → `[56,16,283,412]`，前两次底部 inset 只有 175/190（真实值 283），故事整体偏下 46px。**修法：`needFit` 判定除「窗口尺寸变化」外，再加「inset 实质变化 > 16px 也重适配」**，并让 `setInsets` 在容器 `< 200×120` 时直接返回（避开布局中间态把 zoom 爆到 max）。
> 5. **⚠️ 验收断言「字符串当对象用」会静默失效**：D4 原写 `var d4after = await ev('JSON.stringify({...})')` —— `ev()` 返回**字符串**，`d4after.card` 恒为 `undefined`，于是 `ok` 变 `undefined`，而 `JSON.stringify` 会把 `undefined` 键**直接丢掉**（打印里只有 `after`、没有 `ok`），这条断言其实从未生效过。**纪律：`ev()` 的回传值必须先 `JSON.parse`；判定结果单独存一个 `d4ok` 布尔变量再打印**，不要指望「打印里没看到 false 就是通过」。
> 6. **`onPending` 后漏一个逗号 = 整页脚本不执行**：`onPending: function () { ... }` 紧跟 `onState:` 缺逗号，`SyntaxError: Unexpected identifier 'onState'` 让**整个 `<script>` 块**不解析——地图全空、控制台只有一条语法错。**纪律：改完 `template.html` 的 JS 立刻 `node build.mjs` + `node verify.mjs`，并看 `Runtime.exceptionThrown` 是否为 NONE。**
> 7. **呼吸环「抽搐」不是频率单一维度的问题**：原 5.6s 周期 + 快起步缓动（`cubic-bezier(.4,0,.6,1)` 前段斜率大）+ 双层错相 2.8s，观感是「一弹一弹」。**修法：周期拉到 9s、错相 4.5s、缓动改成两头慢（`.4,.05,.5,.95`），并让 62% 就收到 `opacity:0` 后停住**（后半程不动 = 留白，视觉上才是「吸气—屏息—呼出」）。同步放慢 `.fx-glow`（5.6s→9s）与路线光点脉冲（1.7s→2.4s），否则局部快慢不一会更显突兀。D6 断言周期 `>= 8` 且错相 = 周期/2。

> **M8 踩坑记录（标签密度分级：消隐 / 临时提升 / 播放收敛）**：
> 1. **密度的第一元凶不是点的数量，是「每个点都在喊话」**：首屏 28 个地名 + 22 个「N 个事件」计数 + 97 个事件点，全部 100% 不透明、无层级、无消隐。`「罗马 14 个事件」` 这类数字对读者几乎无用（数量本已由饼图面积与事件点个数编码），却让每个标签宽度近乎翻倍。**修法：计数从常显 tooltip 移除，改到 `openPlace` 的「地点 · N 个事件」与地点介绍窗里给出。**
> 2. **⚠️ 算法只有「挪」和「缩短」，没有「藏」**：`placeLabels` 试 9 方位 × 3 档形态降级，全冲突时取「重叠面积最小者」——等于**任何标签必须显示**。密集区 9 个方位被占满，于是必然糊成一片（首屏实测 16 对互压）。**修法：新增第三条路——占不到位就 `display:none` 隐藏**（`placed` 记 `null` 占位保持索引对齐，否则 `labelConflict` 的 `selfIdx` 全部错位）。L1 永不被隐藏：宁可轻微重叠，也不能首屏一个地名都没有。
> 3. **⚠️ 强制显示的放行位置错了 = 功能完全失效**：`forceSet` 只在 `items2` 的 `map()` 里读取，而**分级过滤发生在那之前**——被 tier 挡掉的标签根本进不了候选集，`force` 标记永远读不到。实测「悬停米利都，标签不出现」，而手动 `dispatchEvent('mouseenter')` 同样无效。**修法：在 filter 阶段就 `if (forceSet[cm.placeId]) return true` 放行。** 教训：一条数据要穿过「过滤 → 映射 → 排序 → 使用」四段管线时，任何一段漏读都等于该数据不存在；新增字段务必在**第一段**就参与判定。
> 4. **⚠️ Leaflet Tooltip 的 `opacity` 是内联样式**：`_initLayout` 里 `el.style.opacity = this.options.opacity`（默认 0.9），内联永远压过普通 CSS 规则——`body.playing .city-tip:not(.cur-ch){opacity:.18}` 明明 `matches: true`，`getComputedStyle` 仍是 `0.9`。**修法：`!important`**（并加 `.pinned` 排除 hover 临时提上来的标签，读者主动关注的地方不该是灰的）。诊断时先读 `el.getAttribute('style')`，别只看选择器优先级。
> 5. **播放期收敛不能「只在当前可见的 L1 里挑」**：ch1（第一次旅程）途经的安提阿 / 帕弗 / 路司得 / 特庇 大多是 L2/L3，首屏根本不显示；若只给「当前可见且属于本章」的标签上色，播放第一段时全图只有 1 个地名亮着、其余 5 个发灰，等于把地名删了。**修法：本章地点直接 `forceLabel` 强制显示**（不显示的非本章地点压到 `opacity .18` 而非 `display:none`，保留地理上下文）。M8-3 断言 `curCh >= 5`。
> 6. **「轻微重叠」和「完全放不下」要分开**：score 是「重叠面积(px²) + 越界面积×2」的加权和，只要 `> 0` 就判放不下，会让 z6.5 的安纳托利亚把 10 个 L2 砍到只剩 2 个——放大等于没放大。**修法：容差 `TOL`（L2/L3 90px²、L1 260px²）**。一个 12.5px 汉字的一角约 60–80px²，压住这点面积仍读得出来。
> 7. **小视口要再筛一层**：移动端地图可用区常只有 430×230（顶部胶囊 + 底部抽屉），6 个 L1 在小地图上照样糊。**修法：可用面积 < 300000px² 时，L1 按事件数只留前 3**（罗马 14 / 凯撒利亚 13 / 耶路撒冷 11）——它们同时覆盖西、东、南三个方位，缩放到哪都留得住参照点。

> **M9 踩坑记录（地图最大化 + 时间轴贴底 + 锚定浮窗）**：
> 1. **⚠️ 挂在隐藏容器里的引导 = 没有引导**：H-2 的「按时间轴播放这段旅程」横幅是 `.sidebar` 的流内子元素，而 M9 让侧栏默认收起 —— 横幅每次都滑在屏幕外，`classList` 里还留着 `visible` 假象（A8 当时只查 `hidden` 类，因此照样「通过」）。**修法：横幅退役，可发现性并入底部把手（`▲ AD 46 · 3/97` 实时读数）+ 首屏自动展开 2.6s**，并用 `sessionStorage` / 深链 / 「读者已动手」三条退出条件避免打扰。教训：**做「默认隐藏」时，必须逐个清点被隐藏容器里的所有交互入口**（章节 chip / 音效按钮 / 播放键 / 审计入口都在里面）。
> 2. **锚定浮窗要缓存尺寸，否则拖地图掉帧**：`map.on('move zoom')` 每帧调 `placeGeo()`，若在里面读 `offsetWidth/offsetHeight` 就会每帧强制同步布局（长距离拖拽直接掉到个位数帧率）。**修法：`measureGeo()` 单独缓存 `GEO.w/h`，`placeGeo()` 只写 `left/top`**；内容高度变化由 `ResizeObserver` 观察 `#gcBody` 触发重测。
> 3. **浮窗定位的三条规则要一起写**：上方优先（`pt.y - H - GAP`）→ 放不下翻到下方并给卡片加 `.below`（小三角 `rotate(225deg)` 挂到 `::before`）→ 左右夹在 `[PAD, vw-W-PAD]`；`--ax` 写「锚点相对卡片左边的距离」，小三角据此横移，锚点永远指得着。翻转判定用 `(pt.y - H - GAP) < PAD`，不要用「是否超出容器高度」——后者在卡片顶部被裁时仍然会判成「放得下」。
> 4. **326px 的卡片装不下侧栏那套长文本**：`precisionNote` 有 30–60 字，直接搬进浮窗会把卡片撑到半屏且挤掉事件列表。**修法：浮窗只给结论词（精确 / 近似 / 区域级），完整争议说明挂 `title` 悬挂**；同理浮窗内的事件行换成「年代 · 标题」的紧凑版 `.gc-ev`。
> 5. **`#detail` 是复用容器，关浮窗时必须一并复位**：审计页（长文本）仍走左侧面板，`closeEvent()` 早期版本只 `hideGeo()`，于是 `#detail` 永久盖在 `#list` 上（K2 的 `listRestored` 因此为 false）。**修法：`closeEvent()` 同时 `#detail.add('hidden')` + `#list.remove('hidden')` + 恢复 `#filterbar`。**
> 6. **滚动容器里的按钮，`getBoundingClientRect` 给的是「内容坐标」**：`.gc-act`（返回地点 / 放大查看 / 仅看此地）在 `#gcBody` 内，内容超长时它落在可见区之外，按 rect 中心点击会点到卡片下面的地图上 —— H 段「返回地点」就是这么静默失效的。**修法：验收的 `click()` 先 `scrollIntoView({block:'nearest'})` 再取坐标。**
> 7. **CDP 表达式返回不可序列化对象会直接报错**：`Runtime.evaluate` 求值 `GS_APP.map.panBy(...)`（返回 Leaflet 的 map）时响应里**没有 `result`**，`ev()` 拿到 `undefined` 后整个脚本崩在 `r.exceptionDetails` 上。**修法：表达式包一层 `return 1`，并让 `ev()` 对空响应返回 `ERR:CDP_NO_RESULT` 而不是抛错。**
> 8. **模板字符串里的正则字面量会被自己吃掉**：`/^▲\s*AD\s*\d+\s*\/\s*\d+$/` 写进反引号字符串时，`\/` 被折成 `/`，正则提前闭合，求值端得到 `SyntaxError: Unexpected token '.'`。**修法：这类断言改用字符串切分（`split('·')`）或 `new RegExp('...')` 构造，别在模板字符串里写含 `/` 的正则字面量。**
> 9. **首屏 z6 下地点核心互相压盖**：「点安提阿的中心」实际点在 11px 外的西流基上，浮窗打开的是另一个地点 —— 断言会错得极其隐蔽。**修法：验收选点前先做命中测试（`elementFromPoint(x,y).closest('.place')` 必须等于目标本身），并优先挑事件最多的地点**（顺带把浮窗里的「该地事件」行一起验掉）。
> 10. **「定格在结束状态」不能只写 `hold`**：`applyTime` 的状态由**年份**决定，选 j2（AD 49–52）时当前年份往往还是 AD 46，`y < j.from` 直接判成 `future`、`p = 0` —— 只写 `j.hold = 1` 会被年份判定盖掉，动画一结束整条线就不见（这正是「放完就没了」的根因）。**修法：独立标记 `j.pin`，在 `applyTime` 里优先于年份分支按 `p = 1` 渲染**；并在 `release()` / `cancelTravel()` 里清 pin（拖时间轴、换旅程、取消聚焦都要撤销，否则图上会挂着一条与当前年代矛盾的完整路线）。清 pin 后要 `j.sig = ''` 并重算一次，否则 DOM 还停在「整段描完」的样子。

> **M9.2 踩坑记录（视野放大 + 领域扩到全球）**：
> 1. **留白按「长边百分比」加到两个轴，短轴反而成了约束**：故事范围 23.7°×10.1°，旧实现取长边的 12%（2.84°）同时加到经纬两轴，纬度框被撑到 15.8° —— 1440×900 下 `boundsZoom` 由纬度决定，只到 z5.5，内容仅占屏 53%×45%。**修法：逐轴留白 3.5%**（下限 0.5°），纬度框收到 10.8°，宽度成为约束，内容占到 89%×76%。教训：**fit 的留白必须逐轴算，别拿「长边」一把尺子量两个方向**。
> 2. **`zoomSnap` 会把「刚好放得下」的 zoom 向下取整掉一整档**：算出的 6.2 被 `.5` 步长压成 6.0，内容从 89% 掉回 77%。**修法：`zoomSnap: .25`**（代价是滚轮缩放变成 4 档/级，用 `wheelPxPerZoomLevel: 140` 找回手感）。3.5% 这个值就是「刚好跨过 6.25 门槛」：再多 0.1° 就掉回 6.0。
> 3. **⚠️ 裁剪窗口治不了竖屏 —— 边界是躲不掉的**：第一版把底图窗口扩到 −25..68E / 8..62N（94 features），桌面 1440×900 完美，但 430×932 竖屏在 z4.25 的纬度跨度约 56°，比窗口的 54° 还大，屏幕上立刻出现**两条笔直的「陆地被切断」边**（南北各一条），像地图缺了一块。继续放大窗口没用：越窄越高的视口需要的纬度跨度越大，而墨卡托世界只有 ±85°。**修法：干脆不裁**——整份 110m 世界（去掉南极洲）只有 157KB，相对 3MB 成品可忽略，换来「任何视口、任何缩放都不会看到底图边界」。
> 4. **动态 `minZoom` 是伪需求，而且会引入随视口漂移的变量**：第二版按「刚好铺满领域窗口」算 `minZoom = ceil(log2(W×360/(256×93°))×4)/4`，结果 1440 得 4.5 仍会因**中心偏移**让东边露出 1.09°，430 得 3 却因竖直方向越界露得更多。**改成全球底图后整套删掉**，`minZoom` 回到固定 3 —— 少一个会随窗口尺寸变的量，就少一类「某些尺寸下才复现」的 bug。
> 5. **别用肉眼（更别用图片描述）判断海陆配色**：一张 z6.25 的首屏截图，地中海的白色与陆地的米白在缩略图上极易看反，一度让我以为「陆地/海洋画反了」。**修法：写 `scripts/diag-pix.mjs` 用 `latLngToContainerPoint` 定位 + 自解 PNG 取色**，实测海面 `rgb(232,235,229)`、陆地 `rgb(253,253,251)`，与样式表一致。**构图类结论一律用数字（contentPct / worldMiss / 取色）说话，截图只用于最终观感确认。**

> **M9.3 踩坑记录（旅程地名 + 底部旅程切换 + 音效默认静音）**：
> 1. **同一个 `state.route`，两处 UI 可以是两种动作**：图例是筛选器（再点一次＝取消，`.sel::after` 显示 ×，M8-5 就是这么断言的），底部 chip 是播放器（再点一次＝重播）。一开始为了「一致」把图例也改成重播，M8-5 的 `route-clear` 立刻红 —— **改交互语义前先看断言是怎么描述它的**；最后保留差异并在注释里写清「筛选器 vs 播放器」，比强行统一更诚实。
> 2. **`opacity:0` 藏不掉另一棵子树里的字**：背景地名（大马士革 / 大数）的 tooltip 挂在 Leaflet 的 tooltip pane，不是 `.ctx-icon` 的子元素，给图标加 `.route-off` 只能藏点。更坑的是**当场取 `getTooltip().getElement()` 恒为 null** —— 那一刻 marker 只进了 `placeLayer`，图层还没上屏，permanent tooltip 的容器要等上屏才创建。**修法：存 marker，用的时候现取（`ctxTipOf`），并在取到后补 `data-place` 供验收反查。**
> 3. **「强制显示」不等于「显示得下」**：一段旅程 9–13 个地名同时点亮，若还带着英文名与事件计数，密集区（安纳托利亚）必然互相压。**修法：`body.route-focus` 下用 CSS 收成「只留中文名」**，同一屏十几个名字等宽，map-core 的形态降级也不必再逐个大喘气。
> 4. **纯 bbox 会把短旅程推到不可用的缩放**：「被捕与受审」只有耶路撒冷与凯撒利亚两站（相距 0.7°），bbox + 0.5° 留白直接到 z9，屏幕上只剩两块色块。**修法：旅程视野至少 6° 见方**（`Math.max(halfSpan + .5, 3)`），z7.25 刚好带出海岸线与邻域。
> 5. **音效默认值也是产品决策**：用户一句「关闭声音」，正确处理不是让他每次手动点开关，而是**默认静音**（`localStorage` 里只有显式存过 `'on'` 才发声，旧值 `'off'` 与「从未设置」等价）。同时把 M6-2 改成先 `setEnabled(true)` 再测接口 —— 断言不该依赖默认值，否则改默认值会把接口测试一起拖下水。
> 6. **`@media (prefers-reduced-motion)` 只改 `transition-duration` 会把整页排版测量打成瞎子**（本轮最大的坑，查了一整轮）：那条规则写成 `*{transition-duration:.01ms!important}`，而 `transition-property` 的初始值就是 `all` —— 等于给**每个属性**都挂了一段 0.01ms 过渡。于是「改样式 → 立刻 `getBoundingClientRect()`」读到的永远是**过渡起点值**，要等任务结束、过渡跑完才变。标签避让是「换一个候选 → 立刻量 rect → 打分」的紧循环，实测同一个标签 73 次候选读取返回**同一个坐标**（`distinct:1`），整个算法在盲选：所有标签都退化成第一个候选（`right,[14,0]`），密集区叠字、贴右缘的「耶路撒冷」被切掉 8.5px。
>    **定位手法**：极简页 `10→80`（flush 正常）、本项目 `10→10`（异常）⇒ 是页内 CSS；再逐张禁用样式表 ⇒ 只剩一张；最后二分 439 条规则 ⇒ 命中最后那条 `@media (prefers-reduced-motion)`。**headless 默认就是 `reduce`**，所以这条规则在验收环境里一直生效，真机上开了「减少动态效果」的用户也会撞到同一个 bug。
>    **修法**：关动效要写 `transition:none!important`（把 `transition-property` 置空），而不是把 `duration` 改小。
> 7. **偏移量别绕 CSS 变量**：`applyTipDirection` 早期用 `--tx/--ty` + `calc()` 叠加 Leaflet 自带的 ±6px，看着更"干净"，但多一层自定义属性解析就多一层「什么时候生效」的不确定性。现在直接写内联 `margin-left/margin-top`（基础值表 `TIP_BASE` + 候选偏移），测量语义最直白。
> 8. **缩放按钮也是障碍物**：窄屏实测「耶路撒冷 / 凯撒利亚」各被右下角 `+` 按钮压掉 350~410px²，读起来像标签少了一截。把 `.mapctl` 加进 `lastObstacleSel` 后两处归零（`diag-ctl.mjs` 前后对比：`hits:[{jerusalem,352}]` → `[]`）。

> **M9.4 踩坑记录（地名标签可点）**：
> 1. **标签是「独立元素」，不是 marker 的子节点**：tooltip 挂在 Leaflet 的 tooltip pane 里，marker 的 click 收不到它；而且 `placeLabels` 会反复改它的 innerHTML，逐元素挂监听会被冲掉。**修法：在 `#map` 上做事件委托**（`e.target.closest('.city-tip[data-place]')`）。
> 2. **委托必须挂捕获阶段**：Leaflet 在 `#map` 上以**冒泡**方式监听 click（地图 click、点空白关窗）。同在容器上的冒泡监听之间，`stopPropagation` 是无效的（同节点不同阶段），结果是卡片刚被点开就被这次点击自己关掉。捕获阶段先拿到事件再 `stopPropagation`，Leaflet 就收不到。
> 3. **拖动 ≠ 点击**：Leaflet 的「拖动过就吞掉 click」只作用于它自己派发的 map 事件，捕获阶段的原生监听绕过了它 —— 实测从「哥林多」名字上按住拖 120px，地图平移了、卡片也弹出来了。**修法：自己记按下点，按下与抬起位移 > 6px 判为拖动**。mousedown 不拦，否则地图就拖不动了。
> 4. **悬停要合并成一份计数**：圆点和名字是两个元素，各管各的 pin 时，「圆点 → 名字」这一跳 leave 先到，会把 pin 撤掉并立刻重排，光标底下的名字当场消失；而简单跳过 leave，那份 pin 又永远没人还（标签从此常显）。**修法：`hoverEnter/hoverLeave` 计数，归零才撤；撤销后延后一拍再决定要不要重排**（等一拍就能看到计数已经回到 1）。另外只有「本来被分级隐去、靠悬停才亮出来」的那次才需要重排（`hoverRestore`），否则鼠标扫过一串名字，每个都触发一次 28 标签 × 9 方位 × 3 形态的全量重算，肉眼可见发涩。


## 1. 架构

### 1.1 目录结构

```
geo-story/
├── template.html        # 页面结构 + CSS + UI 编排（浮动面板 / 详情 / 播放控件）
├── shared/              # 与 paul-epistles-map 共用的引擎（构建期内联，产物仍是单文件）
│   ├── fx.js            #   事件总线（音效 / 增强动画订阅点，M6 消费）
│   ├── audio.js         #   WebAudio 合成音效（零素材）：音色表 / 懒初始化 / 开关持久化
│   ├── map-core.js      #   地图基底：GeoJSON 底图 / 经纬网 / 安全区 fitStory / 点亮 / 涟漪 / 标签避位
│   ├── route-engine.js  #   平滑路径 / 累计里程 / 按年代截取点亮 / 路线光点 / 旅程重播
│   └── timeline.js      #   时间轴控件（拖拽 / 键盘 / 圆点 / 色带）+ 播放调度 + 事件序列播放
├── data/                # 纯数据（改内容只动这里）
│   ├── chapters.json    #   六章元数据
│   ├── places.json      #   地点库：坐标 / 古今名 / 现代归属 / 备注
│   ├── routes.json      #   四段旅程路径点（命名途经点）
│   ├── events.json      #   事件库（核心资产，见 §1.4）
│   └── media-audit.json #   逐图授权留档（文件 / 授权 / 作者 / 体积 / 溯源页）
├── assets/
│   ├── leaflet.js / .css / world.json / countries-110m.json / topojson-client.min.js
│   └── media/           #   本地图片（webp，≤110KB）；构建期内联为 data URI
├── build.mjs            # 构建：template + shared + data + assets → geo-story.html（媒体内联）
├── cdp-shot.mjs         # CDP 截图 / 求值工具（从归档项目原样搬入）
├── verify.mjs           # CDP 验收脚本（A–J + M2-1…M2-8 + M3-1…M3-10 + M4-1…M4-8 + M6-1…M6-4）
├── scripts/             # 数据管线（见下）
│   ├── verses.mjs       #   双源经文提取与校对（OpenCC 繁→简 + 逐字比对）
│   ├── gen-ch6.mjs      #   ch6 事件生成器（经文程序化注入，双源不一致即中止）
│   ├── check-events.mjs #   events.json 经文回验（用字逐字一致 + 双源一致）
│   ├── check-routes.mjs #   事件↔路线映射与描线单调性校验
│   ├── commons.mjs      #   Wikimedia Commons 检索与授权核验（429 退避）
│   ├── localize-media.mjs # 媒体本地化：授权核验 → 下载 → webp → 回填 src/credit
│   ├── make-basemap.mjs #   底图生成：Natural Earth 110m TopoJSON → assets/world.json（M9.2）
│   ├── diag-boot.mjs    #   启动时序探针（boot 时刻 / 轨道定型 / 首帧耗时）
│   ├── diag-offset.mjs  #   标记/事件点偏移探针（对照 _size 陈旧缺陷）
│   ├── diag-tl.mjs      #   时间轴轨道几何探针（圆点尺寸 / 行数 / 簇排布）
│   ├── diag-layout.mjs  #   构图探针（浮层矩形 / --tlh 取值 / fitStory 入参 / 压叠面积 / 安全区）
│   └── run-cdp.ps1      #   验收 runner：只关闭自己启动的 headless Chrome
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
| `@@GEOJSON@@` | `assets/world.json` | 全球 110m 底图（`scripts/make-basemap.mjs` 生成；M9.2 起不再裁剪） |
| `@@GS_MAPCORE@@` | `shared/map-core.js` | 共享引擎 |
| `@@GS_ROUTES@@` | `shared/route-engine.js` | 共享引擎 |
| `@@GS_TIMELINE@@` | `shared/timeline.js` | 共享引擎 |
| `@@GS_FX@@` | `shared/fx.js` | 共享引擎（事件总线） |
| `@@GS_AUDIO@@` | `shared/audio.js` | 共享引擎（合成音效，订阅 fx 总线） |
| `@@DATA_CHAPTERS@@` / `@@DATA_PLACES@@` / `@@DATA_ROUTES@@` / `@@DATA_EVENTS@@` | `data/*.json` | 数据；**`events.json` 在构建期把 `media[].src`（`assets/media/*.webp`）内联为 data URI**，文件缺失时置空 → 前端回退 Commons 溯源链接 |

```bash
node build.mjs   # → geo-story.html（Leaflet + 数据 + 引擎 + 图片全内联，离线可用）
```

> **为什么图片也内联**：项目的硬约束是「单文件、双击即用」。图片若留在 `assets/media/`，
> 交付时漏拷目录就整片空白。39 张 720px webp 内联后 HTML 约 3.1MB（图片 1.86MB → base64 2.4MB），
> 代价是首帧变慢（无 GPU 的 headless 约 4.4s，普通桌面浏览器约 1s），换来的是真正可离线单发。
> 压图档位见 `scripts/localize-media.mjs` 的 `--recompress`（720px / ≤110KB）。

### 1.3 模块职责

| 模块 | 职责 | 来源 |
|---|---|---|
| `shared/map-core.js` | 地图初始化、底图 / 经纬网 / 控件；`flyToCity` / `litCity` / `ripple` / 城市标签自动避位 | 自 `template.html` 平移抽取 |
| `shared/route-engine.js` | `smoothPath` 平滑、累计里程、`applyTime` 按年代逐段点亮、路线光点、旅程重播动画 | 自 `template.html` 平移抽取 |
| `shared/timeline.js` | 时间轴渲染 / 拖拽 / 键盘 / 播放循环；**新增**：事件序列调度（光标逐事件推进 + 到达回调 + dwell 停留） | 自 `template.html` 平移 + 扩展 |
| `shared/fx.js` | 事件总线 `GS.fx.on/off/emit`；M6 音效与增强动画的订阅点 | 新写 |
| `shared/audio.js` | WebAudio 合成音效：音色表 `CUES`、`bind(fx)` 订阅 `event:arrive` / `chapter:enter` / `play:*` / `event:open`；`init()` 懒建 `AudioContext`（遵守自动播放策略）、`toggle()` 写 localStorage | 新写 |
| `data/places.json` | 地点：`{ id, cn, en, modern, ll, note, ctx }` | 新写（整合归档 `CITIES` + `CTX` + 新增） |
| `data/routes.json` | 旅程：`{ id, ch, name, from, to, color, stops:[{cn,ll,p?}...], desc }`；`ch` 为章节锚点（事件只驱动本章旅程），`stops[].p` 指向 places.json 的地点 id（缺 `p` = 不可被事件命中的途经点） | 自归档 `JOURNEYS` 扩展 |
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
- **播放期镜头完全静止（M7 修订）**：播放只在开播前做一次 `resetView`（若当前视野已覆盖整个故事则跳过），此后**逐帧跟车平移全部移除**——不 `setView`、不 `_rawPanBy`、不 `flyTo`，只有路线在生长。稳定感优先于「镜头跟着光点跑」。交互路径（点击事件标记 / 时间轴圆点 / 「在地图上定位」）仍会推近到 `CAM.zEvent = 6.5`。
- 拖动时间轴 / 打开详情 / 点击章节 → 自动暂停
- **旅程重播（点图例里的某段旅程）停在结束状态**（2026-11-02 用户需求）：15s 光点沿线行进 + 拖尾 → 到位后光点在终点停 1.2s → 收走光点与拖尾，把**路线本体定格成整段描完**（`pinEnd`：`j.pin = 1`，`applyTime` 无视年份按 `p = 1` 渲染，流光暂停，终点保留一枚光点）。定格态一直保留，直到读者拖时间轴 / 播放 / 换旅程 / 取消聚焦（`release()` / `cancelTravel()` 清 pin）。

### 2.2 控件与构图（M7 起「全屏地图 + 浮动浮层」，M9 起「浮层默认让位」）

整屏交给地图（`#map{position:absolute;inset:0}`），所有数据面做成浮在地图上的半透明玻璃卡片（`background:color-mix(in srgb,var(--panel) 86%,transparent)` + `backdrop-filter:blur(20px)`）：

| 浮层 | 位置 | 说明 |
|---|---|---|
| 事件面板 `.sidebar` | 左 14 / 上 14 / 下 14，宽 `--sb:384px`；**M9 起默认收起** | 章节、事件列表、判断规则页；收起态整块滑出屏幕左侧（`translateX(calc(-100% - 24px))`），召回时是**覆盖层**（不挤压地图、不触发 refit）。`#panelToggle` 收起后停在地图左上角显示「事件」 |
| 时间轴 `.tl` | 左 14 / 右 14 / 底 0；**M9 起贴底隐藏** | 平时只露 16px 把手（`.tl-handle`，读数「▲ AD 46 · 3/97」）；底部 40px 热区 `.tl-hot` 承接 hover / 点击，`body.tl-open` 展开。展开后热区 `pointer-events:none` 让位给轨道。**M9.3 起顶部多一排旅程 chip**（`.tl-j`：全部 + 五段旅程），点一段即选中并重播，见下 |
| 旅程 chip `.tl-j` | 时间轴顶部，单行横向滚动 | 「全部 + 第一次旅程 / 第二次旅程 / 第三次旅程 / 被捕与受审 / 赴罗马航程」；选中态 `aria-pressed="true"`（深底白字）。与右上图例共用 `state.route`：图例是**筛选器**（再点一次取消，`.sel::after` 是 ×），chip 是**播放器**（再点一次重播，title 写「点击播放」） |
| 地点 / 事件浮窗 `.geo-card` | **贴着地图锚点**（JS 写 `left/top`，随 `move/zoom` 重算） | 宽 326，上方优先 → 放不下翻到下方（`.below`）→ 左右夹在视口内；`--ax` 决定小三角横移位置 |
| 图层开关 `.chips` | 右上（图例之上） | 路线 / 事件 / 标签 |
| 图例 `.legend` | 右上 `top:58px`，宽 ≤ 248 | 事件类型色板 |
| 缩放 `.mapctl` | 右下 14；时间轴展开时 `bottom:calc(var(--tlh) + 14px)` | **自建按钮**，不用 `L.control.zoom`（见 M7 踩坑 2） |
| 事件卡 `.now` | 底部居中，浮在时间轴之上 | 当前事件的类型 / 标题 / 地点 |

- **安全区（insets）**：`map-core` 维护 `{t,r,b,l}` 像素值，表示「被浮层遮住的区域」。M9 起侧栏与时间轴都不再常驻，`syncInsets()` 只留呼吸位（`{t:54,r:18,b:22,l:18}`，顶部 54 = 左上「事件」胶囊 + 呼吸），`ResizeObserver` 只观察 `.tl`（它决定 `--tlh`）。`fitStory()` 用它同时算缩放与**居中**（M7 踩坑 3）。容器小于 200×120 时直接返回，避免布局中间态。
- **窄屏（≤960px）**：地图仍整屏；`.sidebar` 变底部抽屉（`height:44dvh;max-height:520px`）且**默认收起**，`#panelToggle` 变「事件」胶囊；时间轴同样是贴底隐藏 + 点击热区展开（触屏没有 hover，`.tl-hot` 的 click 兜底）。
- **初始视野（M9.2）**：`STORY_FIT` 由「有事件的地点」自动聚合（不写死地中海），**逐轴留白 3.5%**（下限 0.5°）；配合 `zoomSnap: .25`，1440×900 落在 z6.25、内容占屏 89%×76%（旧值 53%×45%）。底图是全球 110m，所以无论视口多高多窄、缩到多小，都不会看到「陆地被直线切断」的边界（见 M9.2 踩坑 3–4）。
- **地名标签也是入口（M9.4）**：`.city-tip` 从 `pointer-events:none` 改为 `auto`（`cursor:pointer`），点击名字等同点地点核心 —— 同一个 `openPlace`。监听是 `#map` 上的**捕获阶段**委托（标签在 tooltip pane 里、且 innerHTML 会被反复重写）；按下与抬起位移 > 6px 判为拖动、不开窗。悬停「圆点或它的名字」共用一份 pin 计数，见 M9.4 踩坑 1–4。

### 2.3 详情：地图锚定浮窗（M9 起；审计页仍走左侧面板）

- **事件浮窗**：类型 · 章节 → 标题 → 英文名 → 年代 / 地点 / 今天所在 / 场所说明 → 缘起 → 经文（多节，和合本）→ 媒体（照片 / 画作网格，本地缺失显示「在线查看」）→ 争议标注 → 「放大查看」（不再自动 `flyTo`：浮窗已贴着该点，推近反而把它挤出视野）
- **地点浮窗**：地点 · N 个事件 → 名称 → 今天所在 / 定位精度（**只给结论词，完整争议说明挂 `title`**）/ 场所说明 → 缘起 → 「该地事件」紧凑行（点击进事件浮窗，可一层返回）→ 「放大查看」/「仅看此地」
- **审计页**（判断规则与排除项）文本长，仍走左侧面板：打开时 `showPanel()` 召回，关闭时 `closeEvent()` 一并复位 `#detail` / `#list`。

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

### 3.1 动效节奏（M7 收敛）

「呼吸」类循环动画统一走**长周期 + 两头慢 + 后半程留白**，避免读成抽搐：

| 元素 | 周期 | 说明 |
|---|---|---|
| 地点呼吸环 `.place .ring` | 9s（`.b2` 错相 4.5s） | `cubic-bezier(.4,.05,.5,.95)`；62% 收到 `opacity:0` 后停住不缩放 |
| 抵达辉光 `.fx-glow` | 9s | 与呼吸环同频，避免局部快慢不一 |
| 路线光点 `.rh::after` | 2.4s | 描线头的高频小脉冲（位移型，不参与「呼吸」语义） |

D6 断言看守：周期 `>= 8s`、双环错相 = 周期 / 2。

## 4. 数据规范（学术纪律）

1. **年代推定**：所有事件年代采用学界主流推定；争议处必须写 `note`（参照归档项目的标注粒度）
2. **经文**：统一和合本；引用前须对照纸质 / 权威电子版校对
3. **媒体版权**：仅使用 CC 许可或公有领域作品；`credit` 与 `url` 必填；本地文件用 webp，单张 ≤ 300KB
4. **新增事件流程**：只改 `data/events.json`（+ `places.json` / `routes.json`）→ `node build.mjs` → 静态回验（`node scripts/check-events.mjs` + `node scripts/check-routes.mjs`）→ CDP 验收（`scripts/run-cdp.ps1 verify.mjs`）
5. **经文必须脚本回验，不靠人眼**：落库经文重新从双源提取、去标点逐字比对（`scripts/check-events.mjs`）；标点差异（给直接引语加「」、句末改句号）允许，用字差异一律阻断
6. **已落地（源自 [reference-projects.md §5](reference-projects.md#5-专题深拆iosiflazaridis--battles-of-the-romans2026-10-27)）**：① `places.json` 增 `precision`（`known` / `approximate`，6 处近似 + `precisionNote` 争议溯源）；② 页面增「判断规则 / 排除项」页（`data/audit.json`），把「我们如何取舍」「未纳入的内容」做成读者可见的两栏。`note` 仍未拆成结构化 `doubt`，保持散文（当前粒度够用）。
7. **媒体本地化（M4）**：媒体只走 `scripts/localize-media.mjs`——Commons API 核验授权（白名单 PD / CC0 / CC BY / CC BY-SA）→ 下载 → 压成 webp（≤110KB）→ 用 `extmetadata` 回填 `credit`。产物 `data/media-audit.json` 逐图留档，可审计。**禁止手写 credit 或凭记忆拼文件名。**

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

## 5.1 M2 事件清单（第二、三次传道旅程 · 徒 15:36–21:17 + 书信）

> 共 41 条事件，全部经文用字由 `scripts/check-events.mjs` 对双源回验（56/56 一致）。
> 年代取主流推定；史料有争议处在事件 `note` 中标注（分道扬镳的起因、加拉泰/弗吕家路线、三个月的季节、书信写作地点等）。

### ch2 — 第二次传道旅程

| # | id | 年代 | 事件 | 地点 | 类型 | 关键经文 |
|---|---|---|---|---|---|---|
| 01 | ch2-split | AD 49 | 分道扬镳 | 安提阿 | arrival | 使徒行传 15:39-40 |
| 02 | ch2-timothy | AD 49–50 | 提摩太加入 | 路司得 | arrival | 使徒行传 16:1-3 |
| 03 | ch2-troas-vision | AD 50 | 异象召往马其顿 | 特罗亚 | arrival | 使徒行传 16:8-10 |
| 04 | ch2-lydia | AD 50 | 吕底亚信主 | 腓立比 | preach | 使徒行传 16:14-15 |
| 05 | ch2-prison | AD 50 | 被拉到公堂 | 腓立比 | persecution | 使徒行传 16:19-21 |
| 06 | ch2-quake | AD 50 | 监牢地震 | 腓立比 | miracle | 使徒行传 16:25-26 |
| 07 | ch2-jailer | AD 50 | 禁卒一家受洗 | 腓立比 | preach | 使徒行传 16:30-34 |
| 08 | ch2-thessalonica | AD 50 | 三个安息日讲论 | 帖撒罗尼迦 | preach | 使徒行传 17:1-3 |
| 09 | ch2-berea | AD 51 | 天天考查圣经 | 庇哩亚 | preach | 使徒行传 17:10-12 |
| 10 | ch2-athens-god | AD 51 | 未识之神的坛 | 雅典 | preach | 使徒行传 17:22-23 |
| 11 | ch2-athens-living | AD 51 | 我们也是他所生的 | 雅典 | preach | 使徒行传 17:28 |
| 12 | ch2-corinth-titus | AD 51 | 投奔亚居拉与百基拉 | 哥林多 | arrival | 使徒行传 18:1-4 |
| 13 | ch2-corinth-year | AD 51–52 | 一年零六个月 | 哥林多 | persecution | 使徒行传 18:11-12 |
| 14 | ch2-1th | AD 51 | 写《帖撒罗尼迦前书》 | 哥林多 | letter | 帖撒罗尼迦前书 1:5 |
| 15 | ch2-corinth-worship | AD 52 | 会堂门前被殴 | 哥林多 | persecution | 使徒行传 18:17 |
| 16 | ch2-2th | AD 52 | 写《帖撒罗尼迦后书》 | 哥林多 | letter | 帖撒罗尼迦后书 2:15 |
| 17 | ch2-depart-ephesus | AD 52 | 辞别以弗所 | 以弗所 | arrival | 使徒行传 18:21 |
| 18 | ch2-caesarea-land | AD 52 | 在凯撒利亚下船 | 凯撒利亚 | arrival | 使徒行传 18:22 |

### ch3 — 第三次传道旅程

| # | id | 年代 | 事件 | 地点 | 类型 | 关键经文 |
|---|---|---|---|---|---|---|
| 19 | ch3-galatia | AD 52 | 挨次坚固众门徒 | 以哥念 | arrival | 使徒行传 18:23 |
| 20 | ch3-twelve | AD 53 | 十二个门徒 | 以弗所 | preach | 使徒行传 19:1-4 |
| 21 | ch3-synagogue | AD 53–54 | 推喇奴的学房 | 以弗所 | preach | 使徒行传 19:8-10 |
| 22 | ch3-miracles | AD 54 | 手巾与围裙 | 以弗所 | miracle | 使徒行传 19:11-12 |
| 23 | ch3-exorcists | AD 54 | 士基瓦的七个儿子 | 以弗所 | miracle | 使徒行传 19:13-15 |
| 24 | ch3-burn-books | AD 54 | 焚书 | 以弗所 | preach | 使徒行传 19:17-20 |
| 25 | ch3-silversmith | AD 55 | 银匠底米丢 | 以弗所 | persecution | 使徒行传 19:23-26 |
| 26 | ch3-riot | AD 55 | 戏园骚乱 | 以弗所 | persecution | 使徒行传 19:29-31 |
| 27 | ch3-1co | AD 54 | 写《哥林多前书》 | 以弗所 | letter | 哥林多前书 16:8 |
| 28 | ch3-macedonia | AD 56 | 走遍马其顿 | 帖撒罗尼迦 | arrival | 使徒行传 20:1-2 |
| 29 | ch3-winter | AD 56–57 | 在希腊住三个月 | 哥林多 | preach | 使徒行传 20:3 |
| 30 | ch3-rom | AD 56–57 | 写《罗马书》 | 哥林多 | letter | 罗马书 1:16 |
| 31 | ch3-2co | AD 56 | 写《哥林多后书》 | 腓立比 | letter | 哥林多后书 7:5 |
| 32 | ch3-philippi-sail | AD 57 | 从腓立比开船 | 腓立比 | arrival | 使徒行传 20:6 |
| 33 | ch3-eutychus | AD 57 | 犹推古坠落 | 特罗亚 | miracle | 使徒行传 20:9-12 |
| 34 | ch3-miletus | AD 57 | 赶到米利都 | 米利都 | arrival | 使徒行传 20:13-16 |
| 35 | ch3-miletus-sorrow | AD 57 | 请以弗所长老来 | 米利都 | arrival | 使徒行传 20:17-18 |
| 36 | ch3-miletus-prayer | AD 57 | 众人在海边痛哭 | 米利都 | arrival | 使徒行传 20:36-38 |
| 37 | ch3-tyre | AD 57 | 推罗上岸被劝阻 | 推罗 | arrival | 使徒行传 21:1-6 |
| 38 | ch3-caesarea-daughters | AD 57 | 腓利四个女儿 | 凯撒利亚 | arrival | 使徒行传 21:8-9 |
| 39 | ch3-agabus | AD 57 | 亚迦布捆腰的预言 | 凯撒利亚 | trial | 使徒行传 21:10-11 |
| 40 | ch3-weeping | AD 57 | 众人痛哭 | 凯撒利亚 | trial | 使徒行传 21:13-14 |
| 41 | ch3-jerusalem | AD 57 | 上耶路撒冷 | 耶路撒冷 | arrival | 使徒行传 21:15-17 |

## 5.2 M4 事件清单（罗马被囚与尾声 · 徒 28:17-31 + 监狱书信 + 传统）

> 共 13 条事件，经文 18 条全部由 `scripts/gen-ch6.mjs` 程序化注入（双源一致才落库）。
> 行传止于「两年 / 并没有人禁止」，此后的事件只能靠书信与传统重建，故凡行传之外的
> 内容（获释、罗马大火、殉道）一律在 `note` 中标明出处与争议，不写成定论。

| # | id | 年代 | 事件 | 地点 | 类型 | 关键经文 |
|---|---|---|---|---|---|---|
| 01 | ch6-leaders | AD 60 | 请犹太首领来 | 罗马 | preach | 徒 28:17、28:21-22 |
| 02 | ch6-testimony | AD 60 | 从早到晚讲论 | 罗马 | preach | 徒 28:23-24 |
| 03 | ch6-unbelief | AD 60 | 油蒙了心 | 罗马 | preach | 徒 28:25-27、28:28 |
| 04 | ch6-two-years | AD 60–62 | 在自己所租的房子里 | 罗马 | preach | 徒 28:30-31 |
| 05 | ch6-ephesians | AD 60–62 | 写《以弗所书》 | 罗马 | letter | 弗 6:19-20 |
| 06 | ch6-colossians | AD 60–62 | 写《歌罗西书》 | 罗马 | letter | 西 4:3 |
| 07 | ch6-philemon | AD 60–62 | 写《腓利门书》 | 罗马 | letter | 门 1:15-16 |
| 08 | ch6-philippians | AD 61–62 | 写《腓立比书》 | 罗马 | letter | 腓 1:12-14 |
| 09 | ch6-released | AD 62 | 获释（传统） | 罗马 | arrival | 门 1:22 |
| 10 | ch6-pastorals | AD 63–65 | 写《提摩太前书》《提多书》（传统） | 罗马 | letter | 提前 1:15-16、多 1:5 |
| 11 | ch6-fire | AD 64 | 罗马大火与尼禄的逼迫 | 罗马 | persecution | 彼前 4:12-14（旁证） |
| 12 | ch6-2tim | AD 66–67 | 写《提摩太后书》 | 罗马 | letter | 提后 1:8、2:9、4:6-8 |
| 13 | ch6-martyrdom | AD 67 | 殉道（传统） | 罗马 | persecution | 提后 4:17-18 |

> **ch6 不设旅程**：`chapters.json` 的 `ch6` 声明 `noRoute: true`——尾声没有地理位移，
> 事件只驱动相机与高亮。`check-routes.mjs` 据此把「描线不动」记为说明而非警告，
> `verify.mjs` 的 M3-6 / M4-6 也据此跳过该章。

## 6. 章节规划（后续里程碑的事件源）

| 章节 | 名称 | 年代 | 经文范围 | 里程碑 |
|---|---|---|---|---|
| ch1 | 第一次传道旅程 | AD 46–49 | 徒 13–15 | M1 |
| ch2 | 第二次传道旅程 | AD 49–52 | 徒 15:36–18:22 | M2 |
| ch3 | 第三次传道旅程 | AD 52–57 | 徒 18:23–21:17 | M2 |
| ch4 | 被捕与受审 | AD 57–59 | 徒 21–26 | M3 |
| ch5 | 赴罗马航程 | AD 59–60 | 徒 27–28:16 | M3 |
| ch6 | 罗马被囚与尾声 | AD 60–67 | 徒 28:17-31 + 书信 + 传统 | M4 |

## 7. 验证方案

- **工具**：`cdp-shot.mjs`（原样搬入）+ 新写 `verify.mjs`；headless Chrome 真实时间驱动（冻结 CSS 过渡的 `--virtual-time-budget` 截图模式有伪影，禁用）
- **断言不变量（反漂移）**：事件总数 == 数据声明数；播放至终态时最后一个事件详情可打开；点击事件标记后详情含经文引用；媒体本地缺失时显示回退链接；控制台零错误
- **M1 十项**：A 启动态 / B 点击详情 / C 返回列表 / D 播放 / E 步进 / F 深链 / G 章节筛选 / H 地点筛选 / I 重置 / J 移动端 + 截图 f1–f5
- **M7 修订的三条**：
  - **D3（镜头静止）**：取固定参考点（耶路撒冷 31.78,35.23）每 200ms 采样其容器像素坐标，断言 `maxRefDriftPx < 0.01`、`centerMoved === false`、`zoomChanged === false`、travel 窗口内 `moveend <= 2`，**同时** `routeGrew === true`（防止「靠把描线也停掉」来假通过）。
  - **D6（呼吸节奏）**：`animationName === 'breathe'`（不读类名）、`duration >= 8s`、双环延迟 = duration/2。
  - **J / J2（窄屏构图）**：J 断言地图 `fullBleed`（= 视口尺寸）、抽屉默认收起、`chips` 在视口内、抽屉不压播放按钮；J2 真实点击 `#panelToggle` 拉起抽屉后断言「可用高度 / 行高 ≥ 3 行」且地图仍有 180px 以上可见。
- **M8 新增的四条（标签密度）**：
  - **M8-1（分级消隐）**：桌面 1680×1000 首屏断言 `labelStats()` 为 `visible === 6 / hidden === 22 / total === 28`，且**可见标签两两重叠面积 = 0**（遍历真实 `getBoundingClientRect()`，不靠类名猜）。
  - **M8-2（临时提升）**：用**真实鼠标移动**（`Input.dispatchMouseEvent`）悬停一个首屏被隐去的 L2 地点（米利都），断言其标签 `display !== 'none'`；移开后再次隐藏。不能派发合成 `MouseEvent` —— 那样测不到「核心是否真的在指针命中层里」（`.place-icon` 是 `pointer-events:none`，只有 `.core` 是 `auto`）。
  - **M8-3（播放收敛）**：播放 3s 后断言 `body.playing` 存在、本章地名 `cur-ch >= 5`（ch1 途经的安提阿/帕弗/路司得/特庇 必须被强制显示，否则播放时全图只有 1 个地名亮着）、非本章地名存在且 `opacity < 0.3`。
  - **M8-4（暂停复原）**：暂停后回到 `visible === 6 / hidden === 22`，即分级消隐的常态。
- **M9 新增的六条（构图收敛：地图最大化 / 时间轴贴底 / 锚定浮窗）**：
  - **W-1（地图铺满）**：1440×900 下 `#map` 矩形 == 视口、`body.panel-off` 为真、`.sidebar` 右边缘 `<= 1`（整块滑出屏幕左侧）、时间轴可见高度 14–18px、`insets.b <= 30 && insets.l <= 30`（不再为侧栏与时间轴留常驻占位）。
  - **W-2（首屏自动展开）**：清 `sessionStorage['gs-tl-seen']` 后重载，2.4s 时断言 `tlOpen === true`、把手文本形如 `▲ AD 46 · 3/97`、播放按钮在视口内且 `elementFromPoint` 命中 `.tl` 内部；再等 2.8s 断言已自动收起、只露 16px、把手文字 `opacity > .9`。
  - **W-3（鼠标移近才显示）**：真实 `mouseMoved` 到 `.tl-hot` 中心 → 展开且热区 `pointer-events:none`（让位给轨道）；移到左上空白 → 2s 后收起；再移回热区并**真实点击播放键** → `playing === true` 且播放期保持展开。
  - **W-4（浮窗锚定）**：命中测试挑一个地点核心（优先事件最多的罗马）真实点击，断言 `kind === 'place'`、整卡在视口内、`--ax ∈ [0, w]`、垂直间距 `|gap - 18| <= 2`（上方优先，放不下翻到下方）。
  - **W-5（浮窗跟随平移）**：`panBy([140, 90])` 后断言卡片位移与锚点像素位移一致（±2px）、`--ax` 不变、仍在视口内 —— 防「只在打开那一刻定位、之后拖地图就飘走」。
  - **W-6（关闭复位）**：真实点击关闭按钮后 `geoCard.hidden === true`、`state.detail === null`。
- **R 新增的两条（旅程重播的结束状态，2026-11-02）**：
  - **R-1（定格在终点）**：图例默认收起，先真实点击 `#lgToggle` 展开，再真实点击 `.lg-j[data-j="j2"]`；轮询到「`.travel-ic` 收走且 `pinned().length > 0`」后断言 `pinned === ['j2']`、`base` 点数 == `path` 点数、`head` 在路径末点、`baseEl.opacity > .9`、`flowEl.animationPlayState === 'paused'`、图例行仍带 `.on`。**这一条必须在「当前年份早于该旅程起点」的条件下跑**（AD 46 vs j2 的 AD 49）——否则 `applyTime` 本来就会显示整段，测不出 pin 是否生效。
  - **R-2（定格可撤销）**：`setYear(56)` 后断言 `pinned` 为空且 `baseEl.opacity < .5`（交还年份驱动，`past` 态压暗），防止「定格」变成「赖着不走」。
- **M9.2 的验证方式（视野与领域）**：这两项没有「对/错」只有「够不够」，所以不进 `verify.mjs` 做二元断言，改用一次性探针 `scripts/diag-view.mjs`（测完即删）逐视口量四个数：
  - `contentPct`（首屏内容包围盒 / 视口）= 放大是否到位。1440×900 `89%×76%`、1680×1000 `91%×82%`、430×932 `74%×18%`（竖屏受故事 23.7°×10.1° 的横条比例限制，属预期）。
  - `worldMiss`（视野越出墨卡托可绘制范围的度数）= 最小缩放下会不会露白。三视口全 0。
  - 另有 `scripts/diag-pix.mjs`（同样一次性）自解 PNG 取色，确认海陆配色没画反（海 `rgb(232,235,229)` / 陆 `rgb(253,253,251)`）。
  - 回归仍靠 `verify.mjs` 全量：A3（标记零偏移）、A4 / M3-10（全部事件地点在视口内、`spanLat 12.4 / spanLng 26.1`）、M8-1（`visible === 6`、零重叠、`base 6.25`）在放大后依旧成立。
- **S 新增的七条（旅程地名 + 底部旅程切换，2026-11-02）**：
  - **S-1（chip 齐备）**：展开时间轴后断言 `#tlJourneys` 恰有 6 个 chip（全部 + 5 段）、**全部在视口内**、仅「全部」为按下态。收起态它们全在视口外 —— 这正是必须「先展开再点」的原因。
  - **S-2（选中即聚焦）**：真实点击 `[data-j="j2"]` → `state.route === 'j2'`、chip 与图例 `.lg-j.sel` 同步、`body.route-focus` 生效、`.place-icon.route-off` 出现、`.travel-ic` 存在（描线已在跑）。
  - **S-3（旅程地名）**：把「站点 ∪ 本章事件地点」共 13 个地点逐个比对 DOM —— 每个都要有 `display !== 'none'` 的 tooltip（`.city-tip` 或背景地名 `.ctx-tip`，两者都带 `data-place`）、**整块在视口内**、且 `.city-tip` 两两**零重叠**。只数 `state` 里的集合是测不出「名字有没有真的画出来」的。
  - **S-4（再点重播）**：同一 chip 再点一次仍是 `j2`（不取消聚焦），`.travel-ic` 重新出现。
  - **S-5（切换换组）**：切到 j5 → 断言 j5 的 9 个地名全部显示，证明地名是跟着旅程走的、不是「一次点亮全显示」。
  - **S-6（全部复位）**：点「全部」→ `route === null`、`route-focus` 移除、`route-off` 清零、可见标签回到 6（M8 分级常态）。
  - **S-7（窄屏）**：430×932 下 chip 排 `scrollWidth > clientWidth`（可横向滚动）、首个 chip 在视口内、真实点击 `[data-j="j1"]` 能选中。
- **T 新增的四条（地名标签可点，2026-11-02）**：
  - **T-1（点名字开窗）**：取一个可见 `.city-tip` 的矩形中心**真实点击** → `state === 'place:corinth'`、卡片标题「哥林多」、标签仍在显示。必须真实点击：合成 `.click()` 绕过命中测试，测不出 `.city-tip` 还是不是 `pointer-events:none`。
  - **T-2（换名字换卡）**：再点另一个标签 → `place:ephesus`。这条同时看守「捕获阶段 `stopPropagation` 有没有把 Leaflet 的地图 click 一起吞掉」——吞掉了卡片会被刚打开的这次点击立刻关掉。
  - **T-2b（点空白仍能关窗）**：关掉浮窗这条路径不能被标签监听抢走。
  - **T-3（拖动 ≠ 点击）**：在标签上 `mousePressed` → 分 5 步移动 120px → `mouseReleased` → 地图中心确实变了、且 `state.detail === null`。
  - **T-4（窄屏 tap）**：430×932 下点标签同样开卡，且卡片 `rect.t >= 0`（没被时间轴/抽屉盖住）。
- **构图探针**：`scripts/diag-layout.mjs` 输出浮层矩形、`--tlh` 在各层的实际取值、每次 `fitStory` 入参、故事中心 vs 安全区中心偏差、浮层两两压叠面积、`JS EXCEPTIONS`；`scripts/diag-m9.mjs` 专测 M9 构图（首屏几何 / hover 展开 / 地点浮窗），并落三张截图（`m9_boot` / `m9_tl_open` / `m9_place_card`）。
- **标签密度探针**：`scripts/diag-labels.mjs`（支持 `MOBILE=1` / `DIAG_ZOOM=6.5` 复测）输出可见 / 隐藏标签数、逐对重叠面积、标签压住他人核心的面积；`scripts/diag-m8.mjs` 是三项交互验收的独立跑法。
- **截图核对**：每里程碑关键态截图（播放中事件卡 / 详情富媒体 / 移动端）

## 8. 已知限制与风险

1. **地图精度**：110m Natural Earth 数据在 zoom ≥ 9 时海岸线偏粗；城市级细节作为已知限制，必要时升级 50m 数据（体积换精度）
2. **媒体外链**：Wikimedia 外链需联网；本地优先 + 回退链接兜底
3. **换行符形态**：仓库 blob 为 LF，Windows 工作区因 `core.autocrlf=true` 检出为 CRLF；构建产物继承 CRLF（与归档项目既有形态一致），非 bug
4. **单文件体积与首帧（M4 引入）**：39 张 webp 内联后 HTML 约 3.1MB，`DOMContentLoaded` 在无 GPU 的 headless 下约 4.4s（普通桌面约 1s）。这是「单文件离线」的代价：若要更快的首屏，只能改回外链图片（`assets/media/` 随包分发），但那就不再是单文件。当前取单文件优先。
5. **音效默认开启，但受自动播放策略约束（M6 引入）**：首次出声一定发生在某次真实点击之后（点播放/点事件），页面加载时不会有任何声音；无 WebAudio 的环境里开关按钮自动隐藏。偏好存 localStorage，隐私模式下写入失败按「开」处理，不影响功能。
6. ~~**首屏仍有 2 对地点标签压叠（M7 观察）**~~ → **M8 已解决**：`彼西底的安提阿 / 路司得`、`推罗 / 西顿` 等首屏重叠由「分级消隐」根治——首屏只显示 6 个 L1 主干城市，实测可见标签两两重叠面积为 **0**（M8-1）。原先设想的「标签连引线」「同名簇聚合」不再需要：读者要的是**在正确的缩放级别看到正确的名字**，而不是让 28 个名字同时挤在同一屏。
7. **M8 引入的取舍：被隐去的地名需要主动发现**：L2/L3 地名在首屏不可见，读者要么放大，要么悬停那个小圆点，要么点开地点介绍窗。这是「密度」与「一次看全」的必然权衡——M8 选择了密度（首屏可读性），代价是低层级地名需要一次交互才能看到名字。`M8-2` 断言保证「悬停一定出得来」这条退路始终可用。

## 9. 播放体验轮踩坑（2026-10-17，需求：同步/慢放/过点/呼吸/地点介绍）

1. **Leaflet `flyTo` 的 `duration` 单位是秒，不是毫秒**：误传 `1150`（本意 1.15s）→ 动画按 1150 秒爬行，表现为「缩放以 ~0.004/s 的速度漂移、镜头中心距恶化到 29px、到达落点 6.99」。现象极易误判成 rig 数学坏掉——实际是单位错。修法：`mapCore.flyTo` 统一收毫秒、内部换算 `sec = durMs/1000`，调用方不再接触秒。
2. **`setZoom` 的缩放时长硬编码在 Leaflet CSS（250ms）里，无法放慢**：要「优雅慢放」必须改用 `flyTo(center, zoom, {duration})`（JS rAF 通道，每帧 `_move({flyTo:true})` 不触发 SVG 重投影，末帧一次 `_moveEnd` 收口）——慢 flyTo 无性能代价（实测 14s 播放 d 重写 2081 次、p95 16.8ms）。
3. **rig 与缩放动画必须不同窗**：巡航 flyTo（650ms）走完才启动 seek（SEEK_LEAD 700ms 错开）；两者一旦重叠，flyTo 每帧 `_move` 会用插值中心覆盖 rig 的 pane 平移，中心距立刻劣化。
4. **「到达才弹卡」要靠双触发幂等**：年份补间终点（onArrive）与 seek 末帧都会到达，用 `state.arrivedId` 去重；`.cur`（事件名标签）也加 arrivedId 门控，否则年份一落定名称就先弹出来。
5. **中点平滑的贝塞尔不经过站点**：Q(m1, b, m2) 最近点偏离站点 `|a+c-2b|/8`（帕弗→别加→彼西底一角实测 0.26°）。修法：seg 中点处直接写入站点坐标（两侧各一段二次贝塞尔，站点处一个不可见的转角），路线严格过点，描线头/相机落点与城市圆点重合。
6. **headless Chrome 默认 `prefers-reduced-motion: reduce`**：断言动画计算值前必须先 `Emulation.setEmulatedMedia` 模拟 no-preference，否则全局 animation-duration 被媒体查询压成 .01ms，呼吸断言假阴性。
7. **详情/介绍窗里的 `.ev` 行会留在 DOM**：列表行数断言必须限定 `#list .ev`，否则地点介绍窗的 3 行让筛选计数变成 15；折叠线以下的按钮（介绍窗底部）点击前要 `scrollIntoView`。
