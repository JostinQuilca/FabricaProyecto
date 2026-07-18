# 🏭 Fábrica de Software Académico

**Línea de Productos de Software (SPLE).** Esta carpeta NO es una app: es el
**almacén** de todos los Core Assets (componentes reutilizables) y el
**generador** que arma productos nuevos a partir de los assets que elijas.

- Los **assets** (login, dashboard, materias, auditoría, etc.) viven aquí como
  librerías (`packages/@fabrica/*`) y como código base (`backend/`, `frontend/`).
- Un **producto** es una app funcional (con login, BD, etc.) que se genera
  eligiendo qué assets llevar.

---

## Generar un producto (interfaz gráfica)

```powershell
node fabrica-consola.js
```

Abre **http://localhost:5000**, escribe el nombre del producto, marca los assets
que quieras y pulsa **🚀 Generar Proyecto**. El producto se crea en una carpeta
junto a la fábrica.

> También por terminal:
> ```powershell
> node crear_nueva_app.js MiProducto
> ```

## Correr el producto generado

```powershell
docker start fabrica-pg     # tu PostgreSQL local (una vez)
cd ../MiProducto
npm start                   # crea la BD + tablas, crea el admin y levanta backend + frontend
```

- App: **http://localhost:4200** · Login: `admin@admin.edu` / `admin123`

## Agregar un asset a un producto ya generado (terminal)

Desde la carpeta del producto:

```powershell
node scripts/add-feature.js auditoria        # o: materias · inscripciones
```

Trae el asset desde el repositorio de GitHub, activa su feature toggle y prepara
su tabla. Reinicia el backend y el módulo queda disponible.

---

## Estructura del almacén

```
packages/
  design-system/   @fabrica/design-system   (CA-001)
  angular-auth/    @fabrica/angular-auth     (CA-002..CA-007)
  node-core/       @fabrica/node-core        (auth base, BD, JWT, auditoría, toggles, installer)
  academico/       @fabrica/academico        (CA-016 Materias, CA-017 Inscripciones)
backend/           esqueleto del producto (composition root)
frontend/          esqueleto del producto (Angular)
crear_nueva_app.js generador (CLI)
fabrica-consola.js generador (interfaz gráfica)
factory-config.json  catálogo de assets (obligatorios / opcionales)
```

## Documentación

- [Sprint 2 — Core Assets y arquitectura SPLE](docs/Sprint2_CoreAssets_SPLE.md)

## Equipo

Alex Luna · Leonel Arellano · Jostin Quilca — PO: Msc. Antonio Quiña
