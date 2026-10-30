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

## 1. 架构

### 1.1 目录结构

```
geo-story/
├── template.html        # 页面结构 + CSS + UI 编排（侧栏 / 详情 / 播放控件）
├── shared/              # 与 paul-epistles-map 共用的引擎（构建期内联，产物仍是单文件）
│   ├── fx.js            #   事件总线（音效 / 增强动画订阅点，M6 消费）
│   ├── audio.js         #   WebAudio 合成音效（零素材）：音色表 / 懒初始化 / 开关持久化
│   ├── map-core.js      #   地图基底：GeoJSON 底图 / 经纬网 / flyTo / 点亮 / 涟漪 / 标签避位
│   ├── route-engine.js  #   平滑路径 / 累计里程 / 按年代截取点亮 / 路线光点 / 旅程重播
│   └── timeline.js      #   时间轴控件（拖拽 / 键盘 / 圆点 / 色带）+ 播放调度 + 事件序列播放
├── data/                # 纯数据（改内容只动这里）
│   ├── chapters.json    #   六章元数据
│   ├── places.json      #   地点库：坐标 / 古今名 / 现代归属 / 备注
│   ├── routes.json      #   四段旅程路径点（命名途经点）
│   ├── events.json      #   事件库（核心资产，见 §1.4）
│   └── media-audit.json #   逐图授权留档（文件 / 授权 / 作者 / 体积 / 溯源页）
├── assets/
│   ├── leaflet.js / .css / med.json / countries-110m.json / topojson-client.min.js
│   └── media/           #   本地图片（webp，≤110KB）；构建期内联为 data URI
├── build.mjs            # 构建：template + shared + data + assets → geo-story.html（媒体内联）
├── prep-data.mjs        # 地图数据裁剪（仅在需要调整可视范围时运行）
├── cdp-shot.mjs         # CDP 截图 / 求值工具（从归档项目原样搬入）
├── verify.mjs           # CDP 验收脚本（A–J + M2-1…M2-8 + M3-1…M3-10 + M4-1…M4-8 + M6-1…M6-4）
├── scripts/             # 数据管线（见下）
│   ├── verses.mjs       #   双源经文提取与校对（OpenCC 繁→简 + 逐字比对）
│   ├── gen-ch6.mjs      #   ch6 事件生成器（经文程序化注入，双源不一致即中止）
│   ├── check-events.mjs #   events.json 经文回验（用字逐字一致 + 双源一致）
│   ├── check-routes.mjs #   事件↔路线映射与描线单调性校验
│   ├── commons.mjs      #   Wikimedia Commons 检索与授权核验（429 退避）
│   ├── localize-media.mjs # 媒体本地化：授权核验 → 下载 → webp → 回填 src/credit
│   ├── diag-boot.mjs    #   启动时序探针（boot 时刻 / 轨道定型 / 首帧耗时）
│   ├── diag-offset.mjs  #   标记/事件点偏移探针（对照 _size 陈旧缺陷）
│   ├── diag-tl.mjs      #   时间轴轨道几何探针（圆点尺寸 / 行数 / 簇排布）
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
| `@@GEOJSON@@` | `assets/med.json` | 地中海裁剪 GeoJSON |
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
> 交付时漏拷目录就整片空白。39 张 720px webp 内联后 HTML 约 2.9MB（图片 1.86MB → base64 2.4MB），
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
- **截图核对**：每里程碑关键态截图（播放中事件卡 / 详情富媒体 / 移动端）

## 8. 已知限制与风险

1. **地图精度**：110m Natural Earth 数据在 zoom ≥ 9 时海岸线偏粗；城市级细节作为已知限制，必要时升级 50m 数据（体积换精度）
2. **媒体外链**：Wikimedia 外链需联网；本地优先 + 回退链接兜底
3. **换行符形态**：仓库 blob 为 LF，Windows 工作区因 `core.autocrlf=true` 检出为 CRLF；构建产物继承 CRLF（与归档项目既有形态一致），非 bug
4. **单文件体积与首帧（M4 引入）**：39 张 webp 内联后 HTML 约 2.9MB，`DOMContentLoaded` 在无 GPU 的 headless 下约 4.4s（普通桌面约 1s）。这是「单文件离线」的代价：若要更快的首屏，只能改回外链图片（`assets/media/` 随包分发），但那就不再是单文件。当前取单文件优先。
5. **音效默认开启，但受自动播放策略约束（M6 引入）**：首次出声一定发生在某次真实点击之后（点播放/点事件），页面加载时不会有任何声音；无 WebAudio 的环境里开关按钮自动隐藏。偏好存 localStorage，隐私模式下写入失败按「开」处理，不影响功能。

## 9. 播放体验轮踩坑（2026-10-17，需求：同步/慢放/过点/呼吸/地点介绍）

1. **Leaflet `flyTo` 的 `duration` 单位是秒，不是毫秒**：误传 `1150`（本意 1.15s）→ 动画按 1150 秒爬行，表现为「缩放以 ~0.004/s 的速度漂移、镜头中心距恶化到 29px、到达落点 6.99」。现象极易误判成 rig 数学坏掉——实际是单位错。修法：`mapCore.flyTo` 统一收毫秒、内部换算 `sec = durMs/1000`，调用方不再接触秒。
2. **`setZoom` 的缩放时长硬编码在 Leaflet CSS（250ms）里，无法放慢**：要「优雅慢放」必须改用 `flyTo(center, zoom, {duration})`（JS rAF 通道，每帧 `_move({flyTo:true})` 不触发 SVG 重投影，末帧一次 `_moveEnd` 收口）——慢 flyTo 无性能代价（实测 14s 播放 d 重写 2081 次、p95 16.8ms）。
3. **rig 与缩放动画必须不同窗**：巡航 flyTo（650ms）走完才启动 seek（SEEK_LEAD 700ms 错开）；两者一旦重叠，flyTo 每帧 `_move` 会用插值中心覆盖 rig 的 pane 平移，中心距立刻劣化。
4. **「到达才弹卡」要靠双触发幂等**：年份补间终点（onArrive）与 seek 末帧都会到达，用 `state.arrivedId` 去重；`.cur`（事件名标签）也加 arrivedId 门控，否则年份一落定名称就先弹出来。
5. **中点平滑的贝塞尔不经过站点**：Q(m1, b, m2) 最近点偏离站点 `|a+c-2b|/8`（帕弗→别加→彼西底一角实测 0.26°）。修法：seg 中点处直接写入站点坐标（两侧各一段二次贝塞尔，站点处一个不可见的转角），路线严格过点，描线头/相机落点与城市圆点重合。
6. **headless Chrome 默认 `prefers-reduced-motion: reduce`**：断言动画计算值前必须先 `Emulation.setEmulatedMedia` 模拟 no-preference，否则全局 animation-duration 被媒体查询压成 .01ms，呼吸断言假阴性。
7. **详情/介绍窗里的 `.ev` 行会留在 DOM**：列表行数断言必须限定 `#list .ev`，否则地点介绍窗的 3 行让筛选计数变成 15；折叠线以下的按钮（介绍窗底部）点击前要 `scrollIntoView`。
