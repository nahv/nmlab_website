import sys, numpy as np, potrace
from PIL import Image, ImageFilter
src, outdir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.array(im).astype(int)
r,g,b = a[...,0],a[...,1],a[...,2]
lum = 0.299*r+0.587*g+0.114*b
H,W = lum.shape

def dil(mask, n):
    if n<=0: return mask
    m = Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2*n+1))
    return np.array(m)>127

def bbox(mask):
    ys,xs = np.where(mask); return xs.min(), ys.min(), xs.max(), ys.max()

def path_d(mask, ox, oy):
    bm = potrace.Bitmap(~mask)
    plist = bm.trace(turdsize=8, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    parts=[]
    f=lambda p: f"{p.x-ox:.1f} {p.y-oy:.1f}"
    for c in plist:
        s=[f"M{f(c.start_point)}"]
        for seg in c.segments:
            if seg.is_corner: s.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else: s.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        s.append("Z"); parts.append("".join(s))
    return "".join(parts)

dark = lum < 110
orange = (r-b > 70) & (r > 150)
cream = (r-b > 7) & (r-g < 22) & (lum > 185) & ~orange
blue = (b - r > 12) & (lum > 80)

from collections import deque
def components(mask):
    H,W=mask.shape; seen=np.zeros_like(mask); comps=[]
    ys,xs=np.where(mask)
    for y,x in zip(ys,xs):
        if seen[y,x]: continue
        q=deque([(y,x)]); seen[y,x]=True; pts=[]
        while q:
            cy,cx=q.popleft(); pts.append((cy,cx))
            for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True; q.append((ny,nx))
        comps.append(pts)
    return comps
def keep_big(mask, minarea):
    out=np.zeros_like(mask)
    for c in components(mask):
        if len(c)>=minarea:
            ys,xs=zip(*c); out[list(ys),list(xs)]=True
    return out
def holes(mask):
    # regiones encerradas por mask (no conectadas al borde), solo dentro del bbox
    ys,xs=np.where(mask); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    sub=~mask[y0:y1,x0:x1]; out=np.zeros_like(mask); h,w=sub.shape
    for c in components(sub):
        cy,cx=zip(*c)
        if min(cy)==0 or min(cx)==0 or max(cy)==h-1 or max(cx)==w-1: continue
        out[np.array(cy)+y0,np.array(cx)+x0]=True
    return out
def ero(mask,n):
    m = Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MinFilter(2*n+1))
    return np.array(m)>127
topm = np.arange(H)[:,None] < 800
cream = dil(keep_big(ero(cream,3), 150), 3) & ~dil(orange,0) | holes(orange & topm) | holes(dark & topm)
blue = keep_big(blue, 80)

MARK_Y = 800
top = np.zeros_like(dark); top[:MARK_Y]=True
mark_any = (dark|orange|cream|blue) & top
x0,y0,x1,y1 = bbox(mark_any)
pad=2; x0-=pad;y0-=pad;x1+=pad;y1+=pad
layers = [
 ('cream', dil(cream&top,1), '#EAE1D8'),
 ('orange', dil(orange&top,1), '#D67227'),
 ('ink', dark&top, '#151515'),
 ('eyes', dil(blue&top,1), '#9DB8C6'),
]
w,h = x1-x0, y1-y0
ink = dark & top
comps = sorted(components(ink), key=len, reverse=True)
def tomask(c):
    m=np.zeros_like(ink); ys,xs=zip(*c); m[list(ys),list(xs)]=True; return m
ink1 = tomask(comps[0])                      # gato negro
ink2 = np.zeros_like(ink)                    # orejas + máscara del siamés
for c in comps[1:]:
    if len(c) > 60: ink2 |= tomask(c)
orange_m = dil(orange & top, 1)
eyes1 = holes(ink1)                          # ojos del gato negro
eyes3 = holes(orange & top)                  # ojos/nariz del naranja
cream_body = cream & ~eyes1 & ~eyes3
# la crema se extiende por debajo de los vecinos para que el parallax no abra huecos
cream_body = cream_body | (dil(cream_body, 10) & (ink1 | orange_m))
cream_body = dil(cream_body, 1) | holes(ink2)
fmt = lambda m: path_d(m, x0, y0)
out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">',
 f'<g class="cat cat-2"><path fill="#EAE1D8" d="{fmt(cream_body)}"/><path fill="#151515" d="{fmt(ink2)}"/><path fill="#9DB8C6" d="{fmt(dil(blue&top,1))}"/></g>',
 f'<g class="cat cat-1"><path fill="#EAE1D8" d="{fmt(dil(eyes1,1))}"/><path fill="#151515" d="{fmt(ink1)}"/></g>',
 f'<g class="cat cat-3"><path fill="#EAE1D8" d="{fmt(dil(eyes3,1))}"/><path fill="#D67227" d="{fmt(orange_m)}"/></g>',
 '</svg>']
open(f"{outdir}/mark.svg","w").write("\n".join(out))
print('mark', w, h, 'ink comps', [len(c) for c in comps[:6]])

bot = np.zeros_like(dark); bot[MARK_Y:]=True
wm = dark & bot
X0,Y0,X1,Y1 = bbox(wm); X0-=2;Y0-=2;X1+=2;Y1+=2
open(f"{outdir}/wordmark.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {X1-X0} {Y1-Y0}"><path fill="#151515" d="{path_d(wm,X0,Y0)}"/></svg>')
print('wordmark', X1-X0, Y1-Y0, 'mark bbox', x0,y0,x1,y1, 'wm bbox', X0,Y0,X1,Y1)
