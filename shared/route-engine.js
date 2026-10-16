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
    applyTime(getYear());
  }

  /* 时间驱动：future 尚未出发（隐藏） / now 正在行进（全亮+流光+光点） / past 已完成（暗淡保留） */
  function applyTime(y) {
    routes.forEach(function (j) {
      if (!j.drawn) return;
      var st, p;
      if (y < j.from) { st = 'future'; p = 0; }
      else if (y > j.to) { st = 'past'; p = 1; }
      else { st = 'now'; p = (y - j.from) / (j.to - j.from); }
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

  /* 旅程重播动画：光点沿路径行进，留下拖尾 */
  var travel = { marker: null, trail: null, raf: 0, timer: 0, active: null };
  function cancelTravel() {
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
    var path = j.path, N = path.length, dur = 9000, t0 = performance.now();
    (function frame(t) {
      var p = Math.min(1, (t - t0) / dur);
      var idx = Math.floor(p * (N - 1));
      if (travel.marker) travel.marker.setLatLng(path[idx]);
      if (travel.trail) travel.trail.setLatLngs(path.slice(0, idx + 1));
      if (p < 1 && travel.active === j) travel.raf = requestAnimationFrame(frame);
      else { travel.timer = setTimeout(function () { if (travel.active === j) { cancelTravel(); if (done) done(); } }, 1500); }
    })(t0);
  }

  var api = {
    draw: draw,
    drawAll: function (staggerMs, cb) {
      routes.forEach(function (j, i) { setTimeout(function () { draw(j); if (cb) cb(j); }, i * (staggerMs || 0)); });
    },
    applyTime: applyTime,
    replay: replay,
    cancelTravel: cancelTravel,
    byId: function (id) { return byId[id]; },
    all: function () { return routes; }
  };
  return { init: init, api: api };
})();
