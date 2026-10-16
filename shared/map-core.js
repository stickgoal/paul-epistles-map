/* GS.mapCore — 地图基底（与 paul-epistles-map 共用）：
 * Leaflet 初始化、地中海 GeoJSON 底图、经纬网、两段式飞行定位、地点点亮/涟漪、城市标签自动避位。
 * 由 build.mjs 内联进单文件；不依赖任何外部状态。 */
window.GS = window.GS || {};
GS.mapCore = (function () {
  'use strict';

  var map = null, glowMarker = null, litTimer = null;
  var lastItems = [], lastObstacleSel = '.place .core, .place .ev-dot, .ctx';
  var labelTimer = null, lastLabelZoom = 0;

  var FIT = [[27.6, -11.8], [47.8, 44.2]];
  var LABEL_CANDIDATES = [
    ['right', [14, 0]], ['right', [14, -12]],
    ['left', [-14, 0]], ['left', [-14, 12]],
    ['bottom', [0, 14]], ['bottom', [0, 22]],
    ['top', [0, -14]], ['top', [0, -42]],
    ['bottom', [0, 66]]
  ];

  function init(opts) {
    opts = opts || {};
    map = L.map('map', {
      zoomControl: false, attributionControl: false,
      minZoom: 3, maxZoom: 10, zoomSnap: .5, wheelPxPerZoomLevel: 140
    });
    map.fitBounds(opts.fit || FIT, { padding: [26, 26], animate: false });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 120 }).addTo(map);

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

    lastLabelZoom = map.getZoom();
    map.on('moveend', function () {
      if (map.getZoom() === lastLabelZoom) return; /* 平移不改变相对布局，仅缩放后重算 */
      lastLabelZoom = map.getZoom();
      clearTimeout(labelTimer);
      labelTimer = setTimeout(function () { if (lastItems.length) placeLabels(lastItems, lastObstacleSel); }, 180);
    });

    return api;
  }

  /* 两段式飞行：目标比当前视角高 1.2 级以上时，先略退再俯冲，形成电影感 */
  function flyTo(ll, zoom, dur) {
    dur = dur || 1;
    var z = map.getZoom();
    if (zoom - z > 1.2) {
      map.flyTo(ll, Math.max(z + 0.3, zoom - 1.9), { duration: dur * 0.62 });
      setTimeout(function () { map.flyTo(ll, zoom, { duration: dur * 0.55 }); }, dur * 620);
    } else {
      map.flyTo(ll, zoom, { duration: dur });
    }
  }

  function clearLit() {
    clearTimeout(litTimer);
    if (glowMarker) { map.removeLayer(glowMarker); glowMarker = null; }
  }

  /* 点亮某坐标：柔光 + 双重涟漪（keep=true 持续到 clearLit） */
  function lit(ll, color, keep) {
    color = color || '#c2593f';
    clearLit();
    var icon = L.divIcon({
      className: 'fx-ic',
      html: '<div class="fx-glow" style="--c:' + color + '"></div>',
      iconSize: [150, 150], iconAnchor: [75, 75]
    });
    glowMarker = L.marker(ll, { icon: icon, interactive: false, zIndexOffset: 600 }).addTo(map);
    ripple(ll, color);
    setTimeout(function () { ripple(ll, color); }, 420);
    if (!keep) litTimer = setTimeout(clearLit, 3400);
  }

  /* 地图原生涟漪圈：从坐标向外扩散后消散 */
  function ripple(ll, color) {
    color = color || '#c2593f';
    var ring = L.circleMarker(ll, { radius: 4, color: color, weight: 1.5, opacity: .5, fill: false, interactive: false }).addTo(map);
    var t0 = performance.now();
    (function grow(t) {
      var p = Math.min(1, (t - t0) / 1500);
      if (p >= 1) { map.removeLayer(ring); return; }
      var e = 1 - Math.pow(1 - p, 2.4);
      ring.setRadius(4 + e * 62);
      ring.setStyle({ opacity: .5 * (1 - p) });
      requestAnimationFrame(grow);
    })(t0);
  }

  /* 标签自动避位：在候选方位中为每个标签选择与障碍物（标记/圆点/其他标签）零碰撞的位置。
   * items: [{ marker, html }]；obstacleSel: 参与碰撞的 DOM 选择器。缩放后自动重算。 */
  function placeLabels(items, obstacleSel) {
    lastItems = items || [];
    lastObstacleSel = obstacleSel || lastObstacleSel;
    document.body.classList.add('measuring');
    var obstacles = [];
    document.querySelectorAll(lastObstacleSel).forEach(function (elm) {
      var r = elm.getBoundingClientRect();
      if (r.width > 0) obstacles.push(r);
    });
    document.body.classList.remove('measuring');
    var placed = [];
    lastItems.forEach(function (cm) {
      var best = null;
      LABEL_CANDIDATES.forEach(function (opt) {
        cm.marker.unbindTooltip();
        cm.marker.bindTooltip(cm.html, { permanent: true, direction: opt[0], offset: opt[1], className: 'city-tip' });
        var r = cm.marker.getTooltip().getElement().getBoundingClientRect();
        var score = 0;
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          var ox = Math.min(r.right, o.right) - Math.max(r.left, o.left);
          var oy = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top);
          if (ox > 0 && oy > 0) score += ox * oy;
        }
        for (var j = 0; j < placed.length; j++) {
          var p = placed[j];
          var ox2 = Math.min(r.right, p.right) - Math.max(r.left, p.left);
          var oy2 = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
          if (ox2 > 0 && oy2 > 0) score += ox2 * oy2;
        }
        if (!best || score < best.score) best = { score: score, dir: opt[0], off: opt[1], rect: r };
      });
      cm.marker.unbindTooltip();
      cm.marker.bindTooltip(cm.html, { permanent: true, direction: best.dir, offset: best.off, className: 'city-tip' });
      placed.push(best.rect);
    });
  }

  var api = {
    map: function () { return map; },
    flyTo: flyTo,
    lit: lit,
    clearLit: clearLit,
    ripple: ripple,
    placeLabels: placeLabels,
    setLabelsVisible: function (v) { map.getContainer().classList.toggle('hide-labels', !v); },
    resetView: function () { map.flyToBounds(FIT, { padding: [26, 26], duration: .9 }); }
  };
  return { init: init };
})();
