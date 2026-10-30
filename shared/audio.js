/* GS.audio — WebAudio 合成音效（M6）
 *
 * 为什么用合成而不是音频文件：
 *   项目硬约束是「单文件、离线、双击即用」。几段 mp3 会额外增加 200–600KB，
 *   而这里需要的只是极短的提示音（< 0.4s）——用振荡器 + 包络合成即可，
 *   零字节素材、无版权问题、音量与音色都可用参数调。
 *
 * 设计纪律：
 *   1) AudioContext 必须懒初始化，且只在【用户手势】里创建/恢复（浏览器自动播放策略）；
 *      因此 init() 不创建上下文，首次 play() 才创建 —— 播放由点击触发，手势链成立。
 *   2) 默认音量很低（master 0.16）。这是地图叙事的背景提示音，不是游戏音效；
 *      宁可听不清，也不要盖过用户的环境。
 *   3) 关闭状态持久化在 localStorage；关闭时连 AudioContext 都不创建（省电、省内存）。
 *   4) 只订阅 GS.fx 的事件，不反向依赖任何业务模块 —— 与 M1 定下的 fx 总线契约一致。
 */
window.GS = window.GS || {};
GS.audio = (function () {
  'use strict';

  var KEY = 'gs.sound';
  /* 能力探测放在加载期：没有 WebAudio 的环境里，开关按钮干脆不出现（见 template 的 syncSoundBtn） */
  var available = !!(window.AudioContext || window.webkitAudioContext);
  var ctx = null, master = null, enabled = true, volume = 0.16;

  function loadPref() {
    try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { enabled = true; }
  }
  function savePref() {
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* 隐私模式忽略 */ }
  }

  function ensure() {
    if (!enabled) return null;
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { available = false; return null; }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      /* 低通兜底：三角波在 2kHz 以上会有轻微毛刺，滤掉听感更「木」一些 */
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5200;
      master.connect(lp);
      lp.connect(ctx.destination);
    } catch (e) {
      available = false;
      ctx = null;
    }
    return ctx;
  }

  /* 单音：freq 频率、dur 秒、type 波形、gain 相对音量、delay 相对起点的秒数 */
  function tone(freq, dur, type, gain, delay) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain || 0.5, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* 音色表：全部为极短提示音，语义靠「音高走向」而不是音量区分 */
  var CUES = {
    /* 抵达：上行二音（A5 → E6），像一记很轻的铃 */
    arrive: function () { tone(880, 0.11, 'triangle', 0.55, 0); tone(1318.5, 0.16, 'triangle', 0.35, 0.07); },
    /* 书信：单音 + 高八度泛音，更「纸面」一些 */
    letter: function () { tone(987.8, 0.10, 'sine', 0.5, 0); tone(1975.5, 0.08, 'sine', 0.18, 0.02); },
    /* 逼迫 / 审讯：低二音（A4 → F4），沉下去 */
    grave:  function () { tone(440, 0.14, 'triangle', 0.5, 0); tone(349.2, 0.20, 'triangle', 0.32, 0.08); },
    /* 章节切换：三音上行 */
    chapter: function () { tone(523.3, 0.10, 'triangle', 0.42, 0); tone(659.3, 0.10, 'triangle', 0.38, 0.07); tone(784, 0.18, 'triangle', 0.34, 0.14); },
    /* 播放 / 暂停：一记极短的「嗒」 */
    play:   function () { tone(740, 0.06, 'sine', 0.5, 0); },
    pause:  function () { tone(440, 0.07, 'sine', 0.45, 0); },
    end:    function () { tone(659.3, 0.12, 'triangle', 0.4, 0); tone(440, 0.22, 'triangle', 0.3, 0.1); },
    open:   function () { tone(1174.7, 0.045, 'sine', 0.22, 0); }
  };

  function play(name) {
    if (!enabled) return false;
    if (!CUES[name]) return false;
    try { CUES[name](); return true; } catch (e) { return false; }
  }

  /* 把 fx 总线接到音色表：这是 M1 预留订阅点的兑现，业务侧不需要知道音频存在 */
  function bind(fx) {
    if (!fx) return;
    fx.on('event:arrive', function (ev) {
      var t = ev && ev.type;
      play(t === 'letter' ? 'letter' : (t === 'persecution' || t === 'trial' ? 'grave' : 'arrive'));
    });
    fx.on('chapter:enter', function () { play('chapter'); });
    fx.on('play:start', function () { play('play'); });
    fx.on('play:pause', function () { play('pause'); });
    fx.on('play:end', function () { play('end'); });
    fx.on('event:open', function () { play('open'); });
  }

  function setEnabled(on) {
    enabled = !!on;
    savePref();
    if (enabled) ensure();
    else if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* noop */ } }
    return enabled;
  }

  loadPref();

  return {
    init: function () { loadPref(); return enabled; },
    bind: bind,
    play: play,
    setEnabled: setEnabled,
    toggle: function () { return setEnabled(!enabled); },
    enabled: function () { return enabled; },
    available: function () { return available; },
    state: function () { return ctx ? ctx.state : 'none'; },
    cues: Object.keys(CUES)
  };
})();
