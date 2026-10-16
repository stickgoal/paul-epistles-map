// 构建单文件 HTML：内联 Leaflet JS/CSS + 地中海 GeoJSON
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

html = html
  .replace('@@LEAFLET_CSS@@', () => css)
  .replace('@@LEAFLET_JS@@', () => js)
  .replace('@@GEOJSON@@', () => geo);

if (html.includes('@@')) {
  console.error('WARNING: unreplaced placeholder remains');
}
const out = path.join(here, 'paul-epistles-map.html');
fs.writeFileSync(out, html);
console.log('built:', out, html.length, 'bytes');
