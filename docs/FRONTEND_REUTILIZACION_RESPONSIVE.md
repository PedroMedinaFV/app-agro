# Frontend: reutilizacion y responsive

Fecha de corte: 2026-10-05.

## Diagnostico

La web ya avanzo en modularizacion: existen `screens`, `hooks`, `components`, `utils`, `Panel`, `PageHeader`, `Button`, `IconButton`, `ActionBar` y un `DataTable` compartido. El problema actual no es ausencia total de reutilizacion, sino adopcion irregular.

Los patrones mas repetidos son:

- tablas/listados con columnas y acciones definidas de forma distinta por pantalla;
- filas tipo grilla manual (`reference-list-row`, `master-list-row`, `geo-file-row`, `planning-row`, `protocol-row`);
- modales CRUD parecidos con formularios, acciones y validaciones locales;
- pantallas de padrones con carga, filtros, vinculacion ERP y modal de edicion repetidos;
- reglas responsive resueltas en CSS especifico por modulo.

## Hallazgos principales

| Area | Situacion | Riesgo |
| --- | --- | --- |
| Tablas | `DataTable` se usa ampliamente, pero convive con listados manuales | Comportamiento responsive inconsistente |
| Acciones de tabla | Algunas columnas usan `accion`, otras `acciones` | Acciones no siempre reciben el mismo layout |
| Screens grandes | Varias pantallas superan 500 lineas | Dificulta cambios y tests |
| Formularios de padrones | Alta/edicion/vinculacion se repite en cada pantalla | Mas costo al cambiar UX o validaciones |
| Responsive | Hay media queries globales y grillas especificas por modulo | Es facil romper mobile al agregar columnas |

## Pantallas prioritarias

Priorizar estas por tamano y repeticion de patrones:

| Pantalla | Lineas aprox. | Prioridad |
| --- | ---: | --- |
| `PlanificacionEditorScreen.tsx` | 689 | Alta |
| `GastosComercialesScreen.tsx` | 638 | Alta |
| `LotesScreen.tsx` | 612 | Alta |
| `CamposScreen.tsx` | 609 | Alta |
| `VinculacionesPadronesScreen.tsx` | 608 | Alta |
| `ServiciosAppScreen.tsx` | 555 | Media |
| `InsumosAppScreen.tsx` | 533 | Media |
| `ActividadesAppScreen.tsx` | 532 | Media |

## Decision de patron

`DataTable` queda como componente base para listados de lectura/acciones. Debe concentrar:

- paginacion;
- layout responsive;
- etiquetas por celda en mobile;
- columna de acciones;
- alineacion por columna;
- estados vacios.

Los listados manuales solo deberian quedar para estructuras que no son tablas reales, por ejemplo arbol de planificacion o editor con inputs por fila.

## Primer ajuste aplicado

Se mejoro `DataTable` para:

- aceptar `align` por columna;
- reconocer `accion`, `acciones` y `actions` como columna de acciones;
- exponer `data-column-index` para layout responsive;
- mostrar primera columna y acciones a ancho completo en mobile;
- mejorar controles de paginacion en contenedores estrechos.

## Proximas oleadas recomendadas

1. Migrar listados simples que todavia usan filas manuales a `DataTable`.
2. Extraer un helper de columnas para padrones con origen/estado/acciones repetidas.
3. Extraer un `PadronCrudLayout` para pantallas de zonas, campos, lotes, especies, actividades, insumos y servicios.
4. Separar modales grandes de pantallas que siguen arriba de 500 lineas.
5. Agregar tests de helpers/hooks frontend para filtros, vinculacion sugerida y armado de filas.
6. Validar responsive con Playwright o screenshots en 390px, 768px y desktop.

## Criterio de cierre para frontend

Antes de sumar nuevas pantallas:

- [ ] No crear listados nuevos fuera de `DataTable` salvo excepcion documentada.
- [ ] No agregar logica a screens que ya superen 450 lineas sin extraer algo equivalente.
- [ ] Toda columna de acciones debe usar key `acciones` o `accion` y `IconButton`.
- [ ] Todo listado debe probarse en mobile angosto.
- [ ] Toda pantalla de padron debe reutilizar helpers existentes antes de crear funciones locales.

