# @fabrica/academico

Core Assets del **dominio académico** añadidos en el Sprint 2.

| ID | Asset | Tabla | Depende de |
|----|-------|-------|------------|
| CA-016 | Módulo de Materias (CRUD) | `materias` | — |
| CA-017 | Módulo de Inscripciones | `inscripciones` | CA-016 |

Assets **opcionales** de la línea de productos: un producto derivado puede
incluir solo autenticación, o añadir materias e inscripciones activándolos en
`factory-config.json`.
