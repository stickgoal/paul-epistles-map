/* GS.fx — 极简事件总线：为后续音效、增强动画预留的订阅点。
 * 播放器与 UI 在关键节点 emit，未来的 fx 模块（如 WebAudio 合成音效）只需 on() 订阅，无需改动引擎。
 * 已发出的事件：app:ready / play:start / play:pause / play:end /
 *             event:depart {event}（行程起点：路线开描）/ event:arrive {event}（路线抵达地点）/
 *             event:open {event} / event:leave {event} / chapter:enter {chapter} */
window.GS = window.GS || {};
GS.fx = (function () {
  'use strict';
  var handlers = {};
  return {
    on: function (name, fn) {
      (handlers[name] = handlers[name] || []).push(fn);
    },
    off: function (name, fn) {
      if (!handlers[name]) return;
      handlers[name] = handlers[name].filter(function (h) { return h !== fn; });
    },
    emit: function (name, data) {
      (handlers[name] || []).forEach(function (fn) {
        try { fn(data); } catch (e) { console.error('fx:' + name, e); }
      });
    }
  };
})();
