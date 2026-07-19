// ============================================================
// CONSOLA DE LA FÁBRICA — Generador de Productos (interfaz web)
//
// La Fábrica es un ALMACÉN de Core Assets. Esta consola es su única
// interfaz: eliges qué assets quieres y con un botón generas un
// producto nuevo (que sí es la app funcional con login, etc.).
//
// Uso:  node fabrica-consola.js     →  abre http://localhost:5000
//
// Sin dependencias externas (solo módulos nativos de Node).
// ============================================================
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.FABRICA_UI_PORT || 5000;
const ROOT = __dirname;

// Etiquetas legibles de cada Core Asset.
const LABELS = {
  'CA-001_DesignSystem': 'Design System (estilos base)',
  'CA-002_ModeloUsuarioFront': 'Modelo de Usuario (frontend)',
  'CA-003_AuthService': 'AuthService',
  'CA-004_AuthGuard': 'AuthGuard (rutas protegidas)',
  'CA-005_RoleGuard': 'RoleGuard (control por rol)',
  'CA-006_Login': 'Login',
  'CA-008_Dashboard': 'Dashboard',
  'CA-009_EsquemaGraphQLBase': 'Esquema GraphQL base',
  'CA-010_ResolversGraphQL': 'Resolvers GraphQL',
  'CA-011_JWTMiddleware': 'JWT Middleware',
  'CA-013_ConfiguracionBD': 'Configuración de BD',
  'CA-007_RegistroAbierto': 'Registro abierto — pantalla para crear cuentas',
  'CA-012_ModeloAuditoria': 'Auditoría — registro de eventos del sistema',
  'CA-016_ModuloMaterias': 'Materias — catálogo de cursos (CRUD)',
  'CA-017_ModuloInscripciones': 'Inscripciones — matrícula (requiere Materias)',
  'CA-019_ModuloCalificaciones': 'Calificaciones — notas por materia (requiere Materias)',
  'CA-020_GestionUsuarios': 'Gestión de Usuarios — crear estudiantes/docentes desde el panel admin',
  'CA-018_SetupBD_Automatico': 'Setup BD automático — crea la base y las tablas al arrancar',
};

/**
 * Dependencias entre assets, leídas del catálogo del instalador
 * (@fabrica/node-core) para no duplicar la información. Devuelve un mapa
 * configKey -> [configKeys de los que depende].
 * Ej: CA-019 (Calificaciones) depende de CA-016 (Materias).
 */
function leerDependencias() {
  try {
    const { FEATURES_CATALOG } = require('./packages/node-core/src/installer');
    const porId = FEATURES_CATALOG;
    const mapa = {};
    for (const f of Object.values(porId)) {
      mapa[f.configKey] = (f.dependsOn || [])
        .map(id => porId[id] && porId[id].configKey)
        .filter(Boolean);
    }
    return mapa;
  } catch {
    return {};
  }
}

function leerCatalogo() {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'factory-config.json'), 'utf8'));
  const ca = config.configuracion_nuevo_proyecto.core_assets || {};
  const obligatorios = ca.obligatorios || {};
  const opcionales = ca.opcionales || {};
  const deps = leerDependencias();
  const mapear = (obj) => Object.keys(obj).map(id => ({
    id,
    label: LABELS[id] || id,
    activo: obj[id] === true,
    dependeDe: deps[id] || [],
  }));
  return {
    obligatorios: mapear(obligatorios),
    opcionales: mapear(opcionales),
    tema: config.configuracion_nuevo_proyecto.tema || {},
  };
}

const PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🏭 Fábrica de Software — Generador</title>
<style>
  :root{--primary:#2563eb;--primary-h:#1d4ed8;--bg:#f8fafc;--surface:#fff;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--ok:#16a34a;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.5;padding:2rem 1rem}
  .wrap{max-width:820px;margin:0 auto}
  header{display:flex;align-items:center;gap:.75rem;margin-bottom:.25rem}
  .logo{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--primary),#4338ca);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem}
  h1{font-size:1.5rem}
  .sub{color:var(--muted);margin-bottom:1.5rem}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.5rem;margin-bottom:1.25rem;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .card h2{font-size:1rem;margin-bottom:1rem}
  label.field{display:block;font-weight:600;font-size:.85rem;margin-bottom:.35rem}
  input[type=text]{width:100%;padding:.7rem .9rem;font-size:1rem;border:1px solid var(--border);border-radius:9px}
  input[type=text]:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.2)}
  .asset{display:flex;align-items:flex-start;gap:.6rem;padding:.6rem;border:1px solid var(--border);border-radius:9px;margin-bottom:.5rem}
  .asset.locked{background:#f1f5f9;color:var(--muted)}
  .asset input{margin-top:.2rem;width:18px;height:18px}
  .asset .t{font-weight:600;font-size:.9rem}
  .asset .lock{margin-left:auto;font-size:.72rem;color:var(--muted);white-space:nowrap}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
  .colores{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem;margin-top:1rem}
  .color-item{display:flex;align-items:center;gap:.5rem;border:1px solid var(--border);border-radius:9px;padding:.5rem}
  .color-item input[type=color]{width:38px;height:32px;border:none;background:none;padding:0;cursor:pointer}
  .color-item .cl{font-size:.8rem;font-weight:600}
  @media(max-width:640px){.grid{grid-template-columns:1fr}}
  .opts{display:flex;align-items:center;gap:.5rem;margin:.75rem 0}
  button{background:var(--primary);color:#fff;border:none;padding:.85rem 1.5rem;font-size:1rem;font-weight:600;border-radius:10px;cursor:pointer;width:100%}
  button:hover:not(:disabled){background:var(--primary-h)}
  button:disabled{opacity:.6;cursor:not-allowed}
  pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:10px;font-size:.8rem;max-height:340px;overflow:auto;white-space:pre-wrap;display:none}
  pre.show{display:block}
  .ok{color:var(--ok);font-weight:600}
  small{color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
  <header><div class="logo">🏭</div><div><h1>Fábrica de Software</h1></div></header>
  <p class="sub">Almacén de Core Assets. Elige los que quieras y genera un producto nuevo.</p>

  <div class="card">
    <h2>1. Nombre del producto</h2>
    <label class="field" for="nombre">Se creará una carpeta con este nombre junto a la fábrica</label>
    <input type="text" id="nombre" placeholder="MiNuevoProducto" autocomplete="off">
  </div>

  <div class="card">
    <h2>2. Assets opcionales (elige los que quieras)</h2>
    <div id="opcionales"></div>
    <details style="margin-top:1rem">
      <summary style="cursor:pointer;color:var(--muted);font-size:.85rem">Assets obligatorios (siempre incluidos)</summary>
      <div id="obligatorios" style="margin-top:.75rem"></div>
    </details>
  </div>

  <div class="card">
    <h2>3. Apariencia del producto <small style="font-weight:400;color:var(--muted)">(CA-021 · se configura, no se activa)</small></h2>
    <label class="field" for="nombreProducto">Nombre visible de la aplicación</label>
    <input type="text" id="nombreProducto" placeholder="Sistema Académico" autocomplete="off">
    <div class="colores" id="colores"></div>
  </div>

  <div class="card">
    <h2>4. Generar</h2>
    <div class="opts">
      <input type="checkbox" id="instalar" checked>
      <label for="instalar"><small>Instalar dependencias automáticamente (más lento, pero queda listo para <code>npm start</code>)</small></label>
    </div>
    <button id="btn" onclick="generar()">🚀 Generar Proyecto</button>
    <pre id="out"></pre>
  </div>
</div>

<script>
let CATALOGO = { obligatorios: [], opcionales: [] };

// nombre corto legible de un asset (para los avisos de dependencia)
function nombreCorto(id){
  const a = CATALOGO.opcionales.find(x => x.id === id);
  return a ? a.label.split('—')[0].trim() : id;
}

async function cargar(){
  const r = await fetch('/api/catalogo');
  CATALOGO = await r.json();
  document.getElementById('opcionales').innerHTML = CATALOGO.opcionales.map(a => {
    const req = (a.dependeDe && a.dependeDe.length)
      ? '<span class="lock" data-req>requiere ' + a.dependeDe.map(d => nombreCorto(d)).join(' + ') + '</span>'
      : '';
    return '<label class="asset" data-id="'+a.id+'"><input type="checkbox" value="'+a.id+'" '+(a.activo?'checked':'')+
      ' onchange="alCambiar(this)">'+
      '<div><div class="t">'+a.label+'</div><small>'+a.id+'</small></div>'+req+'</label>';
  }).join('');
  document.getElementById('obligatorios').innerHTML = CATALOGO.obligatorios.map(a =>
    '<div class="asset locked"><input type="checkbox" checked disabled>'+
    '<div><div class="t">'+a.label+'</div></div><span class="lock">🔒 obligatorio</span></div>').join('');
  aplicarDependencias();
  pintarTema();
}

// CA-021 · Tema: parámetros (no toggles). Se renderizan como selectores de color.
const CAMPOS_COLOR = [
  ['colorPrimario', 'Primario'],
  ['colorPrimarioHover', 'Primario (hover)'],
  ['colorExito', 'Éxito'],
  ['colorError', 'Error'],
  ['colorFondo', 'Fondo'],
];

function pintarTema(){
  const t = CATALOGO.tema || {};
  document.getElementById('nombreProducto').value = t.nombreProducto || 'Sistema Académico';
  document.getElementById('colores').innerHTML = CAMPOS_COLOR.map(([k, etiqueta]) =>
    '<label class="color-item"><input type="color" id="'+k+'" value="'+(t[k] || '#2563eb')+'">'+
    '<span class="cl">'+etiqueta+'</span></label>').join('');
}

function leerTema(){
  const tema = { nombreProducto: document.getElementById('nombreProducto').value.trim() || 'Sistema Académico' };
  CAMPOS_COLOR.forEach(([k]) => { tema[k] = document.getElementById(k).value; });
  return tema;
}

function chk(id){ return document.querySelector('#opcionales input[value="'+id+'"]'); }

/**
 * Reglas de dependencia:
 *  - Al MARCAR un asset, se marcan automáticamente sus dependencias.
 *  - Al DESMARCAR uno, se desmarcan los que dependen de él.
 * Luego se deshabilitan visualmente los que no tienen su dependencia activa.
 */
function alCambiar(input){
  const id = input.value;
  const info = CATALOGO.opcionales.find(a => a.id === id);
  if(input.checked){
    (info.dependeDe || []).forEach(d => { const c = chk(d); if(c && !c.checked) c.checked = true; });
  } else {
    CATALOGO.opcionales
      .filter(a => (a.dependeDe || []).includes(id))
      .forEach(a => { const c = chk(a.id); if(c && c.checked) c.checked = false; });
  }
  aplicarDependencias();
}

function aplicarDependencias(){
  CATALOGO.opcionales.forEach(a => {
    const c = chk(a.id);
    if(!c) return;
    const faltan = (a.dependeDe || []).filter(d => { const dc = chk(d); return dc && !dc.checked; });
    const bloqueado = faltan.length > 0;
    c.disabled = bloqueado;
    if(bloqueado) c.checked = false;
    const fila = c.closest('.asset');
    fila.classList.toggle('locked', bloqueado);
    const aviso = fila.querySelector('[data-req]');
    if(aviso){
      aviso.textContent = bloqueado
        ? '🔒 requiere ' + faltan.map(d => nombreCorto(d)).join(' + ')
        : 'requiere ' + (a.dependeDe || []).map(d => nombreCorto(d)).join(' + ');
    }
  });
}

async function generar(){
  const nombre = document.getElementById('nombre').value.trim();
  const out = document.getElementById('out');
  const btn = document.getElementById('btn');
  if(!/^[A-Za-z0-9_-]+$/.test(nombre)){
    out.className='show'; out.textContent='⚠️  Nombre inválido. Usa solo letras, números, guiones o guion bajo (sin espacios).';
    return;
  }
  const opcionales = {};
  document.querySelectorAll('#opcionales input[type=checkbox]').forEach(c => { opcionales[c.value] = c.checked; });
  const instalar = document.getElementById('instalar').checked;

  btn.disabled=true; out.className='show'; out.textContent='⏳ Generando "'+nombre+'"...\\n';
  try{
    const res = await fetch('/api/generar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nombre, opcionales, instalar, tema: leerTema() })
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      out.textContent += dec.decode(value, {stream:true});
      out.scrollTop = out.scrollHeight;
    }
  }catch(e){
    out.textContent += '\\n❌ Error: '+e.message;
  }finally{
    btn.disabled=false;
    out.scrollTop = out.scrollHeight;
  }
}
cargar();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }
  if (req.method === 'GET' && req.url === '/api/catalogo') {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(leerCatalogo()));
    } catch (e) {
      res.writeHead(500); return res.end(JSON.stringify({ error: e.message }));
    }
  }
  if (req.method === 'POST' && req.url === '/api/generar') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      let datos;
      try { datos = JSON.parse(body); } catch { res.writeHead(400); return res.end('JSON inválido'); }

      const { nombre, opcionales, instalar, tema } = datos;
      if (!nombre || !/^[A-Za-z0-9_-]+$/.test(nombre)) {
        res.writeHead(400); return res.end('Nombre inválido');
      }
      if (fs.existsSync(path.join(ROOT, '..', nombre))) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`❌ Ya existe una carpeta "${nombre}" junto a la fábrica. Elige otro nombre.`);
      }

      const args = [path.join(ROOT, 'crear_nueva_app.js'), nombre];
      if (!instalar) args.push('--no-install');

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' });

      const child = spawn(process.execPath, args, {
        cwd: ROOT,
        env: {
          ...process.env,
          FABRICA_OPCIONALES: JSON.stringify(opcionales || {}),
          FABRICA_TEMA: JSON.stringify(tema || {}),
        },
      });
      child.stdout.on('data', d => res.write(d));
      child.stderr.on('data', d => res.write(d));
      child.on('close', (code) => {
        res.write(`\n\n${code === 0 ? '✅ LISTO' : '❌ El generador terminó con código ' + code}\n`);
        if (code === 0) {
          res.write(`\nSiguientes pasos:\n`);
          res.write(`  cd ../${nombre}\n`);
          res.write(instalar ? `  npm start\n` : `  cd backend && npm install\n  npm run dev\n`);
        }
        res.end();
      });
      child.on('error', (err) => { res.write(`\n❌ No se pudo iniciar el generador: ${err.message}\n`); res.end(); });
    });
    return;
  }
  res.writeHead(404); res.end('No encontrado');
});

server.listen(PORT, () => {
  console.log(`\n🏭 Consola de la Fábrica lista en:  http://localhost:${PORT}\n`);
  console.log(`   Ábrela en el navegador, elige los assets y genera tu producto.\n`);
});
