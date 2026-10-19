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
| `nosotros/index.html` | página Nosotros (fichas de Nahuel y Max), enlazada desde el pie |
| `form.js` + `config.js` | formulario de contacto por pasos con ficha en vivo (ver «Formulario») |
| `styles.css` | paleta del logo como variables en `:root` (tinta, crema, naranja) |
| `main.js` | entrada del hero, parallax de los gatos, máquina de escribir, enrutador en canvas, demo de Nexus, línea del método |
| `assets/mark.svg` | marca vectorizada del logo, un `<g>` por gato |
| `assets/wordmark.svg` | «NM LABS» vectorizado |
| `assets/nmlabs-logo-original.jpg` | logo original (fuente de la vectorización) |
| `assets/og.png`, `apple-touch-icon.png`, `favicon-32.png` | redes e íconos |
| `assets/team/` | fotos del equipo (560 px) |
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

## Formulario

Adaptado del de iudex.com.ar/neatech/: cinco pasos, un toque elige y avanza,
Enter sigue, los números eligen; la ficha (con «primer paso posible» y por
dónde iría: reglas / modelo liviano / modelo de frontera) se arma al costado.
Guarda borrador en el navegador y, si no hay señal, deja el envío en cola.

Escribe en la misma tabla que Neatech (`public.event_leads` del Supabase de
iudex.com.ar, anon sólo INSERT) con `evento = 'nmlabs-web'`. La configuración
pública está en `config.js`.

En localhost el envío se **simula** (no ensucia producción ni dispara el aviso
por mail); para mandarlo de verdad: `http://localhost:4173/?envio=real`.

## Publicación

GitHub Pages desde `main` (raíz). `.nojekyll` evita el procesamiento de Jekyll.
Al cambiar CSS/JS, subir el `?v=` de los `<link>`/`<script>` en ambas páginas.

## Pendiente

- Dominio propio (CNAME) y `og:image` con URL absoluta.
- Opcional: servir las fuentes desde el propio sitio en vez de Google Fonts.
