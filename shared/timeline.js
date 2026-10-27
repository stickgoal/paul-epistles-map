/* GS.timeline — 时间轴控件（与 paul-epistles-map 共用 + 事件调度扩展）：
 * 年代轨道、章节色带、事件圆点、拖拽/键盘、播放按钮状态；
 * playEvents() 为事件序列播放器：光标逐事件推进 → 到达回调 → 停留 → 下一事件。
 * 不持有任何应用数据；所有渲染元素由调用方通过 els 传入。 */
window.GS = window.GS || {};
GS.timeline = (function () {
  'use strict';

  var cfg = {}, els = {}, state = { year: 0, playing: false };
  var seq = { raf: 0, timer: 0, active: false };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ══════════ 簇排布算法（与 .workbuddy/timeline-research/sim-timeline8.mjs 同构）══════════
   *
   * 同一年（from 相同）的事件聚成一个「簇」：cols 列 × rows 行的紧凑网格，
   * 列优先填充（先竖后横）⇒ 簇「窄而高」，横向跨度小 ⇒ 时间语义得以保留。
   *
   *   cols = min(colsCap, n)      宽度上限（colsCap 是关键旋钮，运行期遍历择优）
   *   rows = ceil(n / cols)       行数由列数反推 ⇒ cols*rows ≥ n 恒成立（零静默丢点）
   *
   * 列优先填充下，第 r 行的实际横向跨度 = ceil((n-r)/rows) 列 ⇒ 越往下行越窄。
   * 层（layer）冲突判定【按每行的实际墨迹区间】判定（不是整簇矩形）：
   * 用整簇矩形过于保守，会把本可并排的簇强行分层 ⇒ 层数虚增。
   * 按年份顺序贪心 first-fit：找最低的、其所有层都不与既有墨迹交叠的起始层；
   * 找不到就开新层（保证层内零重叠 ⇒ 圆点几何上不可能相交）。
   *
   * 择优：硬约束簇横向跨度 spanY ≤ SPAN_MAX（年）——否则簇侵入邻年位置，
   * 读者会误以为邻年也有事件；满足硬约束者中取轨道高最小者；
   * 无一满足（极窄轨）时退而取跨度最小者。
   *
   * 〔为什么 cols 要在运行期搜索〕簇墨迹宽 = (cols-1)×pitch + D，与「一年的像素宽」
   * 同量级时才会互相侵入邻年。固定 cols 档位表在某些宽度上会层数跳变
   * （例：D12/c5 在 W=804 是 8 层、W=1204 是 4 层），故按实际轨道宽遍历候选。
   * 〔旧实现的问题〕逐点贪心：同年圆点水平错位 ±7px，但错位步长(7) <
   * 碰撞阈值(D+1=13) ⇒ 行内根本放不下第二个点，同年事件只能靠换行堆开，
   * M3 的 84 个事件（AD57 单年 19 个）把轨道撑到 8 行 / 125px。 */
  var AXIS_Y = 15;                 /* 轨道轴线中心（.tl-rail / .tl-prog 所在） */
  var SPAN_MAX = 1.0;              /* 簇横向跨度硬上限（年）：超过则邻年被误读为有事件 */
  var MAX_COLS = 6;                /* 单簇列数搜索上限 */

  /* 圆点直径随轨道宽自适应：轨道越窄，点越小（否则点本身就占满一年） */
  function dotSize(W) {
    if (W >= 900) return 12;
    if (W >= 600) return 11;
    if (W >= 420) return 10;
    return 9;
  }

  /* 给定 D 与 colsCap，算出每簇的位置、层分配与全部圆点坐标（与 sim-timeline8 同构） */
  function layoutWith(W, D, colsCap, marks) {
    var pitch = D + 1;
    var pxPerYear = W / (cfg.to - cfg.from);
    var layers = [];          /* layers[i] = [{l,r}] 该层已占的墨迹区间（按行记录） */
    var clusters = [];
    var dots = [];
    var used = 0, overflow = 0;
    var groups = [], byYear = {};
    marks.forEach(function (m) {
      if (!byYear[m.from]) { byYear[m.from] = []; groups.push(m.from); }
      byYear[m.from].push(m);
    });
    groups.sort(function (a, b) { return a - b; });

    for (var gi = 0; gi < groups.length; gi++) {
      var y = groups[gi], items = byYear[y], n = items.length;
      var cols = Math.min(colsCap, n);
      var rows = Math.ceil(n / cols);
      if (cols * rows < n) overflow += n - cols * rows;   /* 不变量：必为 0 */

      var ink = (cols - 1) * pitch + D;
      var x0 = (y - cfg.from) / (cfg.to - cfg.from) * W;
      var left = x0 - ink / 2;
      if (left < D / 2) left = D / 2;
      if (left + ink > W - D / 2) left = W - D / 2 - ink;

      /* 每行的实际横向跨度（列优先填充 ⇒ 越往下行越窄） */
      var rowSpan = [];
      for (var r = 0; r < rows; r++) {
        var cnt = Math.ceil((n - r) / rows);
        rowSpan.push({ l: left, r: left + (cnt - 1) * pitch + D });
      }

      /* first-fit：找最低的不冲突起始层；找不到就开新层 */
      var start = -1;
      for (var s = 0; s < used; s++) {
        var ok = true;
        for (var r = 0; r < rows && ok; r++) {
          var occ = layers[s + r] || [];
          for (var k = 0; k < occ.length; k++) {
            if (rowSpan[r].l < occ[k].r + 1 && occ[k].l < rowSpan[r].r + 1) { ok = false; break; }
          }
        }
        if (ok) { start = s; break; }
      }
      if (start < 0) start = used;

      for (var r2 = 0; r2 < rows; r2++) {
        layers[start + r2] = layers[start + r2] || [];
        layers[start + r2].push(rowSpan[r2]);
      }
      used = Math.max(used, start + rows);

      /* 列优先填充：第 i 个点 → 列 floor(i/rows)，行 i%rows。x=中心、y=顶边 */
      for (var i = 0; i < n; i++) {
        var c = Math.floor(i / rows), rr = i % rows;
        dots.push({
          mark: items[i],
          x: left + c * pitch + D / 2,
          y: AXIS_Y + (start + rr) * pitch - D / 2,
          x0: x0,
          row: start + rr
        });
      }
      clusters.push({ y: y, n: n, cols: cols, rows: rows, start: start, ink: ink, left: left, x0: x0 });
    }

    var firstTop = AXIS_Y - D / 2;
    return {
      dots: dots, clusters: clusters, D: D, pitch: pitch, layers: used, overflow: overflow,
      trackH: firstTop + (used - 1) * pitch + D + 15,
      bandTop: firstTop + (used - 1) * pitch + D + 6,
      spanY: Math.max.apply(null, clusters.map(function (c) { return c.ink; })) / pxPerYear,
      driftY: Math.max.apply(null, clusters.map(function (c) { return Math.abs(c.left + c.ink / 2 - c.x0); })) / pxPerYear
    };
  }

  /* 在候选 colsCap（2..MAX_COLS）中择优：轨道高最小 → 跨度最小（语义保真）。 */
  function pickLayout(W, marks) {
    var D = dotSize(W);
    var best = null, fallback = null;
    for (var cc = 2; cc <= MAX_COLS; cc++) {
      var r = layoutWith(W, D, cc, marks);
      if (r.overflow) continue;
      if (!fallback || r.spanY < fallback.spanY - 1e-9 ||
          (Math.abs(r.spanY - fallback.spanY) < 1e-9 && r.trackH < fallback.trackH)) fallback = r;
      if (r.spanY > SPAN_MAX) continue;
      if (!best || r.trackH < best.trackH - 1e-9 ||
          (Math.abs(r.trackH - best.trackH) < 1e-9 && r.spanY < best.spanY - 1e-9)) best = r;
    }
    return best || fallback;
  }

  function init(opts) {
    cfg = {
      from: opts.from, to: opts.to,
      onYear: opts.onYear, onMark: opts.onMark, onBand: opts.onBand, onState: opts.onState,
      onPending: opts.onPending
    };
    els = opts.els;
    state.year = opts.from;
    var pending = 0;

    (opts.bands || []).forEach(function (b) {
      if (b.from > cfg.to) { pending++; return; }   /* 完全在量程之外（后续章节待补充） */
      var band = document.createElement('div');
      band.className = 'tl-band';
      var l = Math.max(0, (b.from - cfg.from) / (cfg.to - cfg.from) * 100);
      var r = Math.min(100, (b.to - cfg.from) / (cfg.to - cfg.from) * 100);
      if (b.to > cfg.to) band.classList.add('cut');  /* 被量程截断：右端加渐隐提示 */
      band.style.left = l + '%';
      band.style.width = Math.max(0, r - l) + '%';
      band.style.background = b.color;
      band.title = b.name + ' · ' + b.years;
      band.addEventListener('click', function (ev) { ev.stopPropagation(); if (cfg.onBand) cfg.onBand(b); });
      els.track.insertBefore(band, els.dots);
      b.el = band;
    });

    var marks = opts.marks || [];
    marks.forEach(function (m) {
      var d = document.createElement('button');
      d.className = 'tl-dot';
      d.style.left = ((m.from - cfg.from) / (cfg.to - cfg.from) * 100) + '%';
      d.style.setProperty('--c', m.color || '#c2593f');
      d.title = m.title || '';
      d.addEventListener('click', function (ev) { ev.stopPropagation(); if (cfg.onMark) cfg.onMark(m); });
      els.dots.appendChild(d);
      m.el = d;
    });

    /* 圆点防重叠：同年事件聚成「簇」（cluster）——一个紧凑的 cols 列 × rows 行网格，
     * 列优先填充（先竖后横）⇒ 簇「窄而高」，横向跨度小 ⇒ 时间语义得以保留。
     * 簇水平居中于该年位置；簇之间横向交叠时分配到不同的层（layer），
     * 层内互不重叠 ⇒ 圆点两两不相交（几何上零重叠，非靠事后挪动）。
     * 点径随轨道宽自适应（dotSize）；簇列数按实际轨道宽运行期搜索择优（pickLayout）。 */
    (function stagger() {
      var w = els.track.getBoundingClientRect().width;
      if (!w) { setTimeout(stagger, 120); return; }
      var best = pickLayout(w, marks);
      if (!best) return;

      /* 写入 DOM：left 保持该年的百分比位置（随量程自适应），
       * 水平偏移写入 --dx（px），点径与垂直位置随 D / 层数写入。 */
      for (var i = 0; i < best.dots.length; i++) {
        var d = best.dots[i], el = d.mark.el;
        el.style.width = best.D + 'px';
        el.style.height = best.D + 'px';
        el.style.marginLeft = (-best.D / 2) + 'px';
        el.style.setProperty('--dx', (d.x - d.x0) + 'px');
        el.style.top = d.y + 'px';
        el.dataset.row = d.row;
      }
      /* 轨道高度与章节色带位置随层数/点径同步（点径自适应 ⇒ 高度公式不能用常量 13） */
      els.track.style.height = best.trackH + 'px';
      var bands = els.track.querySelectorAll('.tl-band');
      for (var b = 0; b < bands.length; b++) bands[b].style.top = best.bandTop + 'px';

      if (cfg.onPending) {
        cfg.onPending({ count: pending, marks: marks, rows: best.layers, pitch: best.pitch, dot: best.D });
      }
    })();

    /* 拖拽 / 点击轨道 */
    var dragging = false;
    function yearFromEvent(e) {
      var r = els.track.getBoundingClientRect();
      var p = clamp((e.clientX - r.left) / r.width, 0, 1);
      setYear(cfg.from + p * (cfg.to - cfg.from));
    }
    els.track.addEventListener('pointerdown', function (e) {
      if (seq.active) stopSeq();
      dragging = true;
      try { els.track.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      yearFromEvent(e);
    });
    els.track.addEventListener('pointermove', function (e) { if (dragging) yearFromEvent(e); });
    els.track.addEventListener('pointerup', function () { dragging = false; });
    els.track.addEventListener('pointercancel', function () { dragging = false; });

    setYear(state.year, true);
    return api;
  }

  function setYear(y, silent) {
    state.year = y;
    var pct = clamp((y - cfg.from) / (cfg.to - cfg.from), 0, 1);
    els.prog.style.width = (pct * 100) + '%';
    els.knob.style.left = (pct * 100) + '%';
    /* 播放中年份补间每帧调用：文本只在整数年变化时写，避免无变化 textContent 触发 layout */
    var yr = 'AD ' + Math.round(y);
    if (els.year.textContent !== yr) els.year.textContent = yr;
    if (!silent && cfg.onYear) cfg.onYear(y);
  }

  /* ===== 事件序列播放 =====
   * items: 事件数组（已按年代排序）；opts: { yearOf, travel, dwell, speed, onEvent, onArrive, onLeave, onEnd }
   *
   * travel 是「事件之间的过渡时长」而非单纯的年代插值时长：M1 的 12 个事件
   * 集中在 AD 46–49，相邻事件 from 相同 → 年代跨度为 0，旧实现直接 setYear+done，
   * 过渡耗时 0ms，路线描线与相机跟随（各需约 2s）刚起步就被下一轮重置。
   * 故 span≈0 时也保证 travel 的过渡窗口，让「线在画 + 镜头在跟」有时间跑完。
   *
   * 时序（2026-10-17 重排，需求「路线跟踪和时间轴同步、到达后才弹卡」）：
   *   onEvent  → 行程起点：调用方在此启动路线描线 + 相机跟车 + 拉远缩放，
   *              与年份补间【同一时刻、同一窗口】推进（此前 onEvent 在年份动画
   *              结束后才触发，时间轴先走完、路线后画，两者完全脱节）；
   *   onArrive → 行程终点：年份落定即到达；路线 seek 的末帧也会触发同一回调，
   *              调用方保证两侧幂等（到达才弹事件卡/地点名/点亮）；
   *   onLeave  → 停留结束，进入下一段行程。 */
  function playEvents(items, opts) {
    stopSeq();
    opts = opts || {};
    var speed = opts.speed || 1;
    var dwell = (opts.dwell || 5000) / speed;
    var travel = (opts.travel || 1400) / speed;
    var yearOf = opts.yearOf || function (it) { return it.from; };
    var i = 0;
    seq.active = true;
    state.playing = true;
    if (cfg.onState) cfg.onState(true);

    function animateTo(target, dur, done) {
      var start = state.year, t0 = performance.now();
      var span = target - start;
      if (Math.abs(span) < 1e-6) {
        setYear(target);
        /* 同年事件：保底一个过渡窗口，否则描线/相机补间刚开始就被打断 */
        if (dur > 0) seq.timer = setTimeout(function () { if (seq.active) done(); }, dur);
        else done();
        return;
      }
      if (dur <= 0) { setYear(target); done(); return; }
      (function frame(t) {
        if (!seq.active) return;
        var p = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - p, 2.2);
        setYear(start + span * e);
        if (p < 1) seq.raf = requestAnimationFrame(frame);
        else done();
      })(t0);
    }

    function step() {
      if (!seq.active) return;
      if (i >= items.length) { finish(); return; }
      var it = items[i];
      /* 行程开始：描线/跟车/缩放与年份推进同一时刻启动（同步的关键） */
      if (opts.onEvent) opts.onEvent(it);
      animateTo(yearOf(it), travel, function () {
        if (!seq.active) return;
        /* 到达：与路线 seek 末帧双触发，调用方幂等 */
        if (opts.onArrive) opts.onArrive(it);
        seq.timer = setTimeout(function () {
          if (!seq.active) return;
          if (opts.onLeave) opts.onLeave(it);
          i++;
          step();
        }, dwell);
      });
    }

    function finish() {
      seq.active = false;
      state.playing = false;
      if (cfg.onState) cfg.onState(false);
      if (opts.onEnd) opts.onEnd();
    }

    step();
  }

  function stopSeq() {
    seq.active = false;
    cancelAnimationFrame(seq.raf);
    clearTimeout(seq.timer);
    if (state.playing) {
      state.playing = false;
      if (cfg.onState) cfg.onState(false);
    }
  }

  var api = {
    setYear: setYear,
    playEvents: playEvents,
    stop: stopSeq,
    pause: function () { stopSeq(); },
    isPlaying: function () { return state.playing; },
    year: function () { return state.year; }
  };
  return { init: init, api: api };
})();
