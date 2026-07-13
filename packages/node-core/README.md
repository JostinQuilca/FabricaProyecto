# @fabrica/node-core

Core Assets de **backend** de la Fábrica de Software Académico.

## Core Assets incluidos

| ID | Asset | Tipo |
|----|-------|------|
| CA-009 | Esquema GraphQL base | Commonality |
| CA-010 | Resolvers GraphQL | Commonality |
| CA-011 | Middleware JWT | Commonality |
| CA-012 | Modelo de Auditoría | Variabilidad (opcional) |
| CA-013 | Configuración de BD | Commonality |

## Motor de Feature Toggles (HU-S2.7)

Implementa la **variabilidad** de la línea de productos: cada producto derivado
activa o desactiva Core Assets desde `factory-config.json`, sin modificar código.

```js
const { crearFeatureToggles } = require('@fabrica/node-core/feature-toggles');

const features = crearFeatureToggles(); // lee factory-config.json

if (features.isEnabled('CA-016_ModuloMaterias')) {
  // registrar el módulo de Materias en el schema/resolvers
}

features.withFeature('CA-012_ModeloAuditoria', () => registrarAuditoria(evento));
```
