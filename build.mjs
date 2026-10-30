// 构建单文件 HTML：内联 Leaflet JS/CSS + 地中海 GeoJSON + 共享引擎 + JSON 数据
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

let html = fs.readFileSync(path.join(here, 'template.html'), 'utf8');

const css = fs.readFileSync(path.join(here, 'assets/leaflet.css'), 'utf8')
  .split('\n')
  .filter(l => !l.includes('url('))
  .join('\n');

const js = fs.readFileSync(path.join(here, 'assets/leaflet.js'), 'utf8')
  .replace(/^\s*\/\/# sourceMappingURL=.*$/gm, '')
  .replace(/<\/script/gi, '<\\/script');

const geo = fs.readFileSync(path.join(here, 'assets/med.json'), 'utf8');

const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');

/* 媒体内联：data/events.json 里的 src 指向 assets/media/*.webp，
 * 构建时转成 data URI 内联，产物才是真正的「单文件、双击即用、断网可用」。
 * 文件缺失（或仍是外链）时不阻断构建：src 置空 → 前端自动回退到 Commons 溯源链接，
 * 保证「图挂了也不静默丢内容」。 */
function eventsJson() {
  const events = JSON.parse(read('data/events.json'));
  let n = 0, bytes = 0;
  const missing = [];
  for (const e of events) {
    for (const m of e.media || []) {
      if (!m.src || /^(https?:|data:)/.test(m.src)) continue;
      const p = path.join(here, m.src);
      if (!fs.existsSync(p)) { missing.push(e.id + ':' + m.src); m.src = null; continue; }
      const buf = fs.readFileSync(p);
      bytes += buf.length; n++;
      m.src = 'data:image/webp;base64,' + buf.toString('base64');
    }
  }
  if (missing.length) console.warn('WARNING: 媒体文件缺失，已回退为外链：' + missing.join(', '));
  console.log('inlined media:', n, 'files,', (bytes / 1024).toFixed(0) + 'KB');
  return JSON.stringify(events, null, 2);
}

const inject = {
  '@@LEAFLET_CSS@@': () => css,
  '@@LEAFLET_JS@@': () => js,
  '@@GEOJSON@@': () => geo,
  '@@GS_FX@@': () => read('shared/fx.js'),
  '@@GS_AUDIO@@': () => read('shared/audio.js'),
  '@@GS_MAPCORE@@': () => read('shared/map-core.js'),
  '@@GS_ROUTES@@': () => read('shared/route-engine.js'),
  '@@GS_TIMELINE@@': () => read('shared/timeline.js'),
  '@@DATA_CHAPTERS@@': () => read('data/chapters.json'),
  '@@DATA_PLACES@@': () => read('data/places.json'),
  '@@DATA_ROUTES@@': () => read('data/routes.json'),
  '@@DATA_EVENTS@@': eventsJson,
  '@@DATA_AUDIT@@': () => read('data/audit.json'),
};

for (const [token, fn] of Object.entries(inject)) {
  if (!html.includes(token)) console.error('WARNING: placeholder not found:', token);
  html = html.replace(token, fn);
}

if (html.includes('@@')) {
  console.error('WARNING: unreplaced placeholder remains');
}
const out = path.join(here, 'geo-story.html');
fs.writeFileSync(out, html);
console.log('built:', out, html.length, 'chars');
