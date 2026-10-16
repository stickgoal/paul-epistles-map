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

    /* 圆点防重叠：同年 / 相近年份的圆点在水平方向上左右微错位，
     * 仍不足时再向下错行。规则：
     *   1) 先尝试「同一行 + 水平偏移 ±7px」，让同年圆点并排；
     *   2) 若该行水平空间仍不足（前后已有圆点），落到下一行。
     * 这样 12 个挤在 AD 46–49 的事件最多占 3 行，轨道高度可控。
     * 量程随数据动态变化，故按实际像素判定而非固定行数。 */
    (function stagger() {
      var w = els.dots.getBoundingClientRect().width;
      if (!w) { setTimeout(stagger, 120); return; }
      var D = 12;                /* 圆点直径 */
      var STEP = 7;/* 同排水平错位步长 */
      var ROW = 13;                                  /* 行距须 > 圆点直径，否则上下行压边 */
      var sorted = marks.slice().sort(function (a, b) { return a.from - b.from; });
      var rows = [];                /* rows[r] = [{x, half}] 该行已占位（half = 左半宽） */
      sorted.forEach(function (m) {
        var x0 = (m.from - cfg.from) / (cfg.to - cfg.from) * w;
        var placed = false;
        for (var r = 0; r <= rows.length && !placed; r++) {
          var occ = rows[r] || (rows[r] = []);
          /* 依次尝试 x0, x0+STEP, x0-STEP, x0+2*STEP, ... */
          for (var k = 0; k < 8; k++) {
            var sgn = (k % 2 === 0) ? 1 : -1;
            var x = x0 + sgn * Math.ceil(k / 2) * STEP;
            if (x < D / 2) x = D / 2;
            if (x > w - D / 2) x = w - D / 2;
            var hit = occ.some(function (o) { return Math.abs(o - x) < D + 1; });
            if (!hit) {
              occ.push(x);
              /* left 保持百分比（随量程变化），像素偏移写入 --dx 供 hover 缩放时保持 */
              m.el.style.setProperty('--dx', (x - x0) + 'px');
              m.el.style.top = (9 + r * ROW) + 'px';
              m.el.dataset.row = r;
              placed = true;
              break;
            }
          }
        }
      });
      if (cfg.onPending) cfg.onPending({ count: pending, marks: marks, rows: rows.length });
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
    els.year.textContent = 'AD ' + Math.round(y);
    if (!silent && cfg.onYear) cfg.onYear(y);
  }

  /* ===== 事件序列播放 =====
   * items: 事件数组（已按年代排序）；opts: { yearOf, travel, dwell, speed, onEvent, onLeave, onEnd }
   *
   * travel 现在是「事件之间的过渡时长」而非单纯的年代插值时长：M1 的 12 个事件
   * 集中在 AD 46–49，相邻事件 from 相同 → 年代跨度为 0，旧实现直接 setYear+done，
   * 过渡耗时 0ms，路线描线与相机跟随（各需约 2s）刚起步就被下一轮重置。
   * 故 span≈0 时也保证 travel 的过渡窗口，让「线在画 + 镜头在跟」有时间跑完。 */
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
      animateTo(yearOf(it), travel, function () {
        if (!seq.active) return;
        if (opts.onEvent) opts.onEvent(it);
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
