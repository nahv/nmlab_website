"""Inserta assets/mark.svg dentro del hero de index.html (entre los marcadores mark:start/end).

Cada gato queda en <g class="cat cat-N"><g class="cat-inner">…</g></g>: el grupo de afuera
recibe el parallax del puntero y el de adentro la animación de entrada.
Uso: python3 tools/inline_mark.py
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
svg = (root / "assets/mark.svg").read_text()
w, h = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg).groups())
pad = 12  # margen para el parallax; abajo no, así los gatos "salen" de la línea base
groups = re.findall(r'<g class="(cat cat-\d)">(.*?)</g>', svg, re.S)
body = "\n".join(f'<g class="{cls}"><g class="cat-inner">{inner}</g></g>' for cls, inner in groups)
inline = (f'<svg viewBox="{-pad} {-pad} {w + 2 * pad:g} {h + pad:g}" xmlns="http://www.w3.org/2000/svg" '
          f'focusable="false">\n{body}\n</svg>')
html_path = root / "index.html"
html = html_path.read_text()
html, n = re.subn(r"(<!-- mark:start -->).*?(\s*<!-- mark:end -->)", lambda m: m.group(1) + "\n" + inline + m.group(2), html, flags=re.S)
assert n == 1, "no encontré los marcadores mark:start/end"
html_path.write_text(html)
print(f"mark inline: {len(groups)} gatos, viewBox {-pad} {-pad} {w + 2 * pad:g} {h + pad:g}")
