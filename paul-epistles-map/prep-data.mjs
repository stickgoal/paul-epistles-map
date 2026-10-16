// TopoJSON -> 地中海区域裁剪 GeoJSON（离线地图数据准备）
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const topo = JSON.parse(fs.readFileSync(path.join(here, 'assets/countries-110m.json'), 'utf8'));
const topojson = require(path.join(here, 'assets/topojson-client.min.js'));

const world = topojson.feature(topo, topo.objects.countries);

// 地中海可视区域
const XMIN = -11.5, YMIN = 27.5, XMAX = 43.5, YMAX = 48.5;

function clipRing(ring) {
  let pts = ring.map(p => [p[0], p[1]]);
  const clip = (inside, intersect) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const curIn = inside(cur), prevIn = inside(prev);
      if (curIn) {
        if (!prevIn) out.push(intersect(prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(intersect(prev, cur));
      }
    }
    return out;
  };
  pts = clip(p => p[0] >= XMIN, (a, b) => { const t = (XMIN - a[0]) / (b[0] - a[0]); return [XMIN, a[1] + t * (b[1] - a[1])]; });
  pts = clip(p => p[0] <= XMAX, (a, b) => { const t = (XMAX - a[0]) / (b[0] - a[0]); return [XMAX, a[1] + t * (b[1] - a[1])]; });
  pts = clip(p => p[1] >= YMIN, (a, b) => { const t = (YMIN - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), YMIN]; });
  pts = clip(p => p[1] <= YMAX, (a, b) => { const t = (YMAX - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), YMAX]; });
  return pts;
}

function roundRing(ring) {
  const out = [];
  for (const p of ring) {
    const q = [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
    if (!out.length || q[0] !== out[out.length - 1][0] || q[1] !== out[out.length - 1][1]) out.push(q);
  }
  if (out.length > 2) {
    const f = out[0], l = out[out.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) out.push([f[0], f[1]]);
  }
  return out;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

const features = [];
for (const f of world.features) {
  const geom = f.geometry;
  if (!geom) continue;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const kept = [];
  for (const poly of polys) {
    const rings = poly.map(clipRing).map(roundRing).filter(r => r.length >= 4 && ringArea(r) >= 0.004);
    if (rings.length && ringArea(rings[0]) >= 0.02) kept.push(rings);
  }
  if (kept.length) {
    features.push({
      type: 'Feature',
      properties: { name: f.properties && f.properties.name },
      geometry: { type: 'MultiPolygon', coordinates: kept },
    });
  }
}

// 校验马耳他是否存在（赴罗马航程的重要一站），缺失则手工补一个简化多边形
const hasMalta = features.some(f => {
  const c = JSON.stringify(f.geometry.coordinates);
  return c.includes('14.4') && c.includes('35.9');
});
if (!hasMalta) {
  console.log('Malta missing -> adding manual polygon');
  features.push({
    type: 'Feature',
    properties: { name: 'Malta' },
    geometry: { type: 'MultiPolygon', coordinates: [[[[14.19, 36.08], [14.45, 35.82], [14.58, 35.85], [14.53, 35.93], [14.35, 36.02], [14.19, 36.08]]]] },
  });
}

const out = { type: 'FeatureCollection', features };
fs.writeFileSync(path.join(here, 'assets/med.json'), JSON.stringify(out));
console.log('features:', features.length, 'size:', fs.statSync(path.join(here, 'assets/med.json')).size, 'bytes');
console.log('names:', features.map(f => f.properties.name).join(', '));
