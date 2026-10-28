"""Bakes real demo data (run from anywhere):
  python3 -I docs/design/_build/build_reference.py docs/design/_build/template.html docs/design/reference.html
globe.json is produced by make_globe.py (needs world-atlas/land-110m.json; path at the top of that script).

Bakes real demo data (frontend/public/demo/*.json) into the static design reference.
Usage: python3 -I build_reference.py template.html out.html
"""
import json, sys, math, datetime as dt
from collections import defaultdict

import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../frontend/public/demo/")
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
J = lambda n: json.load(open(ROOT + n))
hist, fc, expl, bt, acc, sched = J("history.json"), J("forecast.json"), J("explain.json"), J("backtest.json"), J("accounts.json"), J("scheduled.json")
scen = J("scenarios/payout-plus-2.json")
globe = json.load(open(HERE + "globe.json"))
P = {}
f1 = lambda v: f"{v:.1f}"

def poly(xs, hi, lo):
    top = " L".join(f"{f1(x)} {f1(y)}" for x, y in zip(xs, hi))
    bot = " L".join(f"{f1(x)} {f1(y)}" for x, y in zip(reversed(xs), reversed(lo)))
    return f"M{top} L{bot}Z"
def line(xs, ys): return "M" + " L".join(f"{f1(x)} {f1(y)}" for x, y in zip(xs, ys))
def d2s(iso):
    d = dt.date.fromisoformat(iso); return d.strftime("%-d %b")

# ---------- Globe ----------
P["GLOBE_LAND"] = globe["land"]
P["GLOBE_GRAT"] = globe["graticule"]
P["GLOBE_ARCS"] = "".join(f'<path class="g-arc" d="{d}"/>' for d in globe["arcs"].values())
particles = ""
for d in globe["arcs"].values():
    particles += f'<circle r="2.5" class="g-particle"><animateMotion dur="4.5s" repeatCount="indefinite" path="{d}"/></circle>'
P["GLOBE_PARTICLES"] = particles
N = globe["nodes"]
labels = {  # name, anchor side, label dx dy
    "newyork": ("New York", "Atlas USD Operating", -1, -8, 34),
    "london": ("London", "Meridian GBP Operating", -1, -14, 30),
    "amsterdam": ("Amsterdam", "Nova EUR Reserve", 1, 8, -40),
    "luxembourg": ("Luxembourg", "Orion EUR Safeguarding", 1, 10, 46),
    "frankfurt": ("Frankfurt", "Atlas EUR Operating", 1, 40, 4),
}
nodes = ""
for k, (city, accn, side, dx, dy) in labels.items():
    x, y = N[k]
    lx, ly = x + dx, y + dy
    gap = k == "frankfurt"
    cls = "g-node gap" if gap else "g-node"
    nodes += f'<line class="g-leader" x1="{f1(x)}" y1="{f1(y)}" x2="{f1(lx + (6 if side<0 else -6))}" y2="{f1(ly - 4)}"/>'
    if gap:
        nodes += f'<circle class="g-pulse" cx="{f1(x)}" cy="{f1(y)}" r="7"/><circle class="g-pulse g-pulse2" cx="{f1(x)}" cy="{f1(y)}" r="7"/>'
    nodes += f'<circle class="{cls}" cx="{f1(x)}" cy="{f1(y)}" r="{5.5 if gap else 4.5}"/>'
    anchor = "end" if side < 0 else "start"
    nodes += (f'<text class="g-city{" gapc" if gap else ""}" x="{f1(lx)}" y="{f1(ly)}" text-anchor="{anchor}">{city}</text>'
              f'<text class="g-acc" x="{f1(lx)}" y="{f1(ly+13)}" text-anchor="{anchor}">{accn}</text>')
    if gap:
        nodes += f'<text class="g-gapv" x="{f1(lx)}" y="{f1(ly+27)}" text-anchor="{anchor}">Gap −€2.13M · Tue 19 May</text>'
P["GLOBE_NODES"] = nodes

# ---------- Fan chart: Atlas EUR, 21 d history + 14 d forecast ----------
A = "atlas-eur-operating"
h = sorted([r for r in hist if r["account_id"] == A], key=lambda r: r["date"])[-21:]
pts = [p for p in fc["points"] if p["account_id"] == A]
X0, Y0, W, H = 56, 14, 724, 262
ymin, ymax = -1.5e6, 4.5e6
n = len(h) + len(pts)
xs = [X0 + W * i / (n - 1) for i in range(n)]
ya = lambda v: Y0 + H * (1 - (v - ymin) / (ymax - ymin))
hx, fx = xs[:21], xs[20:]  # forecast starts at as-of point
P["FAN_ACTUAL"] = line(hx, [ya(r["ending_balance"]) for r in h])
p50 = [ya(h[-1]["ending_balance"])] + [ya(p["balance_p50"]) for p in pts]
p05 = [ya(h[-1]["ending_balance"])] + [ya(p["balance_p05"]) for p in pts]
p95 = [ya(h[-1]["ending_balance"])] + [ya(p["balance_p95"]) for p in pts]
P["FAN_P50"] = line(fx, p50); P["FAN_P5"] = line(fx, p05); P["FAN_P95"] = line(fx, p95)
P["FAN_BAND"] = poly(fx, p95, p05)
P["FAN_BUFFER_Y"] = f1(ya(1e6)); P["FAN_ZERO_Y"] = f1(ya(0))
P["FAN_ASOF_X"] = f1(xs[20])
step = W / (n - 1)
gaps = ""
for i, p in enumerate(pts):
    if p["breach"]:
        gaps += f'<rect class="gapband" x="{f1(fx[i+1]-step/2)}" y="{Y0}" width="{f1(step)}" height="{H}"/>'
P["FAN_GAPS"] = gaps
mk = ""
for i, p in enumerate(pts):
    if p["scheduled_net_flow"]:
        up = p["scheduled_net_flow"] > 0
        x = fx[i + 1]; y = ya(p["balance_p50"]) + (18 if up else -18)
        tri = f"M{f1(x)} {f1(y-5 if up else y+5)} L{f1(x-5)} {f1(y+4 if up else y-4)} L{f1(x+5)} {f1(y+4 if up else y-4)}Z"
        mk += f'<path class="flow {"in" if up else "out"}" d="{tri}"/>'
P["FAN_MARKERS"] = mk
xt = ""
for i in range(0, n, 5):
    d = (h + pts)[i]["date"]
    xt += f'<text class="tick" x="{f1(xs[i])}" y="{Y0+H+18}" text-anchor="middle">{d2s(d)}</text>'
P["FAN_XTICKS"] = xt
yt = ""
for v in [-1.5e6, 0, 1.5e6, 3e6, 4.5e6]:
    lab = ("−" if v < 0 else "") + (f"{abs(v)/1e6:g}M" if v else "0")
    yt += f'<text class="tick" x="{X0-10}" y="{f1(ya(v)+4)}" text-anchor="end">{lab}</text><line class="grid" x1="{X0}" x2="{X0+W}" y1="{f1(ya(v))}" y2="{f1(ya(v))}"/>'
P["FAN_YTICKS"] = yt
P["FAN_TT_X"] = f1(fx[1]); P["FAN_TT_Y"] = f1(ya(pts[0]["balance_p50"]))
P["FAN_END_P50_Y"] = f1(p50[-1]); P["FAN_END_P5_Y"] = f1(p05[-1]); P["FAN_END_P95_Y"] = f1(p95[-1])

# ---------- Sparklines (last 30 d) ----------
by = defaultdict(list)
for r in hist: by[r["account_id"]].append(r)
for aid, rows in by.items():
    rows.sort(key=lambda r: r["date"]); b = [r["ending_balance"] for r in rows[-30:]]
    lo, hi = min(b), max(b); rng = (hi - lo) or 1
    sx = [2 + 68 * i / 29 for i in range(30)]; sy = [20 - 16 * (v - lo) / rng for v in b]
    P["SPARK_" + aid.replace("-", "_")] = line(sx, sy)
    P["SPARKA_" + aid.replace("-", "_")] = poly(sx, sy, [22] * 30)

# ---------- Model room (Atlas EUR, 14 d), stage 520x220 ----------
S = [s for s in expl["series"] if s["account_id"] == A][0]
MX0, MY0, MW, MH = 44, 12, 456, 184
mmin, mmax = -1.5e6, 3.2e6
my = lambda v: MY0 + MH * (1 - (v - mmin) / (mmax - mmin))
mxs = [MX0 + MW * i / 14 for i in range(15)]
sb = S["start_balance"]
for comp, key in [("lightgbm_quantile", "LGBM"), ("sklearn_gbdt_quantile", "GBDT"), ("ewma_volatility_baseline", "EWMA"), ("blend", "BLEND")]:
    c = S["components"][comp]["balance"]
    lo = [my(sb)] + [my(v) for v in c["p05"]]; hi = [my(sb)] + [my(v) for v in c["p95"]]; mid = [my(sb)] + [my(v) for v in c["p50"]]
    P[f"MR_{key}_BAND"] = poly(mxs, hi, lo); P[f"MR_{key}_P50"] = line(mxs, mid)
    P[f"MR_{key}_P5"] = line(mxs, lo)
P["MR_BUFFER_Y"] = f1(my(S["required_buffer"])); P["MR_ZERO_Y"] = f1(my(0))
mstep = MW / 14
g = ""
for i, p in enumerate(pts):
    if p["breach"]:
        g += f'<rect class="gapband" x="{f1(mxs[i+1]-mstep/2)}" y="{MY0}" width="{f1(mstep)}" height="{MH}"/>'
P["MR_GAPS"] = g
P["MR_DAY1_X"] = f1(mxs[1]); P["MR_DAY1_Y"] = f1(my(pts[0]["balance_p05"]))
P["MR_XT"] = "".join(f'<text class="tick" x="{f1(mxs[i])}" y="{MY0+MH+16}" text-anchor="middle">{d2s(S["dates"][i-1]) if i else "18 May"}</text>' for i in [0, 3, 7, 10, 14])
P["MR_YT"] = "".join(f'<text class="tick" x="{MX0-8}" y="{f1(my(v)+4)}" text-anchor="end">{("−" if v<0 else "")+(f"{abs(v)/1e6:g}M" if v else "0")}</text><line class="grid" x1="{MX0}" x2="{MX0+MW}" y1="{f1(my(v))}" y2="{f1(my(v))}"/>' for v in [-1e6, 0, 1e6, 2e6, 3e6])
# observations strips: 5 accounts x 120 ticks
obs = ""
order = [a["account_id"] for a in acc]
for row, aid in enumerate(order):
    rows = sorted(by[aid], key=lambda r: r["date"]); b = [r["ending_balance"] for r in rows]
    lo, hi = min(b), max(b); rng = (hi - lo) or 1
    yb = MY0 + 10 + row * 36
    for i, v in enumerate(b):
        x = MX0 + i * (MW / 120); hh = 4 + 18 * (v - lo) / rng
        obs += f'<rect x="{f1(x)}" y="{f1(yb+26-hh)}" width="2.2" height="{f1(hh)}" rx="1"/>'
    obs += f'<text class="tick" x="{MX0-8}" y="{yb+18}" text-anchor="end">{aid.split("-")[0].title()} {aid.split("-")[1].upper()}</text>'
P["MR_OBS"] = obs

# ---------- Feature importance ----------
feats = expl["feature_importance"]["features"]
rows = ""
grp_col = {"calendar": "var(--c-ewma)", "history": "var(--c-accent)", "scheduled": "var(--c-gbdt)"}
for f in feats:
    if f["gain"] <= 0: continue
    rows += (f'<div class="imp-row"><span class="imp-label">{f["label"]}</span>'
             f'<span class="imp-track"><span class="imp-bar" style="width:{f["share"]*100:.1f}%;background:{grp_col[f["group"]]}"></span></span>'
             f'<span class="imp-val">{f["share"]*100:.1f}%</span></div>')
P["IMP_ROWS"] = rows
zero = [f["label"] for f in feats if f["gain"] <= 0]
P["IMP_ZERO"] = ", ".join(zero)

# ---------- Backtest ----------
ph = bt["per_horizon"]
BX0, BY0, BW, BH = 48, 12, 440, 170
bx = [BX0 + BW * (r["h"] - 1) / 13 for r in ph]
bmax = 230000
byv = lambda v: BY0 + BH * (1 - v / bmax)
P["BT_MODEL"] = line(bx, [byv(r["pinball_p50"]) for r in ph])
P["BT_BASE"] = line(bx, [byv(r["baseline_pinball_p50"]) for r in ph])
P["BT_PTS"] = "".join(f'<circle class="pt model" cx="{f1(x)}" cy="{f1(byv(r["pinball_p50"]))}" r="3.5"/>' for x, r in zip(bx, ph))
P["BT_BPTS"] = "".join(f'<circle class="pt base" cx="{f1(x)}" cy="{f1(byv(r["baseline_pinball_p50"]))}" r="3.5"/>' for x, r in zip(bx, ph))
P["BT_H3_X"] = f1(bx[2]); P["BT_H3_Y"] = f1(byv(ph[2]["pinball_p50"])); P["BT_H3_BY"] = f1(byv(ph[2]["baseline_pinball_p50"]))
P["BT_XT"] = "".join(f'<text class="tick" x="{f1(x)}" y="{BY0+BH+16}" text-anchor="middle">{r["h"]}d</text>' for x, r in zip(bx, ph) if r["h"] in (1, 3, 5, 7, 10, 14))
P["BT_YT"] = "".join(f'<text class="tick" x="{BX0-8}" y="{f1(byv(v)+4)}" text-anchor="end">{v//1000}K</text><line class="grid" x1="{BX0}" x2="{BX0+BW}" y1="{f1(byv(v))}" y2="{f1(byv(v))}"/>' for v in [0, 50000, 100000, 150000, 200000])
P["BT_END_MODEL_Y"] = f1(byv(ph[-1]["pinball_p50"])); P["BT_END_BASE_Y"] = f1(byv(ph[-1]["baseline_pinball_p50"]))
cmin, cmax = 0.6, 1.0
cy = lambda v: BY0 + BH * (1 - (v - cmin) / (cmax - cmin))
P["CV_LINE"] = line(bx, [cy(r["coverage_90"]) for r in ph])
P["CV_PTS"] = "".join(f'<circle class="pt {"under" if r["coverage_90"]<0.9 else "model"}" cx="{f1(x)}" cy="{f1(cy(r["coverage_90"]))}" r="3.5"/>' for x, r in zip(bx, ph))
P["CV_TARGET_Y"] = f1(cy(0.9))
P["CV_UNDER"] = f'<rect class="underband" x="{f1(bx[0]-10)}" y="{BY0}" width="{f1(bx[2]-bx[0]+20)}" height="{BH}" rx="6"/>'
P["CV_YT"] = "".join(f'<text class="tick" x="{BX0-8}" y="{f1(cy(v)+4)}" text-anchor="end">{v:.1f}</text><line class="grid" x1="{BX0}" x2="{BX0+BW}" y1="{f1(cy(v))}" y2="{f1(cy(v))}"/>' for v in [0.6, 0.7, 0.8, 0.9, 1.0])
P["CV_XT"] = P["BT_XT"]

# ---------- Scenario before/after (payout-plus-2), 400x150 ----------
SX0, SY0, SW, SH = 8, 8, 384, 126
smin, smax = -1.5e6, 3.5e6
sy_ = lambda v: SY0 + SH * (1 - (v - smin) / (smax - smin))
sxs = [SX0 + SW * i / 14 for i in range(15)]
bpts = [p for p in scen["baseline"]["points"] if p["account_id"] == A]
spts = [p for p in scen["scenario"]["points"] if p["account_id"] == A]
for key, pp in [("BEFORE", bpts), ("AFTER", spts)]:
    lo = [sy_(sb)] + [sy_(p["balance_p05"]) for p in pp]; hi = [sy_(sb)] + [sy_(p["balance_p95"]) for p in pp]; mid = [sy_(sb)] + [sy_(p["balance_p50"]) for p in pp]
    P[f"SC_{key}_BAND"] = poly(sxs, hi, lo); P[f"SC_{key}_P50"] = line(sxs, mid)
P["SC_BUFFER_Y"] = f1(sy_(1e6))

# ---------- Pipeline particles need nothing baked ----------

tpl = open(sys.argv[1]).read()
missing = []
import re
def sub(m):
    k = m.group(1)
    if k not in P: missing.append(k); return ""
    return str(P[k])
out = re.sub(r"\{\{([A-Z0-9_]+)\}\}", sub, tpl)
open(sys.argv[2], "w").write(out)
print("written", len(out), "bytes; missing:", sorted(set(missing)))
