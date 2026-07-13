# Sprint 2 — Core Assets Académicos y Arquitectura de Librerías

**Proyecto:** Fábrica de Software Académico — Línea de Productos de Software (SPLE)
**Sprint:** 2 (2026-06-30 → 2026-07-13)
**Product Owner:** Msc. Antonio Quiña · **Scrum Master:** Leonel Arellano
**Equipo:** Alex Luna, Leonel Arellano, Jostin Quilca

---

## 1. Objetivo del Sprint

Ampliar la Línea de Productos con dos nuevos **Core Assets** del dominio académico
(Materias e Inscripciones), un Panel de Administración, y evolucionar la fábrica hacia
una **arquitectura de librerías NPM** con **variabilidad configurable** (feature toggles),
validada mediante un producto derivado (**SistemaMatriculas**).

---

## 2. Core Assets nuevos (formato SPLE)

### CA-016 · Módulo de Materias

| Campo | Detalle |
|-------|---------|
| **Tipo** | Variabilidad (opcional) |
| **Capa** | Backend (GraphQL) + Frontend (Angular) |
| **Commonality / Variabilidad** | Variabilidad: un producto puede incluirlo o no |
| **Entidad** | `materias(id, codigo, nombre, creditos, descripcion, docente_id)` |
| **API GraphQL** | Query: `materias`, `materia(id)` · Mutation: `crearMateria`, `actualizarMateria`, `eliminarMateria` |
| **Autorización** | Crear/editar: ADMIN y DOCENTE · Eliminar: solo ADMIN |
| **Frontend** | Componente `MateriasComponent` (tabla + formulario CRUD reactivo) |
| **Auditoría** | Acciones `CREAR_MATERIA`, `ACTUALIZAR_MATERIA`, `ELIMINAR_MATERIA` (integración con CA-012) |

### CA-017 · Módulo de Inscripciones

| Campo | Detalle |
|-------|---------|
| **Tipo** | Variabilidad (opcional) |
| **Depende de** | CA-016 (Materias) |
| **Entidad** | `inscripciones(id, estudiante_id, materia_id, estado, fecha_inscripcion)` con `UNIQUE(estudiante_id, materia_id)` |
| **API GraphQL** | Query: `inscripciones`, `inscripcionesByEstudiante`, `inscripcionesByMateria` · Mutation: `inscribir`, `desinscribir` |
| **Reglas** | No se permite doble inscripción; valida existencia de estudiante y materia |
| **Frontend** | Componente `InscripcionesComponent` (inscribir, desinscribir, listado) |
| **Auditoría** | Acciones `INSCRIBIR`, `DESINSCRIBIR` |

### HU-S2.5 · Panel de Administración

Vista exclusiva del rol **ADMIN** (protegida con `authGuard` + `roleGuard`).
Muestra estadísticas en vivo (usuarios, materias, inscripciones, estudiantes),
accesos rápidos a los módulos de gestión y la tabla de usuarios del sistema.

---

## 3. Arquitectura de Librerías (Monorepo NPM Workspaces)

El proyecto se reestructuró como **monorepo** con NPM Workspaces. Los Core Assets se
organizan en paquetes independientes bajo `packages/`, consumibles por los productos
derivados **vía importación** en lugar de clonado de carpetas.

```
fabrica-software-academico/
├── package.json          # workspaces: packages/*, backend, frontend
├── packages/
│   ├── design-system/    # @fabrica/design-system   (CA-001)
│   ├── angular-auth/     # @fabrica/angular-auth     (CA-002..CA-007)
│   ├── node-core/        # @fabrica/node-core        (CA-009..CA-013 + feature-toggles)
│   └── academico/        # @fabrica/academico        (CA-016, CA-017)
├── backend/              # servidor de referencia (Apollo GraphQL)
├── frontend/             # app de referencia (Angular)
└── crear_nueva_app.js    # generador de productos derivados
```

| Paquete | Core Assets | Rol |
|---------|-------------|-----|
| `@fabrica/design-system` | CA-001 | Tokens de diseño y estilos base |
| `@fabrica/angular-auth` | CA-002 … CA-007 | Autenticación/Autorización (Angular) |
| `@fabrica/node-core` | CA-009 … CA-013 | Base GraphQL, JWT, BD, Auditoría, **feature toggles** |
| `@fabrica/academico` | CA-016, CA-017 | Dominio académico |

---

## 4. Variabilidad (Feature Toggles) — HU-S2.7

La variabilidad se expresa en **dos niveles**:

1. **Configuración declarativa** (`factory-config.json`): cada producto activa o
   desactiva Core Assets opcionales.
2. **Poda en ensamblaje** (`crear_nueva_app.js`): el generador elimina del producto
   derivado el código de los assets desactivados, usando **marcadores** en el código:

   ```
   # >>>CA-016>>>   ...bloque GraphQL...   # <<<CA-016<<<
   // >>>CA-017>>>  ...bloque JS...        // <<<CA-017<<<
   ```

   Podar entre marcadores es robusto: no depende de la forma exacta del código.

3. **Motor en tiempo de ejecución** (`@fabrica/node-core/feature-toggles`):

   ```js
   const { crearFeatureToggles } = require('@fabrica/node-core/feature-toggles');
   const features = crearFeatureToggles();      // lee factory-config.json
   features.isEnabled('CA-016_ModuloMaterias'); // true / false
   ```

### Commonalities vs. Variabilidades

| Commonalities (siempre presentes) | Variabilidades (opcionales) |
|-----------------------------------|-----------------------------|
| CA-001, CA-002, CA-003, CA-004, CA-005, CA-006, CA-008, CA-009, CA-010, CA-011, CA-013 | CA-007 (Registro abierto), CA-012 (Auditoría), CA-016 (Materias), CA-017 (Inscripciones) |

---

## 5. Producto derivado de validación — SistemaMatriculas (HU-S2.8)

```bash
node crear_nueva_app.js SistemaMatriculas
```

Ensambla un producto **completo** (todos los Core Assets, incluidos CA-016 y CA-017).
Se validó que su esquema GraphQL ensambla sin errores. Como contraprueba de variabilidad,
un producto con CA-012/CA-016/CA-017 desactivados se poda a un backend **solo-auth** que
también ensambla correctamente.

---

## 6. Cómo ejecutar el producto (MVP)

```bash
# 1. Base de datos (PostgreSQL)
#    Configura backend/.env con las credenciales (ver .env.example)

# 2. Backend
cd backend && npm install && npm run db:migrate:academico && npm run dev

# 3. Frontend
cd frontend && npm install && npm start
# App en http://localhost:4200 · API en http://localhost:4000
```

### Usuarios de demostración

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@fabrica.edu | admin123 |
| DOCENTE | docente@fabrica.edu | docente123 |
| ESTUDIANTE | estudiante1@fabrica.edu | estudiante123 |

---

## 7. Resultado de la validación (Definition of Done)

| Verificación | Estado |
|--------------|--------|
| Backend CA-016/CA-017 ensambla (Apollo) | ✅ |
| Frontend compila en producción (`ng build`) | ✅ |
| Login JWT + control por roles end-to-end | ✅ |
| CRUD de Materias desde la UI (persistido en BD) | ✅ |
| Inscripción de estudiantes (persistida) | ✅ |
| Auditoría registra las acciones académicas | ✅ |
| Producto derivado completo ensambla | ✅ |
| Producto derivado podado (solo-auth) ensambla | ✅ |
| Motor de feature toggles lee la configuración | ✅ |
