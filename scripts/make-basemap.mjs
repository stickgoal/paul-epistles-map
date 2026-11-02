/* 生成底图 assets/world.json：把 Natural Earth 110m TopoJSON 转成精简 GeoJSON。
 *
 * 为什么用全球而不是裁剪窗口：M9.2 第一版把窗口裁到 -25..68E / 8..62N（94 个 feature，
 * 53KB），桌面 1440×900 看着没问题，但竖屏 430×932 一测就露馅 —— 竖屏在 z4.25 的
 * 纬度跨度约 56°，比窗口的 54° 还大，于是屏幕上出现两条笔直的「陆地被切断」的边
 * （南北各一条），像地图缺了一块。继续放大窗口治不了根：越窄越高的视口需要的纬度
 * 跨度越大，而墨卡托世界只有 ±85°。
 *
 * 结论：不再裁剪。整份 110m 世界（去掉南极洲，与本故事无关且占 8KB）只有 157KB，
 * 相对 3MB 的成品可以忽略；换来的是【任何视口、任何缩放都不会看到底图边界】，
 * 也不需要按视口动态算 minZoom 去躲边界了。
 *
 * 用法：node scripts/make-basemap.mjs
 * 依赖：assets/countries-110m.json（Natural Earth 110m，公有领域）+ topojson-client
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const topojson = require(path.join(root, 'assets/topojson-client.min.js'));

const topo = JSON.parse(fs.readFileSync(path.join(root, 'assets/countries-110m.json'), 'utf8'));
const fc = topojson.feature(topo, topo.objects.countries);

/* 两位小数 ≈ 赤道 1.1km；初始视野 z6.25 下 0.01° 只有 0.54px，肉眼看不出折线 */
const r2 = v => Math.round(v * 100) / 100;

const area = ring => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]);
  return Math.abs(a / 2);
};

const features = [];
for (const f of fc.features) {
  const g = f.geometry;
  if (!g) continue;
  const name = (f.properties && f.properties.name) || '';
  if (/antarctica/i.test(name)) continue;          /* 南极洲：与故事无关，且是最占字节的一块 */
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const outPolys = [];
  for (const poly of polys) {
    const rings = poly
      .map(r => r.map(p => [r2(p[0]), r2(p[1])]))
      .filter(r => r.length >= 4 && area(r) > 0.01);  /* 丢掉面积 < 0.01 平方度的碎环（礁石、小岛点） */
    if (rings.length) outPolys.push(rings);
  }
  if (!outPolys.length) continue;
  features.push({
    type: 'Feature',
    properties: { name },
    geometry: { type: 'MultiPolygon', coordinates: outPolys }
  });
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
const out = { type: 'FeatureCollection', features };
const text = JSON.stringify(out);
fs.writeFileSync(path.join(root, 'assets/world.json'), text);
const pts = features.reduce((n, f) => n + f.geometry.coordinates.reduce((m, p) => m + p.reduce((k, r) => k + r.length, 0), 0), 0);
console.log('features:', features.length, 'points:', pts, 'bytes:', text.length,
  '(', (text.length / 1024).toFixed(1), 'KB )');
