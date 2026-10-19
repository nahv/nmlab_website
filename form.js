/* NM Labs · formulario de contacto por pasos (sección #contacto).
 *
 * Adaptado del de iudex.com.ar/neatech/ (2026-10-18): una pregunta por
 * pantalla, cinco pasos; un toque elige, Enter sigue, los números eligen en
 * desktop. Mientras se responde, la ficha se arma al costado.
 *
 * Envío: misma tabla que Neatech (public.event_leads en Supabase, anon sólo
 * INSERT) con evento «nmlabs-web». Si no hay señal, queda en una cola local y
 * se reintenta; client_id lo genera el browser, un reintento que ya había
 * entrado vuelve 409 y se da por enviado.
 *
 * En localhost el envío se SIMULA (no ensucia la tabla de producción ni
 * dispara el aviso por mail). Para probar el envío real: ?envio=real
 */
(() => {
  'use strict';

  const form = document.getElementById('lead-form');
  if (!form) return;

  const TOTAL = 5;
  const CLAVE_BORRADOR = 'nmlabs_contacto_borrador_v1';
  const CLAVE_COLA = 'nmlabs_contacto_cola_v1';
  const motion = document.documentElement.classList.contains('motion');
  const cfg = (window.NM_CONFIG && window.NM_CONFIG.leads) || {};
  const EVENTO = cfg.evento || 'nmlabs-web';

  const INDUSTRIAS = [
    { id: 'empresa', txt: 'Empresa' },
    { id: 'gobierno', txt: 'Organismo público o municipio' },
    { id: 'legal', txt: 'Estudio jurídico o juzgado' },
    { id: 'salud', txt: 'Salud' },
    { id: 'educacion', txt: 'Educación' },
    { id: 'ong', txt: 'Cooperativa u ONG' },
    { id: 'otra', txt: 'Otra' },
  ];

  const PROBLEMAS = {
    empresa: ['Atención y consultas', 'Documentos y contratos', 'Ventas y clientes', 'Back-office y administración', 'Integrar sistemas', 'Reportes para decidir'],
    gobierno: ['Expedientes y trámites', 'Mesa de entradas', 'Reclamos y consultas', 'Normativa y procedimientos', 'Notificaciones', 'Tableros de gestión'],
    legal: ['Expedientes y plazos', 'Escritos', 'Liquidaciones', 'Notificaciones', 'Trabajo en equipo'],
    salud: ['Turnos y agenda', 'Historias y documentos', 'Consultas por WhatsApp', 'Facturación y obras sociales', 'Reportes para decidir'],
    educacion: ['Inscripciones y legajos', 'Comunicación con familias', 'Seguimiento académico', 'Documentos', 'Reportes para decidir'],
    ong: ['Socios y aportes', 'Proyectos y rendiciones', 'Documentos', 'Comunicación', 'Reportes para decidir'],
    otra: ['Atención y consultas', 'Documentos y papeles', 'Agenda y turnos', 'Integrar sistemas', 'Reportes para decidir'],
  };

  // «Primer paso posible» y por dónde iría (reglas / modelo liviano / modelo de
  // frontera, como el enrutador de la sección Eficiencia). Reglas explícitas,
  // no IA: la ficha dice lo que hace.
  const R = 'reglas', L = 'liviano', F = 'frontera';
  const IDEAS = {
    'Atención y consultas': ['Un asistente que responde lo frecuente con tus fuentes y deriva a una persona lo que no sabe, con cada caso registrado.', [R, L]],
    'Documentos y contratos': ['Lectura automática de contratos: partes, fechas y cláusulas clave en una ficha, con alertas de vencimiento.', [L, F]],
    'Ventas y clientes': ['Una ficha por cliente con su historial y próximos pasos, y un resumen semanal de oportunidades.', [R, L]],
    'Back-office y administración': ['Lo repetitivo (cargar, copiar, conciliar) pasa a un flujo automático con control humano al final.', [R, L]],
    'Integrar sistemas': ['Conectar lo que hoy se copia a mano entre sistemas, con registro de cada sincronización.', [R]],
    'Reportes para decidir': ['Un tablero que se arma solo con lo que ya cargan y un resumen semanal en lenguaje claro.', [R, L]],
    'Expedientes y trámites': ['Cada trámite con su línea de tiempo, responsable y plazos, como hicimos en Iudex para los juzgados.', [R, L]],
    'Mesa de entradas': ['Ingreso digital que clasifica lo que llega, lo asigna al área correcta y le da constancia a quien lo presenta.', [R, L]],
    'Reclamos y consultas': ['Cada reclamo como un caso con área responsable, plazo y respuesta registrada.', [R, L]],
    'Normativa y procedimientos': ['Un asistente interno que responde sobre la normativa vigente citando el artículo exacto.', [L, F]],
    'Notificaciones': ['Notificaciones con formato oficial generadas desde el expediente, listas para firmar.', [R, L]],
    'Tableros de gestión': ['Indicadores que se arman solos con lo que ya se carga.', [R]],
    'Expedientes y plazos': ['Esto ya lo resuelve Iudex: expedientes, movimientos y plazos en un solo lugar.', [R]],
    'Escritos': ['Esto ya lo resuelve Iudex: plantillas, firma y Nexus redactando con fuentes.', [L, F]],
    'Liquidaciones': ['Esto ya lo resuelve Iudex: la planilla de capital e intereses con tasas oficiales.', [R]],
    'Trabajo en equipo': ['Esto ya lo resuelve Iudex: el equipo trabaja sobre el mismo expediente en tiempo real.', [R]],
    'Turnos y agenda': ['Agenda compartida con recordatorios automáticos y menos ausencias.', [R]],
    'Historias y documentos': ['Documentos ordenados por persona, con búsqueda y un resumen de lo último.', [L]],
    'Consultas por WhatsApp': ['Cada consulta que entra por WhatsApp se vuelve un caso con responsable y estado.', [R, L]],
    'Facturación y obras sociales': ['El estado de cada presentación en un solo lugar, con lo pendiente arriba.', [R]],
    'Inscripciones y legajos': ['Inscripciones online con documentos y el estado de cada legajo.', [R, L]],
    'Comunicación con familias': ['Avisos y respuestas ordenados por familia, con historial.', [R]],
    'Seguimiento académico': ['Alertas tempranas por alumno y un resumen para cada docente.', [R, L]],
    'Documentos': ['Documentos ordenados, con búsqueda, plantillas y vencimientos que avisan solos.', [L]],
    'Socios y aportes': ['Padrón de socios con aportes al día y recordatorios automáticos.', [R]],
    'Proyectos y rendiciones': ['Cada proyecto con su presupuesto, comprobantes y una rendición que se arma sola.', [R, L]],
    'Comunicación': ['Mensajes segmentados y respuestas registradas, sin perder el hilo.', [R]],
    'Documentos y papeles': ['Los papeles de cada caso juntos, con búsqueda y vencimientos que avisan solos.', [L]],
    'Agenda y turnos': ['Agenda compartida con recordatorios automáticos.', [R]],
  };
  const RUTA = { reglas: ['', 'Reglas'], liviano: ['l', 'Modelo liviano'], frontera: ['f', 'Modelo de frontera'] };

  const TAMANOS = ['Sólo yo', '2 a 10', '11 a 50', '51 a 200', 'Más de 200'];

  /* ---------- Estado ---------- */

  const $ = (s, el = form) => el.querySelector(s);
  const $$ = (s, el = form) => [...el.querySelectorAll(s)];
  const ficha = document.querySelector('[data-ficha]');
  const $f = (s) => ficha.querySelector(s);

  const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));
  const vacio = () => ({
    client_id: nuevoId(), industria: null, industria_otra: '', problemas: [], problema: '',
    tamano: null, nombre: '', organizacion: '', contacto_tipo: 'whatsapp', contacto: '',
  });

  const leer = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } };
  const borrar = (k) => { try { localStorage.removeItem(k); } catch { /* idem */ } };

  let datos = vacio();
  let paso = 1;

  /* ---------- Opciones ---------- */

  function opcionesIndustria() {
    $('[data-campo="industria"]').innerHTML = INDUSTRIAS.map((o, i) =>
      `<label class="opt-card"><input type="radio" name="industria" value="${o.id}"><span><kbd>${i + 1}</kbd>${o.txt}</span></label>`).join('');
  }
  function opcionesTamano() {
    $('[data-campo="tamano"]').innerHTML = TAMANOS.map((t, i) =>
      `<label class="opt-card"><input type="radio" name="tamano" value="${t}"><span><kbd>${i + 1}</kbd>${t}</span></label>`).join('');
  }
  function chipsProblemas() {
    const lista = PROBLEMAS[datos.industria] || PROBLEMAS.otra;
    // Lo elegido que ya no está en la lista nueva se descarta.
    datos.problemas = datos.problemas.filter((p) => lista.includes(p));
    $('[data-campo="problemas"]').innerHTML = lista.map((p) =>
      `<label class="chip"><input type="checkbox" name="problemas" value="${p}"${datos.problemas.includes(p) ? ' checked' : ''}><span>${p}</span></label>`).join('');
  }

  /* ---------- Validación ---------- */

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const telOk = (v) => { const d = v.replace(/\D/g, ''); return d.length >= 8 && d.length <= 15; };
  const contactoValido = () => (datos.contacto_tipo === 'email' ? emailOk(datos.contacto) : telOk(datos.contacto));

  function pasoValido(n = paso) {
    switch (n) {
      case 1: return !!datos.industria;
      case 2: return datos.problemas.length > 0 || datos.problema.trim().length >= 3;
      case 3: return !!datos.tamano;
      case 4: return datos.nombre.trim().length >= 2;
      case 5: return datos.contacto.trim().length >= 5;
      default: return true;
    }
  }

  /* ---------- Pasos ---------- */

  const btnSeguir = $('[data-accion="siguiente"]');
  const btnAtras = $('[data-accion="atras"]');
  const nav = $('[data-nav]');
  const hint = $('[data-hint]');
  const anuncio = $('[data-anuncio]');

  function pintarNav() {
    const fin = paso > TOTAL;
    nav.hidden = fin;
    btnAtras.hidden = paso <= 1;
    btnSeguir.disabled = !pasoValido();
    btnSeguir.firstChild.textContent = paso === TOTAL ? 'Enviar ' : 'Seguir ';
    hint.textContent = paso === 2 ? '⌘ Enter ↵ para seguir' : paso === TOTAL ? 'Enter ↵ para enviar' : 'Enter ↵ para seguir';
    $('[data-paso-actual]').textContent = String(Math.min(paso, TOTAL)).padStart(2, '0');
    form.querySelector('.lead-progress').style.setProperty('--p', Math.min(1, (paso - 1 + (fin ? 1 : 0)) / TOTAL));
  }

  function irA(n, { foco = true } = {}) {
    const atras = n < paso;
    paso = n;
    $$('.lead-step').forEach((s) => {
      const on = Number(s.dataset.paso) === n;
      s.hidden = !on;
      s.classList.toggle('is-on', on);
      s.classList.remove('is-entering', 'from-back');
      if (on && motion) { void s.offsetWidth; s.classList.add('is-entering'); if (atras) s.classList.add('from-back'); }
    });
    if (n === 2) chipsProblemas();
    pintarNav();
    if (n <= TOTAL) {
      anuncio.textContent = `Paso ${n} de ${TOTAL}`;
      if (foco) {
        const step = $(`.lead-step[data-paso="${n}"]`);
        const primero = step.querySelector('input:checked, input:not([type="hidden"]):not(.lead-hp), textarea');
        if (primero && matchMedia('(pointer: fine)').matches) primero.focus({ preventScroll: true });
      }
    }
    guardar();
  }

  function siguiente() {
    if (!pasoValido()) return;
    if (paso === TOTAL) { enviar(); return; }
    irA(paso + 1);
  }

  /* ---------- Ficha ---------- */

  const nombreIndustria = () => {
    const o = INDUSTRIAS.find((x) => x.id === datos.industria);
    if (!o) return '';
    return datos.industria === 'otra' && datos.industria_otra.trim() ? datos.industria_otra.trim() : o.txt;
  };

  function dato(clave, valor) {
    const el = $f(`[data-dato="${clave}"]`);
    const dd = el.querySelector('dd');
    const nuevo = valor || '—';
    if (dd.textContent !== nuevo) {
      dd.textContent = nuevo;
      el.classList.remove('is-new'); void el.offsetWidth; if (valor) el.classList.add('is-new');
    }
    el.classList.toggle('is-empty', !valor);
    return valor ? 1 : 0;
  }

  function pintarFicha() {
    let n = 0;
    n += dato('industria', nombreIndustria());
    const problemas = [...datos.problemas];
    if (datos.problema.trim()) problemas.push(`«${datos.problema.trim().slice(0, 90)}${datos.problema.trim().length > 90 ? '…' : ''}»`);
    n += dato('problemas', problemas.join(' · '));
    n += dato('tamano', datos.tamano ? `${datos.tamano} ${datos.tamano === 'Sólo yo' ? '' : 'personas'}`.trim() : '');
    const medio = contactoValido() ? `por ${datos.contacto_tipo === 'email' ? 'email' : 'WhatsApp'}` : '';
    const quien = [datos.nombre.trim(), datos.organizacion.trim(), medio].filter(Boolean).join(' · ');
    n += dato('quien', quien);
    const cuenta = Math.min(5, n + (contactoValido() ? 1 : 0));
    $f('[data-ficha-cuenta]').textContent = `${cuenta} de 5`;
    $f('[data-ficha-ref]').textContent = `NM-${datos.client_id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
    if (paso <= TOTAL) $f('[data-ficha-estado]').textContent = cuenta === 5 ? 'lista para enviar' : 'borrador';

    const idea = $f('[data-ficha-idea]');
    const primero = datos.problemas.find((p) => IDEAS[p]);
    if (primero || datos.problema.trim().length >= 12) {
      const [txt, ruta] = primero ? IDEAS[primero] : ['Lo leemos con calma y te proponemos un primer paso concreto.', [R, L]];
      $f('[data-idea-texto]').textContent = txt;
      $f('[data-idea-ruta]').innerHTML = ruta.map((r) => `<span><i class="${RUTA[r][0]}"></i>${RUTA[r][1]}</span>`).join('');
      idea.hidden = false;
    } else {
      idea.hidden = true;
    }
  }

  // Teléfono: la ficha es un acordeón debajo del formulario.
  const fichaBody = $f('.ficha-body');
  const fichaBtn = $f('[data-accion="ficha"]');
  const angosto = matchMedia('(max-width: 960px)');
  const ajustarFicha = () => {
    if (angosto.matches) { fichaBody.hidden = fichaBtn.getAttribute('aria-expanded') !== 'true'; }
    else { fichaBody.hidden = false; }
  };
  fichaBtn.addEventListener('click', () => {
    const abierta = fichaBtn.getAttribute('aria-expanded') === 'true';
    fichaBtn.setAttribute('aria-expanded', String(!abierta));
    ajustarFicha();
  });
  angosto.addEventListener ? angosto.addEventListener('change', ajustarFicha) : angosto.addListener(ajustarFicha);

  /* ---------- Borrador ---------- */

  let tGuardado = 0;
  function guardar() {
    pintarFicha();
    if (paso > TOTAL) return;
    const algo = datos.industria || datos.problema || datos.nombre;
    if (!algo) return;
    escribir(CLAVE_BORRADOR, { datos, paso });
    const aviso = $('[data-guardado]');
    aviso.hidden = false;
    clearTimeout(tGuardado);
    tGuardado = setTimeout(() => { aviso.hidden = true; }, 1800);
  }

  function aplicarDatosAlDom() {
    $$('input[name="industria"]').forEach((i) => { i.checked = i.value === datos.industria; });
    $('[data-otra]').hidden = datos.industria !== 'otra';
    $('#lead-industria-otra').value = datos.industria_otra;
    $('#lead-problema').value = datos.problema;
    $$('input[name="tamano"]').forEach((i) => { i.checked = i.value === datos.tamano; });
    $('#lead-nombre').value = datos.nombre;
    $('#lead-organizacion').value = datos.organizacion;
    $$('input[name="contacto_tipo"]').forEach((i) => { i.checked = i.value === datos.contacto_tipo; });
    $('#lead-contacto').value = datos.contacto;
    ajustarMedio();
  }

  /* ---------- Eventos de campos ---------- */

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'industria') {
      datos.industria = t.value;
      $('[data-otra]').hidden = t.value !== 'otra';
      pintarNav(); guardar();
      // Un toque elige y avanza (salvo «Otra», que pide el texto).
      if (t.value !== 'otra') setTimeout(() => paso === 1 && siguiente(), motion ? 260 : 0);
      else $('#lead-industria-otra').focus();
    } else if (t.name === 'tamano') {
      datos.tamano = t.value; pintarNav(); guardar();
      setTimeout(() => paso === 3 && siguiente(), motion ? 260 : 0);
    } else if (t.name === 'problemas') {
      datos.problemas = $$('input[name="problemas"]:checked').map((i) => i.value);
      pintarNav(); guardar();
    } else if (t.name === 'contacto_tipo') {
      datos.contacto_tipo = t.value; ajustarMedio(); pintarNav(); guardar();
      $('#lead-contacto').focus();
    }
  });

  form.addEventListener('input', (e) => {
    const t = e.target;
    const mapa = { industria_otra: 'industria_otra', problema: 'problema', nombre: 'nombre', organizacion: 'organizacion', contacto: 'contacto' };
    if (!mapa[t.name]) return;
    datos[mapa[t.name]] = t.value;
    if (t.name === 'contacto') { t.removeAttribute('aria-invalid'); $('.lead-error').hidden = true; }
    pintarNav(); guardar();
  });

  function ajustarMedio() {
    const input = $('#lead-contacto');
    const email = datos.contacto_tipo === 'email';
    $('[data-label-contacto]').textContent = email ? 'Tu email' : 'Tu WhatsApp';
    input.type = email ? 'email' : 'tel';
    input.inputMode = email ? 'email' : 'tel';
    input.autocomplete = email ? 'email' : 'tel';
    input.placeholder = email ? 'nombre@organizacion.com' : '379 412 3456';
  }

  /* ---------- Teclado ---------- */

  form.addEventListener('keydown', (e) => {
    if (paso > TOTAL) return;
    const enTexto = e.target.tagName === 'TEXTAREA';
    if (e.key === 'Enter' && !e.shiftKey) {
      if (enTexto && !(e.metaKey || e.ctrlKey)) return;
      if (e.target.tagName === 'BUTTON' && e.target !== btnSeguir) return;
      e.preventDefault();
      siguiente();
      return;
    }
    // 1-9 eligen en los pasos de opciones (si no se está escribiendo).
    const escribiendo = enTexto || (e.target.tagName === 'INPUT' && !['radio', 'checkbox'].includes(e.target.type));
    if (/^[1-9]$/.test(e.key) && !escribiendo && (paso === 1 || paso === 3)) {
      const r = $$(`.lead-step[data-paso="${paso}"] input[type="radio"]`)[Number(e.key) - 1];
      if (r) { e.preventDefault(); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });

  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const a = b.dataset.accion;
    if (a === 'siguiente') siguiente();
    else if (a === 'atras' && paso > 1) irA(paso - 1);
    else if (a === 'reiniciar' || a === 'otra') reiniciar();
    else if (a === 'dictar') dictar();
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); siguiente(); });

  function reiniciar() {
    borrar(CLAVE_BORRADOR);
    datos = vacio();
    $('[data-retomar]').hidden = true;
    $f('[data-ficha-estado]').textContent = 'borrador';
    aplicarDatosAlDom();
    irA(1);
  }

  /* ---------- Dictado (Web Speech API, si el navegador la tiene) ---------- */

  const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $('[data-accion="dictar"]');
  const avisoMic = $('[data-aviso-mic]');
  let rec = null;
  if (Reconocimiento) mic.hidden = false;
  function dictar() {
    if (rec) { rec.stop(); return; }
    try {
      rec = new Reconocimiento();
    } catch { avisoMic.textContent = 'Tu navegador no permite dictar acá. Escribilo y listo.'; avisoMic.hidden = false; return; }
    rec.lang = 'es-AR'; rec.interimResults = true; rec.continuous = true;
    const base = $('#lead-problema').value.trim();
    rec.onresult = (ev) => {
      let txt = '';
      for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      const v = (base ? `${base} ` : '') + txt.trim();
      $('#lead-problema').value = v; datos.problema = v; pintarNav(); pintarFicha();
    };
    rec.onerror = (ev) => {
      avisoMic.textContent = ev.error === 'not-allowed'
        ? 'No tenemos permiso para usar el micrófono. Podés habilitarlo en el navegador o escribirlo.'
        : 'No pudimos escucharte bien. Probá de nuevo o escribilo.';
      avisoMic.hidden = false;
    };
    rec.onend = () => {
      rec = null; mic.setAttribute('aria-pressed', 'false'); $('[data-mic-txt]').textContent = 'Dictar'; guardar();
    };
    avisoMic.hidden = true;
    mic.setAttribute('aria-pressed', 'true'); $('[data-mic-txt]').textContent = 'Escuchando…';
    rec.start();
  }

  /* ---------- Envío (con cola local si no hay señal) ---------- */

  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.localhost');
  const simular = !cfg.url || (local && new URLSearchParams(location.search).get('envio') !== 'real');

  function payload() {
    return {
      client_id: datos.client_id,
      evento: EVENTO,
      origen: 'web',
      industria: datos.industria,
      industria_otra: datos.industria === 'otra' ? datos.industria_otra.trim().slice(0, 120) || null : null,
      problemas: datos.problemas.slice(0, 12),
      problema: datos.problema.trim().slice(0, 2000) || null,
      tamano: datos.tamano,
      nombre: datos.nombre.trim().slice(0, 120),
      organizacion: datos.organizacion.trim().slice(0, 160) || null,
      contacto_tipo: datos.contacto_tipo,
      contacto: datos.contacto.trim().slice(0, 160),
      consentimiento: true,
    };
  }

  /** true = entró (o ya había entrado); false = reintentar más tarde. */
  async function mandar(p) {
    if (simular) {
      if (!local) { console.error('[nmlabs] falta la configuración de envío (config.js): queda en cola'); return false; }
      await new Promise((r) => setTimeout(r, 650));
      console.info('[nmlabs] envío simulado en local (usá ?envio=real para mandarlo):', p);
      return true;
    }
    try {
      const ctrl = new AbortController();
      const corte = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(`${cfg.url}/rest/v1/event_leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(p),
        signal: ctrl.signal,
      });
      clearTimeout(corte);
      if (r.ok || r.status === 409) return true;
      console.warn('[nmlabs] rechazo del servidor', r.status, await r.text().catch(() => ''));
      return false;
    } catch {
      return false;
    }
  }

  const cola = () => leer(CLAVE_COLA, []);
  async function vaciarCola() {
    const pendientes = cola();
    if (!pendientes.length) return 0;
    const quedan = [];
    for (const p of pendientes) if (!(await mandar(p))) quedan.push(p);
    if (quedan.length) escribir(CLAVE_COLA, quedan); else borrar(CLAVE_COLA);
    return quedan.length;
  }

  let enviando = false;
  async function enviar() {
    if (enviando || paso !== TOTAL) return;
    if ($('.lead-hp').value) { finalizar(true); return; } // bot: éxito silencioso
    if (!contactoValido()) {
      const input = $('#lead-contacto');
      input.setAttribute('aria-invalid', 'true');
      $('.lead-error').textContent = datos.contacto_tipo === 'email'
        ? 'Revisá el email: falta algo (ej.: nombre@organizacion.com).'
        : 'Revisá el número: con característica, sin 0 ni 15 (ej.: 379 412 3456).';
      $('.lead-error').hidden = false;
      input.focus();
      return;
    }
    enviando = true;
    btnSeguir.disabled = true;
    btnSeguir.firstChild.textContent = 'Enviando… ';
    $f('[data-ficha-estado]').textContent = 'enviando…';
    const p = payload();
    const ok = await mandar(p);
    if (!ok) escribir(CLAVE_COLA, [...cola().filter((x) => x.client_id !== p.client_id), p]);
    enviando = false;
    finalizar(ok);
  }

  function finalizar(ok) {
    borrar(CLAVE_BORRADOR);
    const nombre = datos.nombre.trim().split(/\s+/)[0] || '';
    $('[data-fin-titulo]').textContent = `Listo${nombre ? `, ${nombre}` : ''}.`;
    $('[data-fin-mensaje]').textContent = datos.contacto_tipo === 'email'
      ? 'Te escribimos por mail en las próximas 48 horas hábiles con una primera idea concreta.'
      : 'Te escribimos por WhatsApp en las próximas 48 horas hábiles con una primera idea concreta.';
    $('[data-estado-envio]').textContent = ok
      ? `Ficha ${$f('[data-ficha-ref]').textContent} recibida.`
      : 'Quedó guardada en este navegador: la mandamos sola apenas haya conexión.';
    $f('[data-ficha-estado]').textContent = ok ? 'enviada' : 'en cola';
    irA(TOTAL + 1, { foco: false });
    $('[data-fin-titulo]').focus({ preventScroll: true });
  }

  /* ---------- Arranque ---------- */

  opcionesIndustria();
  opcionesTamano();
  const borrador = leer(CLAVE_BORRADOR, null);
  if (borrador && borrador.datos && borrador.datos.client_id) {
    datos = { ...vacio(), ...borrador.datos };
    aplicarDatosAlDom();
    $('[data-retomar]').hidden = false;
    paso = Math.min(TOTAL, Math.max(1, borrador.paso || 1));
  }
  ajustarFicha();
  irA(paso, { foco: false });
  vaciarCola();
  addEventListener('online', vaciarCola);
})();
