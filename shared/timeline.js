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
      onYear: opts.onYear, onMark: opts.onMark, onBand: opts.onBand, onState: opts.onState
    };
    els = opts.els;
    state.year = opts.from;

    (opts.bands || []).forEach(function (b) {
      var band = document.createElement('div');
      band.className = 'tl-band';
      var l = Math.max(0, (b.from - cfg.from) / (cfg.to - cfg.from) * 100);
      var r = Math.min(100, (b.to - cfg.from) / (cfg.to - cfg.from) * 100);
      band.style.left = l + '%';
      band.style.width = Math.max(0, r - l) + '%';
      band.style.background = b.color;
      band.title = b.name + ' · ' + b.years;
      band.addEventListener('click', function (ev) { ev.stopPropagation(); if (cfg.onBand) cfg.onBand(b); });
      els.track.insertBefore(band, els.dots);
      b.el = band;
    });

    (opts.marks || []).forEach(function (m) {
      var d = document.createElement('button');
      d.className = 'tl-dot';
      d.style.left = ((m.from - cfg.from) / (cfg.to - cfg.from) * 100) + '%';
      d.style.setProperty('--c', m.color || '#c2593f');
      d.title = m.title || '';
      d.addEventListener('click', function (ev) { ev.stopPropagation(); if (cfg.onMark) cfg.onMark(m); });
      els.dots.appendChild(d);
      m.el = d;
    });

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
   * items: 事件数组（已按年代排序）；opts: { yearOf, travel, dwell, speed, onEvent, onLeave, onEnd } */
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
      if (Math.abs(span) < 1e-6 || dur <= 0) { setYear(target); done(); return; }
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
