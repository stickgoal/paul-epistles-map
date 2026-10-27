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

const inject = {
  '@@LEAFLET_CSS@@': () => css,
  '@@LEAFLET_JS@@': () => js,
  '@@GEOJSON@@': () => geo,
  '@@GS_FX@@': () => read('shared/fx.js'),
  '@@GS_MAPCORE@@': () => read('shared/map-core.js'),
  '@@GS_ROUTES@@': () => read('shared/route-engine.js'),
  '@@GS_TIMELINE@@': () => read('shared/timeline.js'),
  '@@DATA_CHAPTERS@@': () => read('data/chapters.json'),
  '@@DATA_PLACES@@': () => read('data/places.json'),
  '@@DATA_ROUTES@@': () => read('data/routes.json'),
  '@@DATA_EVENTS@@': () => read('data/events.json'),
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
