# Anexos de planificacion por incorporacion de unidades productivas

Fecha: 2026-11-13. Estado: propuesta funcional y tecnica para roadmap; no implementada. No se modifican API, schema ni comportamiento de cierre con este documento.

## Proposito y ejemplo

Permitir planificar unidades productivas incorporadas despues del cierre de la planificacion inicial de una campania, conservando intacta la decision original.

Ejemplo: se cierra la planificacion 26/27 con 1.000 ha. Luego ingresa un campo con 200 ha y se crea el Anexo 1. Este recorre el mismo proceso de carga, calculo, validacion y cierre, limitado a los lotes incorporados. La consulta muestra original (1.000 ha), anexo cerrado (200 ha) y consolidado vigente (1.200 ha), suponiendo un solo cultivo por superficie. Un Anexo 2 futuro se asocia a la misma original.

Un anexo es una ampliacion del alcance aprobado. Los escenarios actuales son alternativas previas a elegir la planificacion original. Los anexos cerrados se suman a la original y pueden coexistir; no compiten para reemplazarla.

## Alcance propuesto para la primera version

- Una planificacion original cerrada puede tener varios anexos independientes, todos del mismo cliente y campania.
- La unidad minima de incorporacion es el lote App. Se pueden incorporar lotes de un campo nuevo o lotes nuevos de un campo existente. Un campo completo es una seleccion de sus lotes elegibles, no una segunda unidad de contabilizacion.
- Solo son elegibles lotes no incluidos validamente en el alcance de la original ni de otro anexo cerrado de esa campania. Un lote sin actividad/cultivo y protocolo asignados no puede formar parte de un documento cerrado. Si el usuario lo quita del borrador antes del cierre, no queda reservado por ese documento y podra incorporarse en un anexo posterior.
- La ampliacion de hectareas de un lote ya incluido, el cambio de cultivo/protocolo o la correccion de un anexo cerrado requieren un proceso posterior de revision. No se resuelven agregando otra linea para ese mismo lote en un anexo.
- El alta del padron no crea ni cierra anexos automaticamente. Un usuario autorizado decide que lotes incorporar y registra el motivo.
- Se admiten padrones provisorios con las mismas reglas actuales. La vinculacion posterior con ERP debe preservar identidad/referencias mediante los mecanismos de consolidacion y aliases existentes.

Estas son decisiones propuestas de alcance, no restricciones ya presentes en el producto. Si se necesita agregar cultivos a lotes existentes, debe ampliarse expresamente este diseno antes de implementarlo.

## Flujo de usuario

1. En una planificacion original cerrada aparece **Crear anexo**, segun permisos.
2. Se solicita nombre, motivo de incorporacion y fecha de incorporacion. Cliente, campania y original se determinan desde la planificacion base y no son editables.
3. Se seleccionan los campos/lotes elegibles. No se precarga toda la campania ni se copian las lineas originales. El borrador guarda su alcance seleccionado explicitamente.
4. Se usa el editor existente: protocolos, destinos, hectareas, rinde, precios, gastos y calculos. Las sugerencias se toman de las referencias disponibles para la campania al elaborar el anexo; no se obliga a usar los valores historicos de la original.
5. Se guarda el borrador, con las mismas validaciones, autorizacion y auditoria. Si otro borrador ya propone el mismo lote, se muestra el conflicto; no se considera incorporado al consolidado.
6. **Cerrar anexo** muestra original, alcance incorporado y totales propios. Si hay lotes o lineas sin actividad/protocolo, muestra el detalle y bloquea el cierre hasta que el usuario los complete o quite explicitamente. El backend vuelve a validar integridad, elegibilidad y hectareas y congela sus snapshots productivos/economicos.
7. El anexo cerrado queda en consulta. No cambia la original, otros anexos cerrados ni el estado de escenarios alternativos originales.

Se reutilizan los estados actuales que correspondan al proceso de armado y cierre; un anexo cerrado es inmutable. La primera version no permite borrarlo ni reabrirlo para corregir totales. Un borrador puede ajustarse sin alterar datos aprobados.

### Decision de integridad para borrador y cierre

Esta regla propuesta aplica tanto a la planificacion inicial como a sus anexos:

- Se permite guardar borradores con lotes/lineas incompletos para conservar el avance. No representan alcance aprobado ni reservan lotes frente a documentos cerrados.
- Para cerrar, cada lote incluido debe tener al menos una linea valida, con actividad/cultivo, protocolo correspondiente y las demas condiciones de cierre. No alcanza con asignar esos datos a otro lote ni con completar solo una de varias lineas del mismo lote: todas las lineas que se conserven deben ser validas.
- Si quedan incompletos, el sistema bloquea el cierre y muestra campo, lote, linea y datos pendientes. Ofrece volver a editar o quitar los elementos indicados mediante una accion expresa del usuario; no los elimina ni los omite silenciosamente.
- Quitar una linea no quita el lote si conserva otras lineas validas. Si se quita la ultima linea, el lote tambien sale del alcance del documento. Un lote seleccionado sin ninguna linea tampoco permite cerrar: debe completarse o quitarse del alcance.
- Quitar un lote del documento quita sus lineas de ese borrador, con confirmacion si contienen datos y con auditoria; no elimina el padron ni registros operativos. No se permite cerrar un documento sin lotes/lineas validos.
- El cierre rechazado conserva el borrador y no modifica estados, snapshots ni reservas de alcance aprobado. El backend aplica estas reglas aunque se omita la validacion de pantalla.

Por tanto, un lote quitado de la original por no estar planificado puede seleccionarse en un anexo futuro. Si conserva alguna linea valida y finalmente se cierra dentro de la original, ya pertenece a ella y no es elegible para otro anexo de incorporacion.

## Consulta y consolidado

La cabecera de la original permite consultar **Original**, **Anexos** y **Consolidado vigente**. Cada documento conserva su detalle, estado, motivo, responsable, fecha y snapshots. Los borradores se muestran separados y quedan excluidos del consolidado aprobado.

El consolidado es una lectura de la original cerrada mas todos sus anexos cerrados; no una copia editable ni un nuevo escenario original. Debe aplicar los permisos de campo/lote del usuario y conservar el origen de cada linea en listados, exportaciones, ficha operativa y reportes.

Los ingresos, gastos, costos y margenes absolutos se suman; precios, rindes, porcentajes y margen por ha se recalculan con sus denominadores, no se suman ni se promedian sin ponderacion. La superficie fisica debe distinguirse de las hectareas de cultivo: el doble cultivo permitido dentro de un documento no duplica la superficie fisica del lote. Los calculos deben respetar las reglas de moneda vigentes, sin sumar importes incompatibles.

La fecha de incorporacion da contexto al anexo; el momento en que entra al consolidado es su cierre efectivo. La primera version no introduce consultas retroactivas por fecha ni cambia registros operativos anteriores.

## Modelo tecnico propuesto

Reutilizar `PlanificacionAgricola` y sus lineas/snapshots, agregando metadatos explicitos en una futura migracion:

| Campo propuesto | Regla |
| --- | --- |
| `tipoDocumento` | `base` o `anexo`; documentos existentes se migran como `base` |
| `planificacionOriginalId` | FK a la base original cerrada, obligatoria para anexos; no se encadenan anexos entre si |
| `numeroAnexo` | Consecutivo unico por original, asignado al cerrar; borradores sin numero definitivo |
| `motivoIncorporacion` | Obligatorio para anexos |
| `fechaIncorporacion` | Fecha declarada para contextualizar la nueva unidad; separada de `cerradaAt` |

Mantener `escenarioOriginal = true` exclusivamente para la base elegida. Un anexo cerrado tendra `escenarioOriginal = false` y `tipoDocumento = anexo`. No reutilizar `escenarioBloqueadoPorId` para expresar esta relacion: su significado actual es bloqueo de alternativas descartadas.

Persistir el alcance por lote en una entidad dedicada, independiente de las lineas de cultivo. En borrador representa la seleccion en armado; al cerrar solo puede contener lotes con lineas validas. Debe mantenerse consistente al quitar lotes o su ultima linea y contar una sola vez el lote aunque tenga doble cultivo. Resolver aliases antes de comparar identidades. Su contrato y migracion se definen al implementar, incluyendo como derivar el alcance de documentos existentes. Ante historicos cerrados con lotes/lineas incompletos, detectar y reportar la inconsistencia para revision explicita, sin declararlos validos ni modificar el documento silenciosamente. No inferir unidades nuevas solamente a partir de su fecha de alta en ERP.

## Responsabilidades y consistencia

- Compartir editor, contratos de lineas, validaciones agronomicas/economicas, serializacion y calculos. Evitar una copia paralela del modulo de planificacion.
- Separar politicas de alcance/cierre de base y anexo, orquestacion de transacciones y lectura del consolidado. La politica de base sigue seleccionando un unico escenario original; la del anexo exige una original cerrada y agrega alcance.
- Adaptar `services/planificacion/planificacionesPrisma.ts`: hoy rechaza guardar cualquier escenario de una campania con original cerrada y su cierre marca `escenarioOriginal = true` y deshabilita alternativas. Ninguna de esas acciones puede aplicarse indiscriminadamente a anexos.
- Backend determina tipo, cliente, campania, original, numero y estado permitido; no confia en flags enviados por la UI. No se admite un anexo de otro cliente, de un anexo o de una base abierta/deshabilitada.
- Cierre transaccional con exclusion por cliente/campania, compartida por todos los cierres pertinentes: revalidar alcance contra documentos cerrados, asignar numero, persistir snapshots y auditar como una unidad. Dos borradores superpuestos pueden existir, pero solo uno puede cerrar ese lote; el otro recibe conflicto y conserva su borrador.
- Coordinar esa validacion con consolidaciones de padrones y aliases. La comparacion de alcance debe usar la identidad canonica del lote y no permitir que un ID absorbido evada el control.
- Reutilizar los permisos actuales de lectura/edicion/cierre, verificando alcance de campos. Crear anexo requiere permiso de edicion; cerrar requiere `planificacion:cerrar`. Un permiso dedicado puede agregarse si el negocio requiere separar responsabilidades.
- Auditar creacion, cambios de alcance, guardado, cierre e intentos de modificar documentos cerrados, con IDs de original/anexo y motivo. Incluir regresiones de aislamiento y concurrencia.
- Revisar consumidores que hoy buscan solo `escenarioOriginal`: deben diferenciar la consulta historica original de la consulta vigente con anexos, sin omitir ni duplicar lineas.

## Entrega futura y criterios de aceptacion

1. Definir contratos de documento/alcance y migracion compatible; conservar las reglas de los registros existentes.
2. Implementar casos de uso de crear/guardar/cerrar anexo reutilizando el nucleo de planificacion y sus permisos.
3. Integrar seleccion de nuevas unidades y editor en web, con consulta de original/anexos.
4. Incorporar lectura consolidada a reportes, exportaciones, snapshots de consulta y ficha operativa web/mobile.
5. Probar HTTP/PostgreSQL y documentar el recorrido manual antes de habilitar la funcionalidad.

Casos requeridos: original inmutable; multiples anexos sucesivos; lote nuevo en campo existente; rechazo de lote ya incluido incluso con otra actividad; doble cultivo dentro del anexo; preservacion de la original ante cambios de precios/protocolos; exclusion de borradores; guardado de borrador incompleto y cierre rechazado sin perdida de datos; bloqueo por una segunda linea incompleta aunque la primera sea valida; retiro explicito de linea/lote y consistencia del alcance; lote retirado de la original disponible para anexo; rechazo de cierre vacio; totales ponderados y superficie fisica; cierres concurrentes de anexos superpuestos; numeracion unica; rechazo entre clientes/campanias; alias de lote vinculado/consolidado; fallos con rollback; el cierre de un anexo no deshabilita documentos previos; las reglas de escenarios base actuales siguen funcionando.

No se ejecutan pruebas de esta funcionalidad en esta etapa porque solo se deja el diseno y su incorporacion al roadmap. La fecha de implementacion queda por priorizar.
