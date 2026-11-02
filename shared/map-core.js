/* GS.mapCore — 地图基底（与 paul-epistles-map 共用）：
 * Leaflet 初始化、地中海 GeoJSON 底图、经纬网、两段式飞行定位、地点点亮/涟漪、城市标签自动避位。
 * 由 build.mjs 内联进单文件；不依赖任何外部状态。 */
window.GS = window.GS || {};
GS.mapCore = (function () {
  'use strict';

  var map = null, glowMarker = null, litTimer = null;
  /* 障碍集与核心盒都排除被路线筛选隐去的地点（.route-off）：
   * 隐去的地点在几何上仍然占着 96×96 的盒子，若继续参与避让，可见标签会被
   * 「看不见的东西」推得四处乱跑。 */
  var lastItems = [], lastObstacleSel = '.place-icon:not(.route-off) .ev-dot, .ctx-icon:not(.route-off) .ctx';
  var labelTimer = null, lastLabelZoom = 0;
  var lastFit = null, storyFit = null;
  /* 标签分级（M8）：baseZoom 是首次 fit 落定的首屏 zoom，L2/L3 的显示阈值以它为基准。
   * 只记一次 —— 若每次 fit 都更新，用户手动缩放后再触发 fit（resize/打开面板）会让
   * 阈值跟着漂，同一缩放下标签数量时多时少。 */
  var baseZoom = 0;
  /* 强制显示集合：hover / 选中地点 / 播放到达时，把分级不到或被挤掉的标签临时提上来。
   * 由模板层调用 forceLabel(id, true/false) 维护，placeLabels 读它决定是否允许隐藏。 */
  var forceSet = {};
  /* 安全区（px）：浮在地图上的面板/时间轴遮住的区域。fitBounds 只把故事范围塞进
   * 「没被遮住」的那块，否则全屏地图下罗马与马耳他会躲在左侧面板背后。 */
  var insets = { t: 26, r: 26, b: 26, l: 26 };

  /* 把故事范围塞进「没被浮层遮住」的那块，并在这块里居中。
   *
   * 为什么不用 map.fitBounds({paddingTopLeft, paddingBottomRight})：Leaflet 只用 padding
   * 算缩放，中心仍然是【容器中心】。全屏地图 + 左侧面板 + 底部时间轴的构图里，
   * 容器中心离安全区中心很远（1440×900 下偏左 190px、偏下 107px），故事会整体压到
   * 面板与时间轴底下（实测罗马紧贴面板边缘、耶路撒冷被时间轴盖住）。
   * 这里先按缩小后的尺寸求 zoom，再把「地理中心」摆到安全区的中心点上。 */
  var fitLog = [];   /* 最近若干次 fitStory 的入参快照（诊断用：insets/zoom/中心） */
  function fitStory(animate, durMs) {
    var b = L.latLngBounds(lastFit || DEFAULT_FIT);
    var size = map.getSize();
    if (size.x < 200 || size.y < 120) return;
    var pad = L.point(insets.l + insets.r, insets.t + insets.b);
    var zoom = Math.min(map.getMaxZoom(), map.getBoundsZoom(b, false, pad));
    var boxC = L.point((insets.l + size.x - insets.r) / 2, (insets.t + size.y - insets.b) / 2);
    var px = map.project(b.getCenter(), zoom).add(size.divideBy(2).subtract(boxC));
    var center = map.unproject(px, zoom);
    fitLog.push([insets.t, insets.r, insets.b, insets.l, zoom, Math.round(boxC.x), Math.round(boxC.y), animate ? 'anim' : 'set']);
    if (fitLog.length > 24) fitLog.shift();
    if (!baseZoom) baseZoom = zoom;   /* 首屏 zoom 定标（标签分级阈值的基准，见 placeLabels） */
    if (animate) map.flyTo(center, zoom, { duration: (durMs || 1200) / 1000 });
    else map.setView(center, zoom, { animate: false });
  }
  /* 安全区过大（小窗口 + 宽面板）时按比例收缩，保证至少留出 160×120 的可视区 */
  function clampInsets() {
    var s = map ? map.getSize() : { x: 800, y: 600 };
    var maxL = Math.max(8, s.x - 160), maxT = Math.max(8, s.y - 120);
    if (insets.l + insets.r > maxL) {
      var k = maxL / (insets.l + insets.r);
      insets.l = Math.round(insets.l * k); insets.r = Math.round(insets.r * k);
    }
    if (insets.t + insets.b > maxT) {
      var k2 = maxT / (insets.t + insets.b);
      insets.t = Math.round(insets.t * k2); insets.b = Math.round(insets.b * k2);
    }
  }

  var DEFAULT_FIT = [[27.6, -11.8], [47.8, 44.2]];
  var LABEL_CANDIDATES = [
    ['right', [14, 0]], ['right', [14, -12]], ['right', [14, -28]], ['right', [28, 0]], ['right', [28, -16]],
    ['left', [-14, 0]], ['left', [-14, 12]], ['left', [-14, 28]], ['left', [-28, 0]], ['left', [-28, 16]],
    ['bottom', [0, 14]], ['bottom', [0, 22]], ['bottom', [0, 34]],
    ['top', [0, -14]], ['top', [0, -42]], ['top', [0, -62]],
    ['bottom', [0, 66]], ['bottom', [0, 90]]
  ];

  function init(opts) {
    opts = opts || {};
    if (opts.insets) insets = { t: opts.insets.t, r: opts.insets.r, b: opts.insets.b, l: opts.insets.l };
    map = L.map('map', {
      zoomControl: false, attributionControl: false,
      minZoom: 3, maxZoom: 10, zoomSnap: .5, wheelPxPerZoomLevel: 140
    });
    var fit = lastFit = storyFit = opts.fit || DEFAULT_FIT;
    clampInsets();
    fitStory(false);
    /* 缩放与比例尺不再交给 Leaflet 的角容器：它的 .leaflet-control 是 float:left;clear:both，
     * 角容器不包住浮动子元素（高度 0），在「浮层构图」里无论怎么调 bottom/margin 都会从
     * 容器底边往下溢，压住底部时间轴（实测 bottom:269px 时控件仍在 y=676）。
     * 缩放改由模板自带的 .mapctl 浮层按钮驱动（map.zoomIn/zoomOut），位置随 --tlh 走。 */

    L.geoJSON(opts.geo, {
      interactive: false,
      style: { color: '#d8dad3', weight: .9, opacity: .95, fillColor: '#fdfdfb', fillOpacity: 1 }
    }).addTo(map);

    var grat = L.layerGroup().addTo(map);
    [30, 35, 40, 45].forEach(function (la) {
      L.polyline([[la, -13], [la, 45]], { color: '#e0e3dc', weight: .7, opacity: .9, interactive: false }).addTo(grat);
    });
    for (var lo = -10; lo <= 40; lo += 5) {
      L.polyline([[27, lo], [48.5, lo]], { color: '#e0e3dc', weight: .7, opacity: .9, interactive: false }).addTo(grat);
    }

    /* 初始视野加固：容器尺寸未定（iframe/小窗/字体加载）时 fitBounds 会算错 zoom，
     * 而之后的 invalidateSize 只重定位 marker、不重新适配视野。
     * 用户首次交互前，布局稳定后重放初始 fit；onReady 供调用方补做依赖尺寸的测量。
     * 防护：容器尺寸异常（布局中间态可能读到 0 宽）时跳过本次，fitBounds 会把 zoom 爆到 max。 */
    var ready = false, locked = false;
    function validSize() {
      var s = map.getSize();
      return s.x > 200 && s.y > 120;
    }
    function settle() {
      if (locked || ready) return;
      if (!validSize()) return;   /* 布局未就绪，等下一次时机 */
      var before = map.getSize();
      map.invalidateSize();
      fitStory(false);
      if (Math.abs(map.getSize().x - before.x) < 1 && Math.abs(map.getSize().y - before.y) < 1) {
        ready = true;
        if (opts.onReady) opts.onReady();
      }
    }
    requestAnimationFrame(function () { requestAnimationFrame(settle); });
    setTimeout(settle, 350);
    setTimeout(settle, 1000);
    map.on('zoomstart dragstart', function () { locked = true; });

    /* 容器尺寸监控：iframe 嵌入 / 窗口缩放 / CSS 过渡都可能不派发 window resize，
     * Leaflet 的 trackResize 收不到，_size 缓存停留在中间态（曾实测读到 0 宽，
     * 导致 marker 全部错位）。ResizeObserver 直接观察容器，兜底轮距保底。 */
    var lastW = map.getContainer().getBoundingClientRect().width;
    var lastH = map.getContainer().getBoundingClientRect().height;
    function onContainerResize() {
      var r = map.getContainer().getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;               /* 布局中间态，跳过 */
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
      lastW = r.width; lastH = r.height;
      /* 尺寸修正必须【无条件】执行：_size 一旦陈旧，所有 marker 会整体偏移
       * 半个差值（2026-10-30 实测：时间轴轨道由 60px 长到 114px，标记整体下移 7px，
       * A3 位置断言可见）。原实现把 invalidateSize 也放在 locked 之后，
       * 而 locked 会被首次 settle() 自己的 fitBounds 置真 ⇒ 此后尺寸永远不修正。
       * 视野重适配仍只在不被用户接管镜头时做。 */
      map.invalidateSize();
      if (locked) return;
      if (!ready) { settle(); return; }
      fitStory(false);
      clearTimeout(labelTimer);
      labelTimer = setTimeout(function () { if (lastItems.length) placeLabels(lastItems, lastObstacleSel); }, 180);
    }
    if (window.ResizeObserver) {
      new ResizeObserver(onContainerResize).observe(map.getContainer());
    } else {
      setInterval(onContainerResize, 250);
    }

    lastLabelZoom = map.getZoom();
    map.on('moveend', function () {
      if (map.getZoom() === lastLabelZoom) return; /* 平移不改变相对布局，仅缩放后重算 */
      lastLabelZoom = map.getZoom();
      clearTimeout(labelTimer);
      labelTimer = setTimeout(function () { if (lastItems.length) placeLabels(lastItems, lastObstacleSel); }, 180);
    });

    return api;
  }

  /* 两段式飞行：目标比当前视角高 1.2 级以上时，先略退再俯冲，形成电影感。
   * durMs 单位为毫秒（Leaflet 原生 flyTo 的 duration 是秒，此处统一换算，
   * 避免调用方混用单位——2026-10-17 曾误传毫秒给秒级参数，动画变成 10 分钟爬行）。
   * 默认 1200ms（由 1000ms 放慢：用户要求缩放节奏优雅）。 */
  function flyTo(ll, zoom, durMs) {
    durMs = durMs || 1200;
    var sec = durMs / 1000;
    var z = map.getZoom();
    if (zoom - z > 1.2) {
      map.flyTo(ll, Math.max(z + 0.3, zoom - 1.9), { duration: sec * 0.62 });
      setTimeout(function () { map.flyTo(ll, zoom, { duration: sec * 0.55 }); }, durMs * 0.62);
    } else {
      map.flyTo(ll, zoom, { duration: sec });
    }
  }

  function clearLit() {
    clearTimeout(litTimer);
    if (glowMarker) { map.removeLayer(glowMarker); glowMarker = null; }
  }

  /* 点亮某坐标：柔光 + 双重涟漪（keep=true 持续到 clearLit）
   * 节奏整体放慢（2026-10-17）：光晕淡入 1.8s、涟漪单程 3.6s、二次涟漪 1.8s 触发。
   * 2026-10-30 起地点呼吸环已移除，这层光晕成为全图唯一的「地点级」动态强调 ——
   * 只在当前事件地点出现（keep 由到达/离开控制），不再有 28 个环同时扩散。 */
  function lit(ll, color, keep) {
    color = color || '#c2593f';
    clearLit();
    var icon = L.divIcon({
      className: 'fx-ic',
      html: '<div class="fx-glow" style="--c:' + color + '"></div>',
      iconSize: [170, 170], iconAnchor: [85, 85]
    });
    glowMarker = L.marker(ll, { icon: icon, interactive: false, zIndexOffset: 600 }).addTo(map);
    ripple(ll, color);
    setTimeout(function () { ripple(ll, color); }, 1800);
    if (!keep) litTimer = setTimeout(clearLit, 5600);
  }

  /* 地图原生涟漪圈：从坐标向外扩散后消散（3.6s 单程） */
  function ripple(ll, color) {
    color = color || '#c2593f';
    var ring = L.circleMarker(ll, { radius: 4, color: color, weight: 1.5, opacity: .42, fill: false, interactive: false }).addTo(map);
    var t0 = performance.now();
    (function grow(t) {
      var p = Math.min(1, (t - t0) / 3600);
      if (p >= 1) { map.removeLayer(ring); return; }
      var e = 1 - Math.pow(1 - p, 2.4);
      ring.setRadius(4 + e * 74);
      ring.setStyle({ opacity: .42 * (1 - p) });
      requestAnimationFrame(grow);
    })(t0);
  }

  /* 标签自动避位：在候选方位中为每个标签选择与障碍物（标记/圆点/其他标签）零碰撞的位置。
   * items: [{ marker, html }]；obstacleSel: 参与碰撞的 DOM 选择器。缩放后自动重算。
   *
   * M3 踩坑（25 个地点时 16 对标签互相压叠、97 处压住城市核心）：
   *   旧实现只把「已放置的标签」当作障碍，且只避让 8px 的 .core 圆点——
   *   而每个标签都从自己城市的 96px 命中盒中心伸出，必然压住邻近城市的核心。
   *   修法三条：
   *     1) 障碍集加入【全部地点核心】（.place-icon 命中盒），标签不得压住任何城市；
   *     2) 豁免【自己的】核心 —— 否则标签必然与自身锚点重叠，永远选不到零碰撞位；
   *     3) 若所有候选方位都有重叠，依次降级标签形态（去英文名 → 去事件计数 → 只留地名），
   *        宁可信息少一点也不可糊成一团。
   *   另：同分时优先选「尚未被同类标签用过」的方向，让密集区分散到不同侧。 */
  function placeLabels(items, obstacleSel) {
    lastItems = items || [];
    lastObstacleSel = obstacleSel || lastObstacleSel;

    /* ---------- 分级与消隐（M8，2026-11-02） ----------
     * 旧算法只有「挪」（9 方位 × 形态降级）与「缩短」（去英文名/去计数）两条路，
     * 全冲突时取「重叠面积最小者」—— 即任何标签【必须显示】。密集区（安纳托利亚/
     * 叙利亚）9 个方位全被占满，于是必然糊成一片（首屏实测 28 个标签 16 对互压）。
     *
     * 新增第三条路：占不到位就【隐藏】。分三级，阈值相对首屏 zoom（窗口尺寸不同，
     * fit 出的首屏 zoom 也不同：1080p 实测 5.5、窄屏 5.0，用绝对值会让窄屏永远
     * 看不到 L2）：
     *   L1（≥6 事件）任何缩放都显示；L2（2–4）首屏 +0.5 级；L3（0–1）首屏 +1.3 级。
     * L1 永不被隐藏 —— 宁可轻微重叠，也不能首屏一个地名都没有。
     *
     * 测量前必须把所有标签恢复显示：display:none 的元素 getBoundingClientRect()
     * 返回 0，会被误判成「零尺寸标签」，方位评估与越界惩罚全部失效。 */
    var zNow = map ? map.getZoom() : 6;
    var base = baseZoom || zNow;
    lastItems.forEach(function (cm) {
      var t = cm.marker && cm.marker.getTooltip ? cm.marker.getTooltip() : null;
      var el = t && t.getElement ? t.getElement() : null;
      if (el) { el.style.display = ''; el.classList.remove('label-hidden'); }
    });
    /* 小视口再筛一层 L1：移动端地图可用区常只有 430×230（顶部胶囊 + 底部抽屉），
     * 6 个主干城市在小地图上照样糊成一团。按事件数取前 3
     * （罗马 14 / 凯撒利亚 13 / 耶路撒冷 11）—— 它们同时覆盖西、东、南三个方位，
     * 缩放到哪都还留得住一个参照点。 */
    var sz = map ? map.getSize() : { x: 1200, y: 800 };
    var usableW = Math.max(0, sz.x - insets.l - insets.r);
    var usableH = Math.max(0, sz.y - insets.t - insets.b);
    var tight = usableW * usableH < 300000;
    var l1Top = {};
    if (tight) {
      lastItems.filter(function (cm) { return (cm.tier || 1) === 1; })
        .sort(function (a, b) { return (b.weight || 0) - (a.weight || 0); })
        .slice(0, 3)
        .forEach(function (cm) { l1Top[cm.placeId] = 1; });
    }
    function tierOK(tier, pid) {
      if (!tier || tier <= 1) return !tight || !!l1Top[pid];
      return zNow >= base + (tier === 2 ? 0.5 : 1.3);
    }

    document.body.classList.add('measuring');
    var obstacles = [];
    document.querySelectorAll(lastObstacleSel).forEach(function (elm) {
      var r = elm.getBoundingClientRect();
      if (r.width > 0) obstacles.push(r);
    });
    /* 地点核心作为障碍：取【核心视觉半径】的盒（24px），而不是 96px 的点击命中盒。
     * M3 实测：用 96px 命中盒时，密集区（安纳托利亚/叙利亚）这些盒本身互相重叠，
     * 于是「标签压住城市」被大量误判（实测 68 处，其中大半是盒盒重叠的连带结果），
     * 真正该管的视觉冲突（标签盖住城市的 8px 圆点）反而被淹没。
     * 24px 盒只覆盖可见核心周围，既反映真实冲突，又不互相误判。
     * 自身核心豁免 —— 标签必然从自己的锚点伸出。 */
    var cores = [];
    document.querySelectorAll('.place-icon:not(.route-off)').forEach(function (elm) {
      var inner = elm.querySelector('.place');
      var r = elm.getBoundingClientRect();
      if (!r.width) return;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = 12;
      cores.push({
        id: inner ? inner.getAttribute('data-place') : null,
        rect: { left: cx - R, top: cy - R, right: cx + R, bottom: cy + R, width: R * 2, height: R * 2 }
      });
    });
    document.body.classList.remove('measuring');

    var placed = [];
    var dirUsed = {};            /* 方位使用计数：同分时偏好少用过的方向，实现分散 */
    var items2 = lastItems.filter(function (cm) {
      /* 路线筛选（M8）：被隐去的地点不参与避让。过滤放在这里而不是调用方，
       * 因为 resize / moveend / setInsets 都会用 lastItems 重算 —— 调用方只在
       * 点击图例那一刻传过筛选后的数组，之后就会被「全量重算」悄悄还原。 */
      var el = cm.marker && cm.marker.getElement ? cm.marker.getElement() : null;
      if (el && el.classList.contains('route-off')) return false;
      /* 强制显示（hover / 选中 / 播放到达）必须优先于分级：分级过滤发生在这里，
       * 若不在同一处放行，被 tier 挡掉的标签根本进不了候选集，后面 items2 里的
       * force 标记永远读不到 —— 实测「悬停米利都标签不出现」就是这个顺序错误。 */
      if (cm.placeId && forceSet[cm.placeId]) return true;
      return tierOK(cm.tier, cm.placeId);
    }).map(function (cm) {
      /* 该标签锚定在哪个地点上（用于豁免自身核心） */
      var anchorId = cm.anchorId || null;
      var variants = buildLabelVariants(cm.html);
      /* tooltip 只绑定一次；后续候选只改 innerHTML 与样式偏移，
       * 反复 unbind/bindTooltip 会让 Leaflet 残留旧 tooltip DOM
       * （实测 28 个标签膨胀成 1883 个残留节点）。 */
      var tip = cm.marker.getTooltip();
      if (!tip) { cm.marker.bindTooltip(cm.html, { permanent: true, direction: 'right', offset: [16, 0], className: 'city-tip' }); tip = cm.marker.getTooltip(); }
      var te = tip.getElement();
      /* 兜底再打一次地点 id：tooltip 可能在首次 placeLabels 时才真正挂上 DOM，
       * 构造期的 setAttribute 会落空（诊断脚本靠它豁免自身核心重叠）。 */
      if (te && anchorId) te.setAttribute('data-place', anchorId);
      return { anchorId: anchorId, variants: variants, tipEl: te,
               tier: cm.tier || 1, placeId: cm.placeId || anchorId,
               force: !!(anchorId && forceSet[anchorId]), cm: cm };
    });
    /* 排序：L1 先占位（重要的先挑方位），同 tier 保持数据顺序（地名位置稳定，
     * 不会因为某次重算把两个同级标签的方位对调）。 */
    items2.sort(function (a, b) { return a.tier - b.tier; });

    /* 未入选的标签（分级不到 / 被路线筛掉）统一隐藏。不能只靠 CSS 的 opacity:0 ——
     * 它们仍会占着旧的绝对定位，视觉上像「幽灵标签」压着别人。 */
    var keepIds = {};
    items2.forEach(function (it) { if (it.placeId) keepIds[it.placeId] = 1; });
    lastItems.forEach(function (cm) {
      if (cm.placeId && keepIds[cm.placeId]) return;
      var t = cm.marker && cm.marker.getTooltip ? cm.marker.getTooltip() : null;
      var el = t && t.getElement ? t.getElement() : null;
      if (el) el.style.display = 'none';
    });

    /* 贪心初放（第一遍）——逐形态评估：先算每一档形态的最优候选，再按「信息量优先」挑选。
     * M3 踩坑（修法）：旧实现把形态优先级写成 tie 里的微权重
     *   `(variants.length - 1 - vi) * 0.001` —— vi 越大（信息越少）tie 越小，
     *   于是低信息形态只要 score 略低就被选中，实测 25 个标签【全部】退化成只剩地名，
     *   英文名与事件计数消失。修正为硬约束：
     *   1) 完整形态能零碰撞 → 直接采用，绝不降级；
     *   2) 否则依次尝试降级形态，取【最早能零碰撞】的那一档（保留最多信息）；
     *   3) 若没有任何形态能零碰撞 → 取重叠面积最小者（同分取信息量最大的一档）。 */
    items2.forEach(function (it, itIdx) {
      var viBests = [];
      for (var vi = 0; vi < it.variants.length; vi++) {
        var html = it.variants[vi].html;
        var viBest = null;
        for (var oi = 0; oi < LABEL_CANDIDATES.length; oi++) {
          var opt = LABEL_CANDIDATES[oi];
          it.tipEl.innerHTML = html;
          applyTipDirection(it.tipEl, opt[0], opt[1]);
          var r = it.tipEl.getBoundingClientRect();
          var score = labelConflict(r, obstacles, cores, it.anchorId, placed, -1);
          /* 同一档形态内部：同分时偏好少用过的方向（分散到不同侧） */
          var tie = (dirUsed[opt[0]] || 0) * 0.5;
          if (!viBest || score + tie < viBest.score + viBest.tie) {
            viBest = { score: score, tie: tie, dir: opt[0], off: opt[1], rect: r, html: html };
          }
        }
        viBests.push(viBest);
      }

      var best = viBests[0];
      /* 轻微重叠容差（M8）：score = 重叠面积(px²) + 越界面积×2。
       * 一个 12.5px 汉字的一角约 60–80px² —— 压住这点面积仍然读得出来，
       * 却能让密集区多显示好几个地名。旧实现只要 score > 0 就判「放不下」，
       * 实测 z6.5 时安纳托利亚一带把 10 个 L2 地点砍到只剩 2 个，放大等于没放大。
       * L1 容差更大：宁可重叠也不许消失。 */
      var TOL = it.tier > 1 ? 90 : 260;
      if (best && best.score > TOL) {
        var downgraded = null;
        for (var vj = 1; vj < viBests.length; vj++) {
          if (viBests[vj] && viBests[vj].score <= TOL) { downgraded = viBests[vj]; break; }
        }
        if (downgraded) best = downgraded;
        else {
          /* 所有形态 × 所有方位都有冲突 —— 旧实现到这里只能取「重叠面积最小者」，
           * 也就是任何标签【必须显示】。新增第三条路：
           *   · L2/L3 且非强制 → 隐藏（placed 记 null 占位，保持与 items2 索引对齐，
           *     否则后续 labelConflict 的 selfIdx 会全部错位）；
           *   · L1 或强制显示 → 仍取重叠最小者（宁可轻微重叠，也不能让主干城市没名字，
           *     更不能让用户 hover/选中的那个地点消失）。 */
          if (it.tier > 1 && !it.force) {
            it.tipEl.style.display = 'none';
            placed.push(null);
            return;
          }
          var minS = Infinity;
          for (var vk = 0; vk < viBests.length; vk++) {
            var cand = viBests[vk];
            if (cand && cand.score < minS) { minS = cand.score; best = cand; }
          }
        }
      }

      /* 落定：把内容与方位写回（不重新绑定，避免 tooltip DOM 泄漏） */
      it.tipEl.innerHTML = best.html;
      applyTipDirection(it.tipEl, best.dir, best.off);
      dirUsed[best.dir] = (dirUsed[best.dir] || 0) + 1;
      placed.push({ rect: best.rect, anchorId: it.anchorId, html: best.html, dir: best.dir, off: best.off });
    });

    /* 二次消解（退让式局部搜索）：贪心初放后仍冲突的标签允许换位/降级。
     * 密集区（安纳托利亚/叙利亚）先到先得常使后放标签在 9 个候选里全部重叠——
     * 这里迭代重选「9 候选 × 形态」中相对【当前完整布局】冲突最小者，只接受改进；
     * 正/反交替遍历防止尾部标签永不让位；至无改进收敛（轮数上限防抖）。
     * 同分时偏好高信息形态（vi 小者），避免为追零碰撞无谓丢掉英文名/事件计数。 */
    for (var iter = 0; iter < 6; iter++) {
      var moved = false;
      var order = items2.map(function (_, i) { return i; });
      if (iter % 2 === 1) order.reverse();
      for (var oi2 = 0; oi2 < order.length; oi2++) {
        var pi = order[oi2];
        var cur = placed[pi];
        /* 分级消隐的标签不参与二次消解 —— 它的隐藏是「当前缩放下不该显示」的
         * 分级结论，不是「暂时被挤掉」。硬把它拉回来会让密集区重新变糊。
         * 缩放变化会整体重算，那时它自然会重新入选。 */
        if (!cur) continue;
        var curScore = labelConflict(cur.rect, obstacles, cores, cur.anchorId, placed, pi);
        var bestAlt = null, bestScore = curScore, bestVi = -1;
        for (var vi2 = 0; vi2 < items2[pi].variants.length; vi2++) {
          for (var oi3 = 0; oi3 < LABEL_CANDIDATES.length; oi3++) {
            var opt2 = LABEL_CANDIDATES[oi3];
            items2[pi].tipEl.innerHTML = items2[pi].variants[vi2].html;
            applyTipDirection(items2[pi].tipEl, opt2[0], opt2[1]);
            var r2 = items2[pi].tipEl.getBoundingClientRect();
            var s2 = labelConflict(r2, obstacles, cores, cur.anchorId, placed, pi);
            if (s2 < bestScore || (s2 === bestScore && (bestVi < 0 || vi2 < bestVi))) {
              bestScore = s2; bestVi = vi2;
              bestAlt = { rect: r2, anchorId: cur.anchorId, html: items2[pi].variants[vi2].html, dir: opt2[0], off: opt2[1] };
            }
          }
        }
        if (bestAlt && (bestScore < curScore || (bestScore === curScore && bestAlt.html !== cur.html))) {
          placed[pi] = bestAlt;
          items2[pi].tipEl.innerHTML = bestAlt.html;
          applyTipDirection(items2[pi].tipEl, bestAlt.dir, bestAlt.off);
          moved = true;
        } else {
          /* 不接受移动：评估候选时 DOM 已被逐候选改写，必须恢复初放状态
           * （否则残留最后评估的候选位置，后续评估与最终截图都会错位）。 */
          items2[pi].tipEl.innerHTML = cur.html;
          applyTipDirection(items2[pi].tipEl, cur.dir, cur.off);
        }
      }
      if (!moved) break;
    }
  }

  /* 直接改 tooltip 元素的方位与偏移（Leaflet 的 direction/offset 由内联样式控制）。
   * 不重新绑定 —— 反复 unbind/bindTooltip 会残留旧 tooltip DOM。
   * 注意：Leaflet 的 .leaflet-tooltip-right 等 class 自带 margin（6px/12px），
   * 直接覆盖 margin 会破坏基础定位，故偏移改走 CSS 变量 --tx/--ty，
   * 由模板的 .city-tip 规则叠加。 */
  function applyTipDirection(el, dir, off) {
    if (!el) return;
    el.classList.remove('leaflet-tooltip-right', 'leaflet-tooltip-left',
                        'leaflet-tooltip-top', 'leaflet-tooltip-bottom');
    el.classList.add('leaflet-tooltip-' + dir);
    var x = off && off[0] ? off[0] : 0;
    var y = off && off[1] ? off[1] : 0;
    el.style.setProperty('--tx', x + 'px');
    el.style.setProperty('--ty', y + 'px');
  }

  /* 标签在某矩形位置上的冲突分：与静态障碍（事件点/上下文标记）、非自身地点核心
   * （权重 ×3）、以及其它已放置标签的重叠面积之和。selfIdx 用于排除自身。
   *
   * 2026-10-30（M9）：加入「越界」惩罚。此前只统计互相压叠，标签可以整个探到
   * 视口右缘外被裁掉（地图容器 overflow:hidden），也可以缩到面板/时间轴底下。
   * fit 收到的安全区（insets）正好就是「读者真正看得见」的那块，直接拿它当边界：
   * 越界面积 ×2 计入冲突分 —— 只要有别的方位能放得下，就不会选越界那一侧；
   * 全都放不下时仍按越界最少者落位（不会因为惩罚而丢标签）。 */
  function labelConflict(r, obstacles, cores, anchorId, placed, selfIdx) {
    var score = 0, i, ox, oy;
    var sz = map ? map.getSize() : { x: 1024, y: 768 };
    var box = { l: insets.l + 4, t: insets.t + 4, r: sz.x - insets.r - 4, b: sz.y - insets.b - 4 };
    if (r.left < box.l) score += (box.l - r.left) * r.height * 2;
    if (r.right > box.r) score += (r.right - box.r) * r.height * 2;
    if (r.top < box.t) score += (box.t - r.top) * r.width * 2;
    if (r.bottom > box.b) score += (r.bottom - box.b) * r.width * 2;
    for (i = 0; i < obstacles.length; i++) {
      ox = Math.min(r.right, obstacles[i].right) - Math.max(r.left, obstacles[i].left);
      oy = Math.min(r.bottom, obstacles[i].bottom) - Math.max(r.top, obstacles[i].top);
      if (ox > 0 && oy > 0) score += ox * oy;
    }
    for (i = 0; i < cores.length; i++) {
      if (anchorId && cores[i].id === anchorId) continue;
      ox = Math.min(r.right, cores[i].rect.right) - Math.max(r.left, cores[i].rect.left);
      oy = Math.min(r.bottom, cores[i].rect.bottom) - Math.max(r.top, cores[i].rect.top);
      if (ox > 0 && oy > 0) score += ox * oy * 1.5;   /* 压住城市核心的代价略高（×3 会让消解
                                                         把标签全部推离核心、彼此叠死） */
    }
    for (i = 0; i < placed.length; i++) {
      if (i === selfIdx || !placed[i]) continue;   /* null = 被分级消隐的标签，不占面积 */
      ox = Math.min(r.right, placed[i].rect.right) - Math.max(r.left, placed[i].rect.left);
      oy = Math.min(r.bottom, placed[i].rect.bottom) - Math.max(r.top, placed[i].rect.top);
      if (ox > 0 && oy > 0) score += ox * oy;
    }
    return score;
  }

  /* 标签形态降级序列：完整 → 去事件计数 → 去英文名 → 两者都去（只留地名）。
   * 每降一级占位更小，在密集区提高零碰撞的概率。 */
  function buildLabelVariants(html) {
    var out = [{ html: html }];
    if (typeof html !== 'string') return out;
    var noCnt = html.replace(/<span class="cnt">[\s\S]*?<\/span>/, '');
    if (noCnt !== html) out.push({ html: noCnt });
    var noEn = html.replace(/<div class="en">[\s\S]*?<\/div>/, '');
    if (noEn !== html) out.push({ html: noEn });
    var bare = noCnt.replace(/<div class="en">[\s\S]*?<\/div>/, '');
    if (bare !== noCnt && bare !== noEn) out.push({ html: bare });
    return out;
  }

  var api = {
    map: function () { return map; },
    flyTo: flyTo,
    lit: lit,
    clearLit: clearLit,
    ripple: ripple,
    placeLabels: placeLabels,
    /* 强制显示 / 取消强制显示某地点的标签（hover、选中地点、播放到达）。
     * 只打标记不重算 —— 调用方常在同一帧里连续标记多个地点，逐个重算会把
     * placeLabels 跑 N 次（每次 28 标签 × 9 方位 × 3 形态的 getBoundingClientRect）。
     * 标记完由调用方统一调一次 placeLabels。 */
    forceLabel: function (placeId, on) {
      if (!placeId) return;
      if (on) forceSet[placeId] = 1; else delete forceSet[placeId];
    },
    clearForced: function () { forceSet = {}; },
    /* 诊断 / 验收用：当前可见与隐藏的标签数、首屏基准 zoom。
     * 分级是否真的生效必须能读出来，不能靠截图数（截图数不出被裁在视口外的）。 */
    labelStats: function () {
      var vis = 0, hid = 0;
      lastItems.forEach(function (cm) {
        var t = cm.marker && cm.marker.getTooltip ? cm.marker.getTooltip() : null;
        var el = t && t.getElement ? t.getElement() : null;
        if (!el) return;
        if (el.style.display === 'none') hid++; else vis++;
      });
      return { visible: vis, hidden: hid, total: lastItems.length,
               zoom: map ? map.getZoom() : 0, base: baseZoom };
    },
    setLabelsVisible: function (v) { map.getContainer().classList.toggle('hide-labels', !v); },
    /* 更新安全区并（可选）重新适配视野。浮层尺寸变化后由调用方触发；
     * refit=false 只更新 padding（下次 fitBounds 生效），不动当前视野。 */
    setInsets: function (o, refit) {
      if (!o) return;
      insets = { t: o.t, r: o.r, b: o.b, l: o.l };
      clampInsets();
      if (refit === false || !map) return;
      var s = map.getSize();
      if (s.x < 200 || s.y < 120) return;   /* 布局中间态：fitBounds 会把 zoom 算爆 */
      map.invalidateSize();
      fitStory(false);
      clearTimeout(labelTimer);
      labelTimer = setTimeout(function () { if (lastItems.length) placeLabels(lastItems, lastObstacleSel); }, 180);
    },
    insets: function () { return { t: insets.t, r: insets.r, b: insets.b, l: insets.l }; },
    fits: function () { return fitLog.slice(); },
    /* 把「故事范围」临时改成某个子范围（M8：选中一段旅程时只框住这段旅程）。
     * 后续所有 fitStory（resize / inset 变化）都会以它为基准，直到 resetView 复原。 */
    setFit: function (b, animate, durMs) {
      if (!b) return;
      lastFit = b;
      fitStory(!!animate, durMs);
    },
    fitBounds: function () { return lastFit; },
    resetView: function (durMs) {
      if (storyFit) lastFit = storyFit;   /* 复原为全故事范围（选中旅程后取消筛选） */
      fitStory(true, durMs);
    },
    /* 当前视野是否已覆盖故事范围（供「开播前才落位」判断） */
    coversStory: function () {
      if (!lastFit) return true;
      var b = map.getBounds();
      return b.contains(lastFit[0]) && b.contains(lastFit[1]);
    }
  };
  return { init: init };
})();
