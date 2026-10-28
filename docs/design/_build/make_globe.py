import json, math, sys
import os
src = os.environ.get("LAND_110M", "node_modules/world-atlas/land-110m.json")  # npm i world-atlas; or set LAND_110M
topo = json.load(open(src))
tr = topo.get("transform"); sx, sy = tr["scale"]; tx, ty = tr["translate"]
arcs = []
for arc in topo["arcs"]:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def ring(idx):
    out = []
    for i in idx:
        a = arcs[i] if i >= 0 else list(reversed(arcs[~i]))
        out.extend(a if not out else a[1:])
    return out
R = 284.0; CX = CY = 300.0
LON0, LAT0 = -22.0, 44.0   # centre: mid-Atlantic, Europe + NY both near the front
l0, p0 = math.radians(LON0), math.radians(LAT0)
def proj(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    cosc = math.sin(p0)*math.sin(p) + math.cos(p0)*math.cos(p)*math.cos(l-l0)
    x = math.cos(p)*math.sin(l-l0)
    y = math.cos(p0)*math.sin(p) - math.sin(p0)*math.cos(p)*math.cos(l-l0)
    return x, y, cosc
def to_svg(x, y, cosc):
    if cosc < 0:  # back hemisphere: push to horizon in same direction
        n = math.hypot(x, y) or 1e-9; x, y = x/n, y/n
    return CX + R*x, CY - R*y
def fmt(v): return f"{v:.1f}"
paths = []
for g in topo["objects"]["land"]["geometries"]:
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    for poly in polys:
        d = ""
        for k, rid in enumerate(poly):
            pts = ring(rid)
            if all(p[1] < -58 for p in pts): continue  # Antarctica
            pr = [proj(lo, la) for lo, la in pts]
            vis = sum(1 for p in pr if p[2] >= 0)
            if vis < max(4, 0.12*len(pr)): continue
            s = [to_svg(*p) for p in pr]
            d += "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in s) + "Z "
        if d: paths.append(d.strip())
land = "".join(f'<path d="{d}"/>' for d in paths)
# graticule
grat = []
for lat in range(-60, 90, 30):
    pts = [proj(lon, lat) for lon in range(-180, 181, 3)]
    seg = []; cur = []
    for p in pts:
        if p[2] >= -0.001: cur.append(to_svg(*p))
        else:
            if len(cur) > 1: seg.append(cur)
            cur = []
    if len(cur) > 1: seg.append(cur)
    for s in seg: grat.append("M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in s))
for lon in range(-180, 180, 30):
    pts = [proj(lon, lat) for lat in range(-90, 91, 3)]
    seg = []; cur = []
    for p in pts:
        if p[2] >= -0.001: cur.append(to_svg(*p))
        else:
            if len(cur) > 1: seg.append(cur)
            cur = []
    if len(cur) > 1: seg.append(cur)
    for s in seg: grat.append("M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in s))
graticule = f'<path d="{" ".join(grat)}"/>'
# nodes
cities = {"frankfurt": (8.68, 50.11), "amsterdam": (4.90, 52.37), "luxembourg": (6.13, 49.61), "newyork": (-74.0, 40.71), "london": (-0.13, 51.51)}
nodes = {k: to_svg(*proj(*v)) for k, v in cities.items()}
# great-circle arcs with altitude bulge
def arc3d(a, b, n=40, bulge=0.12):
    la, pa = map(math.radians, a); lb, pb = map(math.radians, b)
    A = (math.cos(pa)*math.cos(la), math.cos(pa)*math.sin(la), math.sin(pa))
    B = (math.cos(pb)*math.cos(lb), math.cos(pb)*math.sin(lb), math.sin(pb))
    out = []
    for i in range(n+1):
        t = i/n
        v = [A[j]*(1-t) + B[j]*t for j in range(3)]
        nrm = math.sqrt(sum(c*c for c in v)); v = [c/nrm for c in v]
        lat = math.degrees(math.asin(v[2])); lon = math.degrees(math.atan2(v[1], v[0]))
        x, y, c = proj(lon, lat)
        h = 1 + bulge*math.sin(math.pi*t)
        out.append((CX + R*x*h, CY - R*y*h))
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in out)
flows = [("newyork","frankfurt"),("london","frankfurt"),("amsterdam","frankfurt"),("luxembourg","frankfurt"),("frankfurt","newyork")]
arcs_svg = {f"{a}-{b}": arc3d(cities[a], cities[b]) for a,b in flows}
json.dump({"land": land, "graticule": graticule, "nodes": nodes, "arcs": arcs_svg}, open(sys.argv[1], "w"))
print("land paths", len(paths), "nodes", {k:(round(x),round(y)) for k,(x,y) in nodes.items()}, "bytes", len(land))
