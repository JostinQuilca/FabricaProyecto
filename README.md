# Fábrica de Software – Sistema Académico

Línea de Productos de Software (SPLE) con **Node.js + Apollo GraphQL + Angular + JWT**.

La fábrica genera productos académicos derivados a partir de **Core Assets** reutilizables,
con variabilidad configurable (feature toggles).

## Arquitectura (monorepo NPM Workspaces)

```
packages/
  design-system/   @fabrica/design-system   (CA-001)
  angular-auth/    @fabrica/angular-auth     (CA-002..CA-007)
  node-core/       @fabrica/node-core        (CA-009..CA-013 + feature-toggles)
  academico/       @fabrica/academico        (CA-016 Materias, CA-017 Inscripciones)
backend/           servidor de referencia (Apollo GraphQL)
frontend/          app de referencia (Angular)
crear_nueva_app.js generador de productos derivados
```

## Módulos (Sprint 2)

- **CA-016 · Materias** — CRUD de materias/cursos (backend + frontend).
- **CA-017 · Inscripciones** — matrícula de estudiantes en materias.
- **Panel de Administración** — vista exclusiva del rol ADMIN.

## Ejecución rápida (MVP)

```bash
# Backend
cd backend && npm install
cp .env.example .env          # completar credenciales
npm run db:migrate:academico  # crea tablas materias/inscripciones
npm run dev                   # http://localhost:4000

# Frontend
cd frontend && npm install && npm start   # http://localhost:4200
```

## Generar un producto derivado

```bash
node crear_nueva_app.js SistemaMatriculas
```

Configura los Core Assets a incluir en `factory-config.json` antes de generar.

## Documentación

- [Sprint 2 — Core Assets y Arquitectura SPLE](docs/Sprint2_CoreAssets_SPLE.md)
- Documentación de Core Assets: `Documentacion_Core_Assets_v3.docx`

## Equipo

Alex Luna · Leonel Arellano · Jostin Quilca — PO: Msc. Antonio Quiña
