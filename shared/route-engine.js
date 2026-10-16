/* GS.routeEngine — 旅程路线引擎（与 paul-epistles-map 共用 + 扩展）：
 * 平滑路径、累计里程、按年代逐段点亮（future/now/past 三态）、路线行进光点、旅程重播动画。
 * stops 形如 [{ cn, ll:[lat,lng] }]；由 build.mjs 内联进单文件。 */
window.GS = window.GS || {};
GS.routeEngine = (function () {
  'use strict';

  var layer = null, getYear = function () { return 0; }, onState = null, routes = [], byId = {};

  function smoothPath(pts, seg) {
    seg = seg || 16;
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      var m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      for (var s = 1; s <= seg; s++) {
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
    j.drawn = true;
    var path = smoothPath(j.stops.map(function (s) { return s.ll; }));
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
   * now 态进度优先用事件驱动值 j.hold（播放中由 seek 设置），否则按年份线性映射（拖拽时间轴）。 */
  function applyTime(y) {
    routes.forEach(function (j) {
      if (!j.drawn) return;
      var st, p;
      if (y < j.from) { st = 'future'; p = 0; }
      else if (y > j.to) { st = 'past'; p = 1; }
      else { st = 'now'; p = (j.hold != null) ? j.hold : yearP(j, y); }
      var target = p * j.total, k = 0;
      while (k < j.cum.length - 1 && j.cum[k + 1] <= target) k++;
      var sig = st + '|' + k;
      if (j.sig === sig) return; /* 年代变化但路段索引未变，无需重绘 */
      j.sig = sig;
      var show = st !== 'future';
      var pts = show ? j.path.slice(0, k + 1) : [j.path[0]];
      j.base.setLatLngs(pts);
      j.flow.setLatLngs(pts);
      j.baseEl.style.opacity = st === 'now' ? .95 : st === 'past' ? .42 : .12;
      j.flowEl.style.opacity = st === 'now' ? .5 : st === 'past' ? .26 : 0;
      j.flowEl.style.animationPlayState = st === 'now' ? 'running' : 'paused';
      for (var i = 0; i < j.dots.length; i++) {
        var vis = show && j.dist[i] <= target + 1e-6;
        j.dots[i].setStyle({ opacity: vis ? 1 : 0, fillOpacity: vis ? 1 : 0 });
      }
      if (st === 'now') {
        if (!j.headOn) { j.head.addTo(layer); j.headOn = true; }
        j.head.setLatLng(j.path[k]);
      } else if (j.headOn) { layer.removeLayer(j.head); j.headOn = false; }
      if (onState) onState(j, st);
    });
  }

  /* 事件驱动描线：把路线进度推到 ev 对应站点（place id 匹配 stops.p）。
   * 同一地点出现多次时（去程/回程），取「当前进度之后」的最近站点——
   * 回访事件因此自然落到回程段；无匹配（地点不在该旅程上）则保持当前进度。
   * dur > 0 时补间渐变（沿线"画"过去），dur = 0 即瞬移（拖拽/步进场景）。 */
  var seekRaf = 0;
  function cancelSeek() { if (seekRaf) { cancelAnimationFrame(seekRaf); seekRaf = 0; } }

  function seek(ev, dur) {
    if (!ev || !ev.place) return;
    cancelSeek();
    var plan = [];
    routes.forEach(function (j) {
      if (!j.drawn || !j.stopInfo) return;
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
    if (!plan.length) return;

    if (!(dur > 0)) {
      plan.forEach(function (x) { x.j.hold = x.to; });
      applyTime(getYear());
      return;
    }
    /* 只前进不后退：回程事件若落在已描线之后则前进，否则直接定位 */
    var t0 = performance.now();
    (function frame(t) {
      var p = Math.min(1, (t - t0) / dur);
      var e = p < 1 ? 1 - Math.pow(1 - p, 3) : 1;   /* easeOutCubic：起步快、收尾稳 */
      plan.forEach(function (x) {
        var tgt = x.from + (x.to - x.from) * e;
        x.j.hold = (x.to > x.from) ? Math.max(x.from, tgt) : x.to;
      });
      applyTime(getYear());
      if (p < 1) seekRaf = requestAnimationFrame(frame);
      else seekRaf = 0;
    })(t0);
  }

  /* 解除事件驱动，恢复年份线性映射（拖拽 / 步进 / 章节跳转时由调用方触发） */
  function release() {
    cancelSeek();
    routes.forEach(function (j) { j.hold = null; });
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
  }
  function replay(j, done) {
    cancelTravel();
    draw(j);
    travel.active = j;
    var icon = L.divIcon({ className: 'travel-ic', html: '<div class="td" style="--c:' + j.color + '"></div>', iconSize: [15, 15], iconAnchor: [7.5, 7.5] });
    travel.marker = L.marker(j.path[0], { icon: icon, interactive: false, zIndexOffset: 1000 }).addTo(layer);
    travel.trail = L.polyline([j.path[0]], { color: j.color, weight: 3, opacity: .95, lineCap: 'round', interactive: false }).addTo(layer);
    var path = j.path, N = path.length, dur = 15000, t0 = performance.now();
    (function frame(t) {
      var p = Math.min(1, (t - t0) / dur);
      var idx = Math.floor(p * (N - 1));
      if (travel.marker) travel.marker.setLatLng(path[idx]);
      if (travel.trail) travel.trail.setLatLngs(path.slice(0, idx + 1));
      if (p < 1 && travel.active === j) travel.raf = requestAnimationFrame(frame);
      else { travel.timer = setTimeout(function () { if (travel.active === j) { cancelTravel(); if (done) done(); } }, 2200); }
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
    cancelTravel: cancelTravel,
    cancelSeek: cancelSeek,
    byId: function (id) { return byId[id]; },
    all: function () { return routes; }
  };
  return { init: init, api: api };
})();
