/* GS.routeEngine — 旅程路线引擎（与 paul-epistles-map 共用 + 扩展）：
 * 平滑路径、累计里程、按年代逐段点亮（future/now/past 三态）、路线行进光点、旅程重播动画。
 * stops 形如 [{ cn, ll:[lat,lng] }]；由 build.mjs 内联进单文件。 */
window.GS = window.GS || {};
GS.routeEngine = (function () {
  'use strict';

  var layer = null, getYear = function () { return 0; }, onState = null, routes = [], byId = {};
  /* 路线聚焦（M8）：选中某段旅程时，其余路线整体隐去（含站点圆点与行进光点）。
   * 不能只靠 CSS 类，因为 applyTime 每帧都直接写 style.opacity —— 会覆盖类样式。 */
  var focusId = null;
  /* 全貌模式（M10，2026-11-05）：用户选「看全貌」后，所有旅程【整段】静态铺开，
   * 不再受当前年份（首屏 AD 46 会让 j2…j5 判成 future 而整条消失）、路线聚焦
   * 或 pin 定格影响。与 applyTime 的常规分支互斥，退出时把 sig 全清强制重算。 */
  var overviewMode = false;

  /* 中点二次贝塞尔平滑，但曲线必须【精确穿过每个站点】：
   * 旧实现整段用 Q(m1, b, m2)，最近点只到 b + (a+c-2b)/8 ——
   * 帕弗→别加→彼西底的安提阿这一角实测偏离约 0.26°（≈29km），
   * 路线明显不经过地点标记，描线头/相机落点与城市圆点肉眼错开。
   * 修法：在 seg 中点处直接写入站点坐标 b（该点两侧各一段二次贝塞尔，
   * 站点处形成一个可感知的「转角」，地图尺度下不可见，但路线严格过点）。
   * seg 必须为偶数；首尾点原样保留（Q 曲线端点即站点，本就精确）。 */
  function smoothPath(pts, seg) {
    seg = seg || 16;
    var half = Math.round(seg / 2);
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      var m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      for (var s = 1; s <= seg; s++) {
        if (s === half) { out.push([b[0], b[1]]); continue; }   /* 精确穿过站点 */
        var t = s / seg, u = 1 - t;
        out.push([u * u * m1[0] + 2 * u * t * b[0] + t * t * m2[0], u * u * m1[1] + 2 * u * t * b[1] + t * t * m2[1]]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function init(opts) {
    layer = opts.layer;
    routes = opts.routes || [];
    getYear = opts.getYear || getYear;
    onState = opts.onState || null;
    routes.forEach(function (j) { byId[j.id] = j; });
    return api;
  }

  /* 绘制一段旅程；完成后按当前年代点亮 */
  function draw(j) {
    if (j.drawn) return;
    var path = smoothPath(j.stops.map(function (s) { return s.ll; }));
    /* 先算路径再置 drawn：若 smoothPath 抛错或返回空，旧实现在置了 drawn 之后
     * 就永久处于「已画但无路径」的坏状态 —— 后续 replay 拿到空 path，
     * idx 恒越界。宁可这次不画，也不要留下半成品状态。 */
    if (!path || !path.length) return;
    j.drawn = true;
    j.path = path;
    var cum = [0];
    for (var i = 1; i < path.length; i++) {
      var dx = path[i][1] - path[i - 1][1], dy = path[i][0] - path[i - 1][0];
      cum.push(cum[cum.length - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    j.cum = cum;
    j.total = cum[cum.length - 1];
    j.base = L.polyline(path, { color: j.color, weight: 2.2, opacity: .85, lineCap: 'round', interactive: false }).addTo(layer);
    j.flow = L.polyline(path, { color: j.color, weight: 2.6, opacity: .45, dashArray: '2 12', lineCap: 'round', interactive: false }).addTo(layer);
    j.baseEl = j.base.getElement();
    j.flowEl = j.flow.getElement();
    j.flowEl.classList.add('route-flow');
    j.dots = []; j.dist = [];
    j.stops.forEach(function (pt, i) {
      var end = (i === 0 || i === j.stops.length - 1);
      j.dots.push(L.circleMarker(pt.ll, { radius: end ? 3.4 : 2.2, color: j.color, weight: end ? 1.8 : 1.4, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(layer));
      var best = 0, bd = Infinity;
      for (var s = 0; s < path.length; s++) {
        var ddx = path[s][1] - pt.ll[1], ddy = path[s][0] - pt.ll[0], d2 = ddx * ddx + ddy * ddy;
        if (d2 < bd) { bd = d2; best = s; }
      }
      j.dist.push(cum[best]);
    });
    j.head = L.marker(path[0], {
      icon: L.divIcon({ className: 'rh-ic', html: '<div class="rh" style="--c:' + j.color + '"></div>', iconSize: [13, 13], iconAnchor: [6.5, 6.5] }),
      interactive: false, zIndexOffset: 900
    });
    j.headOn = true;
    j.sig = '';
    j.stopInfo = j.stops.map(function (s, i) { return { p: s.p || null, d: j.dist[i] }; });
    applyTime(getYear());
  }

  /* 年份线性进度（拖拽时间轴时使用） */
  function yearP(j, y) {
    if (y < j.from) return 0;
    if (y > j.to) return 1;
    return (y - j.from) / (j.to - j.from);
  }

  /* 时间驱动：future 尚未出发（隐藏） / now 正在行进（全亮+流光+光点） / past 已完成（暗淡保留）
   * now 态进度优先用事件驱动值 j.hold（播放中由 seek 设置），否则按年份线性映射（拖拽时间轴）。
   * j.pin（2026-11-02 用户需求「选中旅程播放完成后停止在结束状态」）优先级最高：
   * 它表示「这段旅程已经整段放完，定格在终点」，与当前年份无关。 */
  function applyTime(y) {
    routes.forEach(function (j) {
      if (!j.drawn) return;
      /* 全貌：所有路线画满、全部站点亮起、不挂行进光点、流光静止。
       * 不能在常规分支里靠「把年份推到最晚」实现 —— 那样 past 态只有 .42 不透明度，
       * 五条线挤在一起会灰成一片，且 pin 定格仍会随年份被 release 冲掉。 */
      if (overviewMode) {
        if (j.sig === 'overview') return;
        j.sig = 'overview';
        j.base.setLatLngs(j.path);
        j.flow.setLatLngs(j.path);
        j.baseEl.style.opacity = .88;
        j.flowEl.style.opacity = .28;
        j.flowEl.style.animationPlayState = 'paused';
        for (var oi = 0; oi < j.dots.length; oi++) {
          j.dots[oi].setStyle({ opacity: 1, fillOpacity: 1 });
        }
        if (j.headOn) { layer.removeLayer(j.head); j.headOn = false; }
        if (onState) onState(j, 'overview');   /* 'overview' 不匹配 now/past/future ⇒ 图例行回到常态 */
        return;
      }
      var st, p;
      if (j.pin) { st = 'now'; p = 1; }
      else if (y < j.from) { st = 'future'; p = 0; }
      else if (y > j.to) { st = 'past'; p = 1; }
      else { st = 'now'; p = (j.hold != null) ? j.hold : yearP(j, y); }
      var dim = !!focusId && j.id !== focusId;
      var target = p * j.total, k = 0;
      while (k < j.cum.length - 1 && j.cum[k + 1] <= target) k++;
      var sig = st + '|' + k + '|' + (dim ? 'd' : 'n');
      if (j.sig === sig) return; /* 年代变化但路段索引未变，无需重绘 */
      j.sig = sig;
      var show = st !== 'future' && !dim;
      var pts = show ? j.path.slice(0, k + 1) : [j.path[0]];
      j.base.setLatLngs(pts);
      j.flow.setLatLngs(pts);
      j.baseEl.style.opacity = dim ? 0 : st === 'now' ? .95 : st === 'past' ? .42 : .12;
      j.flowEl.style.opacity = dim ? 0 : st === 'now' ? .5 : st === 'past' ? .26 : 0;
      j.flowEl.style.animationPlayState = st === 'now' && !dim && !j.pin ? 'running' : 'paused';
      for (var i = 0; i < j.dots.length; i++) {
        var vis = show && j.dist[i] <= target + 1e-6;
        j.dots[i].setStyle({ opacity: vis ? 1 : 0, fillOpacity: vis ? 1 : 0 });
      }
      if (st === 'now' && !dim) {
        if (!j.headOn) { j.head.addTo(layer); j.headOn = true; }
        j.head.setLatLng(j.path[k]);
      } else if (j.headOn) { layer.removeLayer(j.head); j.headOn = false; }
      if (onState) onState(j, st);
    });
  }

  /* 切换全貌模式。进入时收掉重播动画与定格态，退出时强制下一帧按年份重算。 */
  function setOverview(on) {
    overviewMode = !!on;
    if (overviewMode) {
      cancelTravel();
      routes.forEach(function (j) { j.hold = null; j.pin = 0; j.sig = ''; });
    } else {
      routes.forEach(function (j) { j.sig = ''; });
    }
    applyTime(getYear());
  }

  /* 聚焦一段旅程（null = 取消聚焦）。只改渲染，不动数据与进度。 */
  function focus(id) {
    focusId = id || null;
    routes.forEach(function (j) { j.sig = ''; });   /* 强制下一帧全量重算（sig 含 dim 位） */
    applyTime(getYear());
  }

  /* 事件驱动描线：把路线进度推到 ev 对应站点（place id 匹配 stops.p）。
   * 同一地点出现多次时（去程/回程），取「当前进度之后」的最近站点——
   * 回访事件因此自然落到回程段；无匹配（地点不在该旅程上）则保持当前进度。
   * dur > 0 时补间渐变（沿线"画"过去），dur = 0 即瞬移（拖拽/步进场景）。
   *
   * onFrame(headLatLng, t, plan)：逐帧回调，t ∈ [0,1] 为缓动后进度。
   * 这是「相机与描线同一时钟」的接缝 —— 描线每推进一帧，相机就用同一个 ll
   * 重新定位，两者不可能再错拍。此前相机只在事件前后各自 flyTo 一次，
   * 与 2.2s 的描线补间完全独立，因此用户看到「线在走、镜头不动」。 */
  var seekRaf = 0;
  function cancelSeek() { if (seekRaf) { cancelAnimationFrame(seekRaf); seekRaf = 0; } }

  /* 路径上按里程取插值点（比直接取 path[k] 平滑，相机跟随才不会一顿一顿） */
  function pointAt(j, dist) {
    var target = Math.max(0, Math.min(j.total, dist));
    var k = 0;
    while (k < j.cum.length - 2 && j.cum[k + 1] <= target) k++;
    var seg = j.cum[k + 1] - j.cum[k];
    var u = seg > 0 ? (target - j.cum[k]) / seg : 0;
    return [j.path[k][0] + (j.path[k + 1][0] - j.path[k][0]) * u,
            j.path[k][1] + (j.path[k + 1][1] - j.path[k][1]) * u];
  }

  function seek(ev, dur, onFrame) {
    if (!ev || !ev.place) return;
    cancelSeek();
    var plan = [];
    routes.forEach(function (j) {
      if (!j.drawn || !j.stopInfo) return;
      /* 章节闸门（2026-10-26 修）：事件只驱动【本章所属】的旅程。
       * 旧实现只按地点匹配，于是 M1 的「耶路撒冷会议」（ch1，place=jerusalem）
       * 会同时命中 j2/j3 的耶路撒冷站点，把第二次、第三次旅程的线在 AD 49
       * 就一路画到耶路撒冷——线跨了旅程，故事就乱了。
       * 路线未标 ch 时退回旧行为（按地点匹配），保持向后兼容。 */
      if (j.ch && ev.ch && j.ch !== ev.ch) return;
      var cands = [];
      for (var s = 0; s < j.stopInfo.length; s++) {
        if (j.stopInfo[s].p === ev.place) cands.push(j.stopInfo[s]);
      }
      if (!cands.length) return;
      var from = (j.hold != null) ? j.hold : yearP(j, getYear());
      var cur = from * j.total;
      var pick = null;
      for (var c = 0; c < cands.length; c++) {
        if (cands[c].d >= cur - 1e-6) { pick = cands[c]; break; }
      }
      if (!pick) pick = cands[cands.length - 1];
      plan.push({ j: j, from: from, to: pick.d / j.total });
    });
    if (!plan.length) { if (onFrame) onFrame(ev.ll, 1, []); return; }

    if (!(dur > 0)) {
      plan.forEach(function (x) { x.j.hold = x.to; });
      applyTime(getYear());
      /* dur = 0 是「步进」场景：相机由调用方直接 flyTo 定位，不参与跟帧 */
      return;
    }
    /* 只前进不后退：回程事件若落在已描线之后则前进，否则直接定位。
     * 主路线 = 本次推进里程最长的那段，相机跟随它（多段并行时的视觉主角）。 */
    var main = plan[0];
    plan.forEach(function (x) {
      if (Math.abs(x.to - x.from) > Math.abs(main.to - main.from)) main = x;
    });
    var t0 = performance.now();
    (function frame(t) {
      /* 同 replay：rAF timestamp 是帧开始时刻，可能早于 t0 ⇒ p 可能为负，
       * 负的 e 会让 tgt 越过 from（描线倒退一帧再回来，观感是一次抖动）。 */
      var p = Math.min(1, Math.max(0, (t - t0) / dur));
      var e = p < 1 ? 1 - Math.pow(1 - p, 3) : 1;   /* easeOutCubic：起步快、收尾稳 */
      plan.forEach(function (x) {
        var tgt = x.from + (x.to - x.from) * e;
        x.j.hold = (x.to > x.from) ? Math.max(x.from, tgt) : x.to;
      });
      applyTime(getYear());
      if (onFrame) onFrame(pointAt(main.j, main.j.hold * main.j.total), e, plan);
      if (p < 1) seekRaf = requestAnimationFrame(frame);
      else seekRaf = 0;
    })(t0);
  }

  /* 解除事件驱动，恢复年份线性映射（拖拽 / 步进 / 章节跳转时由调用方触发） */
  function release() {
    cancelSeek();
    routes.forEach(function (j) { j.hold = null; j.pin = 0; j.sig = ''; });
  }

  /* 定格某段旅程的「结束状态」（2026-11-02 用户需求）：
   * 旅程重播放完后必须停在终点，而不是把光点与拖尾一撤、路线回落到按年份的进度
   * ——选 j2（AD 49–52）时当前年份往往还停在 AD 46，回落之后整条线直接不见。
   * 只写 hold 不够：applyTime 的状态由年份决定，y < j.from 会把 hold 判成 future。
   * 故用独立标记 pin，让 applyTime 无视年份把它当「正在行进且 p = 1」。 */
  function pinEnd(id) {
    routes.forEach(function (j) { j.pin = j.id === id ? 1 : 0; j.sig = ''; });
    applyTime(getYear());
  }

  /* 旅程重播动画：光点沿路径行进，留下拖尾 */
  var travel = { marker: null, trail: null, raf: 0, timer: 0, active: null };
  function cancelTravel() {
    cancelSeek();
    cancelAnimationFrame(travel.raf);
    clearTimeout(travel.timer);
    if (travel.marker) { travel.marker._map && travel.marker._map.removeLayer(travel.marker); travel.marker = null; }
    if (travel.trail) { travel.trail._map && travel.trail._map.removeLayer(travel.trail); travel.trail = null; }
    travel.active = null;
    /* 换旅程 / 取消聚焦 / 重置都要把定格态一并撤销，否则上一段线会赖在图上。
     * 撤销后必须重算一次：pin 变了但 DOM 还是「整段描完」的样子。 */
    var hadPin = false;
    routes.forEach(function (j) { if (j.pin) hadPin = true; j.pin = 0; j.sig = ''; });
    if (hadPin) applyTime(getYear());
  }
  function replay(j, done, durMs) {
    cancelTravel();
    draw(j);
    travel.active = j;
    var icon = L.divIcon({ className: 'travel-ic', html: '<div class="td" style="--c:' + j.color + '"></div>', iconSize: [15, 15], iconAnchor: [7.5, 7.5] });
    travel.marker = L.marker(j.path[0], { icon: icon, interactive: false, zIndexOffset: 1000 }).addTo(layer);
    travel.trail = L.polyline([j.path[0]], { color: j.color, weight: 3, opacity: .95, lineCap: 'round', interactive: false }).addTo(layer);
    var path = j.path, N = path.length, dur = durMs > 0 ? durMs : 15000, t0 = performance.now();
    (function frame(t) {
      /* p 必须双向夹取：rAF 回调的 timestamp 是【帧开始时刻】，可能早于本次
       * JS 执行时取的 t0（实测点选旅程时 p 为负，idx = floor(负 * 209) = 负数，
       * path[负数] 是 undefined，setLatLng(undefined) 抛
       * "Cannot read properties of undefined (reading 'lat')"，
       * 且每帧抛一次 —— 4 次异常就是这么来的）。 */
      var p = Math.min(1, Math.max(0, (t - t0) / dur));
      var idx = Math.max(0, Math.min(N - 1, Math.floor(p * (N - 1))));
      if (travel.marker && path[idx]) travel.marker.setLatLng(path[idx]);
      if (travel.trail) travel.trail.setLatLngs(path.slice(0, idx + 1));
      if (p < 1 && travel.active === j) travel.raf = requestAnimationFrame(frame);
      else {
        /* 到位后先让光点在终点停一拍（1.2s），再把光点与拖尾收走、
         * 把路线本体定格成整段描完 —— 视觉上无缝（拖尾与本体同色同走向）。 */
        travel.timer = setTimeout(function () {
          if (travel.active !== j) return;
          cancelTravel();
          pinEnd(j.id);
          if (done) done();
        }, 1200);
      }
    })(t0);
  }

  var api = {
    draw: draw,
    drawAll: function (staggerMs, cb) {
      routes.forEach(function (j, i) { setTimeout(function () { draw(j); if (cb) cb(j); }, i * (staggerMs || 0)); });
    },
    applyTime: applyTime,
    seek: seek,
    release: release,
    replay: replay,
    pinEnd: pinEnd,
    pinned: function () {
      return routes.filter(function (j) { return !!j.pin; }).map(function (j) { return j.id; });
    },
    focus: focus,
    setOverview: setOverview,
    isOverview: function () { return overviewMode; },
    cancelTravel: cancelTravel,
    cancelSeek: cancelSeek,
    byId: function (id) { return byId[id]; },
    all: function () { return routes; }
  };
  return { init: init, api: api };
})();
