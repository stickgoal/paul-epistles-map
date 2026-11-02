# geo-story · 保罗故事地图

使徒行传 13–28 章 + 保罗书信的「时间轴故事地图」——随时间轴播放，事件在地图上依次弹出；暂停时可点击事件，查看经文原文、地点信息、今貌照片与历史画作。

- **范围**：AD 46–67，三次传道旅程 → 被捕与受审 → 赴罗马航程 → 罗马被囚与尾声（六章，97 事件）
- **构图**：整屏地图 + 浮在地图上的玻璃卡片（左侧事件面板 / 底部时间轴 / 右上图层与图例 / 右下缩放）。**播放期镜头完全静止**，只有路线在生长。首屏视野由事件地点自动聚合（逐轴留白 3.5%），1440×900 下内容占屏 89%×76%；底图是全球 110m 陆地，缩到最小也不会看到裁切边
- **地名分级**：首屏只显示 6 个主干城市，放大逐级展开（+0.5 级出中途站、+1.3 级出途经地名）；悬停小圆点或点开地点即可看到被隐去的名字；播放期地名自动收敛到当前章节
- **形态**：单文件离线 HTML，Leaflet + 数据 + 引擎 + 39 张图片全内联（约 3.1MB），双击即用
- **音效**：WebAudio 现场合成（零素材、零额外字节），时间轴右下角开关，偏好存 localStorage；**默认静音**（点了喇叭才发声）
- **前身**：`paul-epistles-map/`（保罗书信写作地点地图，已归档冻结）

## 快速开始

```bash
node build.mjs    # template.html + shared/ + data/ + assets/media/ → geo-story.html
```

改内容只动 `data/`（事件 / 地点 / 路线 / 章节）与 `template.html`，详见 [docs/plan.md](docs/plan.md)。

## 目录结构

```
geo-story/
├── template.html      # 页面结构 + CSS + UI 编排（浮动面板 / 详情 / 播放控件）
├── shared/            # 共享引擎（map-core / route-engine / timeline / fx / audio，构建期内联）
├── data/              # chapters / places / routes / events（核心数据，全 JSON）+ media-audit
├── assets/            # leaflet + world.json（全球 110m 底图）+ media/（本地 webp，构建期内联）
├── build.mjs          # 构建：→ geo-story.html（图片转 data URI 内联）
├── verify.mjs         # CDP 验收脚本（A–J + A2–A11 / D3–D7 / J2 + M2-1…M2-8 + M3-1…M3-10 + M4-1…M4-8 + M6-1…M6-4 + M8-1…M8-5 + W-1…W-6 + R-1…R-2 + S-1…S-7）
├── scripts/
│   ├── verses.mjs     # 双源经文提取与校对（OpenCC 繁→简 + 逐字比对 + 变体分组归一）
│   ├── gen-ch6.mjs    # ch6 事件生成器（经文程序化注入，双源不一致即退出码 2）
│   ├── check-events.mjs # events.json 经文回验（用字逐字一致 + 双源一致，退出码 2 阻断）
│   ├── check-routes.mjs # 事件↔路线映射与描线单调性校验（noRoute 章不计警告）
│   ├── commons.mjs    # Wikimedia Commons 检索与授权核验（429 指数退避）
│   ├── localize-media.mjs # 媒体本地化：授权核验 → 下载 → webp(≤110KB) → 回填 src/credit
│   ├── make-basemap.mjs # 底图生成：Natural Earth 110m TopoJSON → assets/world.json（176 features / 157KB）
│   ├── measure-fps.mjs # 播放性能探针：帧间隔 / SVG d 重写 / 地图事件风暴 / longtask
│   ├── diag-boot.mjs  # 启动时序探针（boot 时刻 / 轨道定型 / 首帧耗时）
│   ├── diag-layout.mjs # 构图探针（浮层矩形 / --tlh 取值 / fitStory 入参 / 压叠面积 / 安全区）
│   ├── diag-labels.mjs # 标签密度探针（可见/隐藏数 / 逐对重叠面积 / 压住他人核心；MOBILE=1、DIAG_ZOOM=6.5）
│   ├── diag-m8.mjs    # M8 三项交互验收独立跑法（分级消隐 / 悬停恢复 / 播放收敛）
│   ├── diag-m9.mjs    # M9 构图探针（首屏几何 / 时间轴 hover 展开 / 地点锚定浮窗 + 三张截图）
│   ├── experiment-rig.mjs # 相机 rig 数学验证（一次性实验，防复发存档）
│   └── run-cdp.ps1    # 验收 runner：只关闭自己启动的 headless Chrome
├── docs/
│   ├── plan.md        # 里程碑计划（M0–M9）、数据模型规范、踩坑记录、事件清单
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
| M3 | 被捕受审 + 赴罗马航程 | ✅ 完成（84 事件 / 5 章 / 30 地点，双源经文回验 87/87） |
| M4 | 富媒体与罗马被囚尾声 | ✅ 完成（97 事件 / 6 章，双源经文回验 105/105；39 张图本地 webp 内联 + 署名溯源） |
| M5 | 共享引擎回灌归档项目（可选） | 暂缓 |
| M6 | 音效与增强动画 | ✅ 完成（`shared/audio.js` 合成音效 + 抵达外扩动画，开关偏好持久化） |
| M7 | 构图重构：全屏地图 + 浮动浮层 | ✅ 完成（整屏地图 / 浮层玻璃卡片 / 安全区 `fitStory` / 播放期镜头静止 / 呼吸环放慢至 9s） |
| M8 | 标签密度分级 | ✅ 完成（去计数后缀 / 三级分级消隐 / 悬停恢复 / 播放期地名收敛；首屏 28→6、零重叠） |
| M9 | 构图收敛：地图最大化 + 时间轴贴底 + 锚定浮窗 | ✅ 完成（侧栏默认收起 / 时间轴收进 16px 把手·hover 才展开 / 事件与地点详情改为贴着锚点的浮窗 / 引导横幅退役并入把手；W-1…W-6 全绿） |
| M9.1 | 旅程重播停在结束状态 | ✅ 完成（15s 描线到位后把该段**定格成整段描完**：`pin` 标记优先于年份判定，流光暂停、终点留光点；拖时间轴 / 换旅程 / 取消聚焦即撤销；R-1…R-2 全绿） |
| M9.2 | 视野放大 + 领域扩到全球 | ✅ 完成（`STORY_FIT` 改逐轴 3.5% 留白 + `zoomSnap .25`：首屏内容占比 53%×45% → **89%×76%**；底图由裁剪窗口改为**全球 110m**，竖屏不再露出矩形裁切边；动态 `minZoom` 整套删除） |
| M9.3 | 旅程地名 + 底部旅程切换 | ✅ 完成（选中某段旅程即把该段 9–13 个地名**全部点亮**并切成紧凑形态；时间轴顶部新增旅程 chip：点一段即选中并重播 15s 描线、再点重播、点「全部」取消；音效改为**默认静音**；S-1…S-7 全绿） |

## 验证

验收请用 helper 脚本，**不要手动 `taskkill /IM chrome.exe`**（会杀掉你自己开着的所有 Chrome 窗口）：

```bash
# 一条命令搞定：启动独立 headless Chrome → 跑验收 → 只关闭自己启动的那一个
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 verify.mjs
# 可选窗口尺寸： ... run-cdp.ps1 verify.mjs 1280 800
```

`verify.mjs` 覆盖 A–J 十项 + A2–A11 / D3–D7 / J1b–J2 / M8-1…M8-5 / W-1…W-6 回归断言 + 控制台错误 + 截图 f1/f1b/f2/f3/f4/f5 / w2_first_run / w4_place_card。D4–D7 覆盖 2026-10-17 播放体验轮：到达才弹卡 / 路线精确过点 / 地点呼吸频率 / 播放缩放节奏。M2-1…M2-8 覆盖数据扩容后的不变量：章节年代范围 / 同年顺序 / **章节闸门（事件只驱动本章旅程）** / 地点事件点齐全 / 字段完整性 / 事件↔路线命中 / 时间轴承载力 / 章节筛选。M3-1…M3-10 覆盖 M3 扩容后的同类不变量（含初始视野须容纳罗马与马耳他）。M4-1…M4-8 覆盖 ch6 与富媒体：章节年代覆盖 / ch6 字段与出处标注 / **媒体全部内联且署名可溯源** / 图像区块只出一个标题且图片真的解码成功 / 无图事件走降级 / 尾声章无旅程 / 章节筛选 / 时间轴承载力。M6-1…M6-4 覆盖音效与动画：**真实点击音效开关**后 `aria-pressed` 与 localStorage 同步 / 音色表齐全且静音时 `play()` 返回 false / `AudioContext` 真被创建并处于 running / 抵达时圆点确实挂上 `arriveRing` 动画（读 `animationName`，不靠类名猜）。M8-1…M8-4 覆盖标签密度：**首屏只显示 6 个主干城市且可见标签两两零重叠** / 真实鼠标悬停被隐去的地点能临时显示、移开复隐 / 播放期地名收敛到当前章节（`cur-ch >= 5`、非本章 `opacity < 0.3`）/ 暂停后复原为分级常态。W-1…W-6 覆盖 M9 构图：**地图真的铺满视口且侧栏整块滑出** / 首屏时间轴自动展开 2.6s 再收起、把手读数为「▲ AD 46 · 3/97」/ **真实鼠标移近底部热区才展开、移开收起、移近后真实点击播放键** / 地点浮窗贴着锚点（间距 18px、`--ax` 在卡内、整卡在视口内）/ 平移 140×90 后浮窗与锚点同步位移（±2px）/ 关闭后 `hidden` 且 `state.detail === null`。R-1…R-2 覆盖旅程重播的结束态：**真实点击图例里的「第二次传道旅程」后，15s 描线结束即定格在整段描完**（`pinned === ['j2']`、路线点数 == 路径点数、终点光点在末点、流光暂停、光点与拖尾已收走、图例行仍高亮）——当前年份 AD 46 早于 j2 的 AD 49，旧实现必然判成 `future` 把整条线隐藏；R-2 再拖时间轴到 AD 56，断言定格撤销、交还年份驱动（`opacity .42`）。

M9.2 的「放大 / 加领域」没有对错、只有够不够，所以不进 `verify.mjs` 做二元断言，而用一次性探针量数：`contentPct`（首屏内容包围盒 / 视口）在 1440×900 / 1680×1000 / 430×932 分别为 `89%×76%` / `91%×82%` / `74%×18%`（竖屏受故事 23.7°×10.1° 的横条比例限制，属预期）；`worldMiss`（视野越出墨卡托可绘制范围的度数）三视口全 0。回归仍由全量验收看守：A3 标记零偏移、A4/M3-10 全部事件地点在视口内、M8-1 首屏 `visible === 6` 且零重叠，在放大后依旧成立。

S-1…S-7 覆盖 M9.3：展开时间轴后断言 6 个旅程 chip 全在视口内且仅「全部」按下 / **真实点击「第二次旅程」** → `state.route` 与 chip、图例三处同步且 `.route-focus` 生效 / 该旅程 **13 个地名全部显示**（`.city-tip` 与背景地名 `.ctx-tip` 都按 `data-place` 逐个核对，整块在视口内、两两零重叠）/ 再点同一 chip 是重播而非取消 / 切到「赴罗马航程」地名换成另一组 9 个 / 点「全部」回到 6 个 L1 常态 / 430px 下 chip 排可横向滚动且点得到。

M7 修订了三条关键断言：**D3** 从「镜头紧跟光点」改为「镜头静止」——固定参考点每 200ms 采样像素坐标，要求漂移 `< 0.01px`、中心与缩放都不变、travel 窗口内 `moveend ≤ 2`，**同时要求描线仍在生长**（`routeGrew`），否则「把动画全停掉」也能假通过；**D6** 把呼吸周期下限从 4s 提到 8s，并新增「双环错相 = 周期/2」；**J / J2** 改为全屏地图断言（`fullBleed` / 抽屉默认收起 / 抽屉不压「事件」胶囊）；M9 起 J 不再要求播放键常驻视口（时间轴贴底收起时它本就不在），改测 **16px 把手在视口内 + 底部 40px 热区可命中**，J1b 再真实点击热区确认触屏也能展开；J2 真实点击「事件」胶囊拉起抽屉后要求可见行数 ≥ 3 且地图仍留 180px 以上。

构图几何有问题时用 `scripts/diag-layout.mjs`：它打印各浮层矩形、`--tlh` 在 `:root` 与各层内的实际取值（自定义属性在 Leaflet 容器子树内不刷新，这一项能直接照出来）、每次 `fitStory` 的入参、故事中心与安全区中心的偏差、浮层两两压叠面积，以及 `Runtime.exceptionThrown` 捕获到的 JS 异常。

> **页面初始化约 4.5s（无 GPU 的 headless）**：97 事件 + 39 张内联图让单文件达到 3.1MB，`DOMContentLoaded` 约 4.4s、首帧更晚。验收脚本的导航等待已放宽到 6000ms —— 4.2s 时读到的是「时间轴轨道尚未定型」的中间态（会误报标记偏移与圆点重叠）。普通桌面浏览器约 1s，探针见 `scripts/diag-boot.mjs`。

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
> **还有一个更隐蔽的坑**：不要写 `*{transition-duration:.01ms!important}` 这类"关动效"规则
> —— `transition-property` 初始值是 `all`，只改 duration 等于给每个属性挂了一段过渡，
> 于是「改样式 → 立刻 `getBoundingClientRect()`」在同任务内读到的是**过渡起点值**，
> 标签避让的候选测量会全部失效（headless 默认 `prefers-reduced-motion: reduce`，
> 这条规则一直生效）。关动效请写 `transition:none!important`。见 `docs/plan.md` M9.3 踩坑 6。

图像素材本地化（需联网访问 Commons API；授权核验 → 下载 → webp → 回填 src/credit）：

```bash
node scripts/localize-media.mjs            # 预览：逐张核验存在性与授权（不写盘）
node scripts/localize-media.mjs --write    # 下载 + 转 webp + 回填 data/events.json
node scripts/localize-media.mjs --recompress  # 只重压已有 webp（720px / ≤110KB），不联网
```

> 图片必须走这个脚本：`credit` 由 Commons `extmetadata` 生成并清洗，`data/media-audit.json`
> 逐图留档（文件 / 授权 / 作者 / 体积 / 溯源页）。**不要手写 credit，也不要凭记忆拼文件名**——
> 全文搜索的第一条常常是植物学名或现代风景区。

## 数据来源与学术说明

- 年代与地点采用学界主流推定，争议处在事件 `note` 中标注（参照归档项目的标注粒度）
- 经文引用和合本，引用前须对照权威版本校对
- 媒体仅用 CC 许可或公有领域作品，`credit` + 溯源链接必填，署名可点开核对
- 地图数据 © Natural Earth · 渲染 Leaflet
