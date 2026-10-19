# NM Labs — sitio web

Sitio estático de una sola página para NM Labs (Max & Nahuel): software con IA,
aplicado con criterio, para empresas y organismos públicos. Iudex es el caso.

Sin framework ni build: `index.html` + `styles.css` + `main.js` + `assets/`.

## Probar en local

```bash
python3 -m http.server 4173 --bind 127.0.0.1
# http://localhost:4173/
```

## Qué hay

| Archivo | Para qué |
|---|---|
| `index.html` | contenido (es-AR). La marca del hero va inline (ver abajo) |
| `styles.css` | paleta del logo como variables en `:root` (tinta, crema, naranja) |
| `main.js` | entrada del hero, parallax de los gatos, máquina de escribir, enrutador en canvas, demo de Nexus, línea del método |
| `assets/mark.svg` | marca vectorizada del logo, un `<g>` por gato |
| `assets/wordmark.svg` | «NM LABS» vectorizado |
| `assets/nmlabs-logo-original.jpg` | logo original (fuente de la vectorización) |
| `assets/og.png`, `apple-touch-icon.png`, `favicon-32.png` | redes e íconos |
| `_headers` | cabeceras para Cloudflare Pages / Netlify |
| `tools/trace_logo.py` | vectoriza el JPG → `mark.svg` / `wordmark.svg` (requiere `pip install potracer pillow numpy`) |
| `tools/inline_mark.py` | copia `assets/mark.svg` dentro del hero de `index.html` |

Si cambia el logo:

```bash
python3 tools/trace_logo.py assets/nmlabs-logo-original.jpg assets
python3 tools/inline_mark.py
```

## Movimiento y accesibilidad

- Todo lo animado usa `transform`/`opacity` o un único `<canvas>`, y se pausa fuera de pantalla
  o con la pestaña oculta.
- Con `prefers-reduced-motion: reduce` (o sin JS) el sitio queda estático y completo.
- Contraste AA en texto; el naranja de texto chico es `--orange-text`.

## Pendiente antes de publicar

- Confirmar el correo de contacto (hoy `hola@nmlabs.com.ar`, a definir) y el dominio.
- `og:image` necesita URL absoluta cuando haya dominio.
- Opcional: servir las fuentes desde el propio sitio en vez de Google Fonts.
