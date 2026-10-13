# paul-epistles-map

保罗书信写作地点交互式地图 —— 单文件 HTML，离线可用。

打开 `paul-epistles-map.html`（双击即可，无需服务器、无外部请求），看 13 封书信如何在地中海世界按年代依次写成。

## 功能

- **地中海矢量地图**：Natural Earth 110m 数据裁剪，6 个写作地点 + 3 个上下文城市（耶路撒冷、大马士革、大数），带 faint 经纬网
- **动态时间轴**：拖动 / 空格播放 / 方向键步进（AD 47–67），书信 chip 按年代依次浮现
- **时间驱动的旅程点亮**：当前年代落在哪段传道旅程，该旅程即高亮，路线按年代逐段绘制，前端光点停在已点亮路段尽头；图例行与时间轴甘特带同步显示 已完成 / 进行中 / 未开始
- **飞行定位**：点书信 chip / 列表项 / 时间轴圆点，地图俯冲飞至写作地，城市点亮 + 涟漪扩散，时间轴自动跳到该书年代
- **传道旅程动画**：4 段路线（三次传道旅程 + 赴罗马航程）飞线绘制，点击图例重播
- **详情视图**：写作地点、年代、收信对象、送信人、背景、关键经文（和合本）
- **其他**：城市点击筛选、图层开关、重置视图、hash 深链（`#rom` 直达罗马书）、移动端响应式、键盘操作、城市标签自动避位（缩放后重算）

## 目录结构

```
paul-epistles-map/
├── paul-epistles-map.html   # 交付物：单文件，Leaflet + GeoJSON 全内联（离线）
├── template.html            # 源模板：页面结构 + CSS + 数据 + 逻辑（改这里）
├── build.mjs                # 构建：把 Leaflet/GeoJSON 内联进模板 → 单文件
├── prep-data.mjs            # 数据准备：TopoJSON → 地中海裁剪 GeoJSON
├── assets/
│   ├── leaflet.js / .css    # Leaflet 1.9.4（unpkg 下载）
│   ├── countries-110m.json  # Natural Earth 110m 国家 TopoJSON
│   ├── topojson-client.min.js
│   └── med.json             # 裁剪后的地中海 GeoJSON（构建输入）
├── cdp-shot.mjs             # 验证工具：CDP 驱动 Chrome 截图 + 页面状态探测
├── verify.mjs               # 验收脚本：点击 pin → 详情视图
└── verify5.mjs              # 验收脚本：标签避位 / 旅程重播 / 播放 / 移动端 / 控制台错误
```

## 修改与重新构建

```bash
# 依赖：Node 18+（仅构建与验证用，页面本身零依赖）
node build.mjs        # template.html + assets → paul-epistles-map.html（约 226KB）
node prep-data.mjs    # 仅在需要重新裁剪地图数据时运行
```

**改内容只需动 `template.html`**，数据集中在「数据」区：

| 数据 | 位置 | 说明 |
|---|---|---|
| `CITIES` | template.html:325 | 写作城市：坐标、标签方位、注释 |
| `EPISTLES` | template.html:340 | 13 封书信：id、年代、城市、收信人、送信人、背景、经文 |
| `JOURNEYS` | template.html:398 | 4 段传道旅程：路径点、年代区间、颜色 |
| `CTX` | template.html:413 | 上下文城市（纯标注） |

新增/修改书信后运行 `node build.mjs` 重新生成单文件即可。

## 数据来源与学术说明

- **年代与地点**采用学界主流推定（详见各书信详情页内的标注）：加拉太书 AD 48–49 安提阿（或 AD 49–57 之说，详情页有注明）；监狱书信（弗/腓/西/门）AD 60–62 罗马被囚期间；提多书 AD 66–67 尼哥波立；提摩太前后书地点为传统推定
- **《希伯来书》未列入**：作者存疑，不属于保罗书信的确定名单
- 经文引用和合本
- 争议处均在对应书信详情中明确标注推定性质

## 验证

```bash
# 1. 启动带调试端口的 Chrome
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --no-sandbox --disable-gpu --window-size=1680,1000 \
  --remote-debugging-port=9222 --user-data-dir=.cdp-profile about:blank

# 2. 运行验收脚本
node verify.mjs     # 点击罗马书 pin → 详情视图
node verify5.mjs    # 标签避位 / 旅程重播 / 播放 / 移动端 / 控制台错误
```

`cdp-shot.mjs` 为通用 CDP 截图/探测工具：`node cdp-shot.mjs <url> <out.png> <等待ms> "<JS表达式>" '["点击事件JSON"]'`

> 注意：headless Chrome 的 `--virtual-time-budget` 截图模式会冻结 CSS 过渡，导致动画中间态显示异常（如 chip 不可见）——这是截图伪影，非页面 bug。验证动画请用真实时间的 CDP 驱动（上述脚本即此方式）。
