/**
 * Orthographic globe geometry shared by the server-rendered static SVG and the interactive client
 * globe. Built on the owner's original world-map approach (d3-geo + topojson-client + world-atlas),
 * switched from Natural Earth to an orthographic projection.
 */
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { City } from "@/lib/geo";

export const SIZE = 600;
export const SCALE = 284;
/** Fixed home view: mid-Atlantic, so Europe and New York are both on the front. */
export const HOME: [number, number] = [22, -44];

export type LandTopology = Topology<{ land: GeometryCollection }>;

export function landFeatures(topo: LandTopology) {
  return feature(topo, topo.objects.land) as unknown as FeatureCollection<Polygon | MultiPolygon>;
}

export function projection(rotate: [number, number]): GeoProjection {
  return geoOrthographic()
    .scale(SCALE)
    .translate([SIZE / 2, SIZE / 2])
    .rotate([rotate[0], rotate[1], 0])
    .clipAngle(90)
    .precision(0.5);
}

export interface Projected {
  x: number;
  y: number;
  visible: boolean;
}

/** Orthographic projection of a point; `visible` is false on the far hemisphere. */
export function project(p: GeoProjection, lon: number, lat: number): Projected {
  const [rl, rp] = p.rotate();
  const r = Math.PI / 180;
  const l0 = -rl * r;
  const p0 = -rp * r;
  const l = lon * r;
  const ph = lat * r;
  const cosc = Math.sin(p0) * Math.sin(ph) + Math.cos(p0) * Math.cos(ph) * Math.cos(l - l0);
  const x = Math.cos(ph) * Math.sin(l - l0);
  const y = Math.cos(p0) * Math.sin(ph) - Math.sin(p0) * Math.cos(ph) * Math.cos(l - l0);
  return { x: SIZE / 2 + SCALE * x, y: SIZE / 2 - SCALE * y, visible: cosc > 0.02 };
}

export function basePaths(p: GeoProjection, land: FeatureCollection | null) {
  const path = geoPath(p).digits(1);
  return {
    sphere: path({ type: "Sphere" }) ?? "",
    graticule: path(geoGraticule10()) ?? "",
    land: land ? (path(land) ?? "") : "",
  };
}

/** Great circle from a to b with an altitude bulge; only the front-hemisphere part is drawn. */
export function arcPath(p: GeoProjection, a: City, b: City, bulge = 0.12, n = 40): string | null {
  const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  const c = SIZE / 2;
  let d = "";
  let pen = false;
  let any = false;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [lon, lat] = interp(t);
    const q = project(p, lon, lat);
    if (!q.visible) {
      pen = false;
      continue;
    }
    const h = 1 + bulge * Math.sin(Math.PI * t);
    const x = c + (q.x - c) * h;
    const y = c + (q.y - c) * h;
    d += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    pen = true;
    any = true;
  }
  return any ? d : null;
}

export interface LabelInput {
  id: string;
  x: number;
  y: number;
  lines: { text: string; kind: "city" | "acc" | "gap" }[];
  priority: number;
}

export interface PlacedLabel {
  id: string;
  /** Text anchor point (first baseline). */
  tx: number;
  ty: number;
  anchor: "start" | "end";
  /** Leader line end, or null when the label sits next to its node. */
  lx: number | null;
  ly: number | null;
  lines: LabelInput["lines"];
}

/**
 * Edge- and collision-aware placement. `k` converts CSS px to viewBox units (labels keep a fixed
 * on-screen size whatever the globe size). Candidates are tried in order; a label is placed only
 * where its box stays inside the view and clear of other labels and nodes.
 */
export function placeLabels(inputs: LabelInput[], k: number, nodes: { x: number; y: number }[]): PlacedLabel[] {
  const charW = { city: 7.1, acc: 6.65, gap: 6.65 };
  const lineH = { city: 15, acc: 13, gap: 13 };
  const placed: { box: [number, number, number, number] }[] = [];
  const out: PlacedLabel[] = [];
  const margin = 6 * k;
  const clearOfNodes = (b: [number, number, number, number]) =>
    nodes.every((n) => n.x < b[0] - 5 * k || n.x > b[2] + 5 * k || n.y < b[1] - 5 * k || n.y > b[3] + 5 * k);
  const clearOfLabels = (b: [number, number, number, number]) =>
    placed.every((p) => b[2] + 4 * k < p.box[0] || b[0] - 4 * k > p.box[2] || b[3] + 2 * k < p.box[1] || b[1] - 2 * k > p.box[3]);

  for (const inp of [...inputs].sort((a, b) => a.priority - b.priority)) {
    const w = Math.max(...inp.lines.map((l) => l.text.length * charW[l.kind])) * k;
    const h = inp.lines.reduce((s, l) => s + lineH[l.kind], 0) * k;
    const firstH = lineH[inp.lines[0].kind] * k;
    // [dx, dy of the box's top-left corner relative to the node, anchor, leader]
    const near = 12 * k;
    const far = 34 * k;
    const cands: [number, number, "start" | "end", boolean][] = [
      [near, -firstH * 0.7, "start", false],
      [-near - w, -firstH * 0.7, "end", false],
      [near, -h - far * 0.55, "start", true],
      [near, far * 0.5, "start", true],
      [-near - w, far * 0.5, "end", true],
      [-near - w, -h - far * 0.55, "end", true],
      [far, -firstH * 0.7, "start", true],
      [-far - w, -firstH * 0.7, "end", true],
      [far, far, "start", true],
      [-far - w, far, "end", true],
      [far, -h - far, "start", true],
      [-far - w, -h - far, "end", true],
    ];
    for (const [dx, dy, anchor, leader] of cands) {
      const box: [number, number, number, number] = [inp.x + dx, inp.y + dy, inp.x + dx + w, inp.y + dy + h];
      if (box[0] < margin || box[1] < margin || box[2] > SIZE - margin || box[3] > SIZE - margin) continue;
      if (!clearOfLabels(box) || !clearOfNodes(box)) continue;
      placed.push({ box });
      const tx = anchor === "start" ? box[0] : box[2];
      const ty = box[1] + firstH * 0.78;
      out.push({
        id: inp.id,
        tx,
        ty,
        anchor,
        lx: leader ? (anchor === "start" ? box[0] - 3 * k : box[2] + 3 * k) : null,
        ly: leader ? box[1] + firstH * 0.45 : null,
        lines: inp.lines,
      });
      break;
    }
  }
  return out;
}
