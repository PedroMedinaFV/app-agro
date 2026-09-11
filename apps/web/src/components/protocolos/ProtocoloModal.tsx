import { useEffect, useMemo, useState } from 'react';
import { ErpCampania, PlanificacionSnapshot, ProtocoloProductivoDetalle } from '@agro/tipos';
import { DecimalInput } from '../DecimalInput';
import { LoadingSpinner } from '../LoadingSpinner';
import { SignedIntegerInput } from '../SignedIntegerInput';
import { calcularCostoInsumoProtocolo, calcularCostoLaborProtocolo, calcularCostoProtocoloWeb } from '../../utils/formatters';

type ModoProtocoloModal = 'crear' | 'editar' | 'copiar';

interface ProtocoloModalProps {
  modo: ModoProtocoloModal;
  protocolo: ProtocoloProductivoDetalle;
  planificacion: PlanificacionSnapshot;
  campanias: ErpCampania[];
  puedeConfigurarPlanificacion: boolean;
  guardandoProtocolo: boolean;
  onClose: () => void;
  onGuardar: (protocolo: ProtocoloProductivoDetalle) => void;
  formatearUsd: (valor: number) => string;
}

export function ProtocoloModal({
  modo,
  protocolo: protocoloInicial,
  planificacion,
  campanias,
  puedeConfigurarPlanificacion,
  guardandoProtocolo,
  onClose,
  onGuardar,
  formatearUsd,
}: ProtocoloModalProps) {
  const [protocolo, setProtocolo] = useState(protocoloInicial);
  const laboresDisponibles = useMemo(() => [...planificacion.serviciosApp]
    .filter((labor) => labor.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [planificacion.serviciosApp]);
  const insumosDisponibles = useMemo(() => [...(planificacion.insumosApp || [])]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [planificacion.insumosApp]);
  const actividadesPorId = useMemo(() => new Map((planificacion.actividadesApp || []).map((actividad) => [actividad.id, actividad])), [planificacion.actividadesApp]);
  const laboresPorId = useMemo(() => new Map(laboresDisponibles.map((labor) => [labor.id, labor])), [laboresDisponibles]);
  const insumosPorId = useMemo(() => new Map(insumosDisponibles.map((insumo) => [insumo.id, insumo])), [insumosDisponibles]);
  const estadiosCompatibles = useMemo(() => [...planificacion.estadiosReferencia]
    .filter((estadio) => estadio.activo && (!estadio.actividadErpId || estadio.actividadErpId === protocolo.actividadErpId))
    .sort((a, b) => a.ordenCronologico - b.ordenCronologico || a.nombre.localeCompare(b.nombre, 'es')), [planificacion.estadiosReferencia, protocolo.actividadErpId]);
  const zonasDisponibles = useMemo(() => [...(planificacion.zonasApp || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [planificacion.zonasApp]);
  const titulo = modo === 'crear' ? 'Nuevo protocolo' : modo === 'copiar' ? 'Guardar copia' : 'Editar protocolo';
  const textoAccion = guardandoProtocolo ? 'Guardando...' : modo === 'editar' ? 'Editar' : 'Guardar';

  useEffect(() => {
    setProtocolo(protocoloInicial);
  }, [protocoloInicial]);

  function actualizarProtocolos(updater: (actual: ProtocoloProductivoDetalle) => ProtocoloProductivoDetalle) {
    setProtocolo((actual) => {
      const actualizado = updater(actual);

      return { ...actualizado, costoEstimadoPorHa: calcularCostoProtocoloWeb(actualizado) };
    });
  }

  function actualizarEtapa(etapaId: string, updates: Partial<ProtocoloProductivoDetalle['etapas'][number]>) {
    actualizarProtocolos((actual) => ({
      ...actual,
      etapas: actual.etapas.map((etapa) => (etapa.id === etapaId ? { ...etapa, ...updates } : etapa)),
    }));
  }

  function agregarEtapaProtocolo() {
    const estadiosUsados = new Set(protocolo.etapas.map((etapa) => etapa.estadioReferenciaId).filter(Boolean));
    const estadio = estadiosCompatibles.find((item) => !estadiosUsados.has(item.id)) || estadiosCompatibles[0];

    if (!estadio) {
      return;
    }

    const etapaId = `etapa-${Date.now()}`;
    actualizarProtocolos((actual) => ({
      ...actual,
      etapas: [
        ...actual.etapas,
        {
          id: etapaId,
          protocoloId: actual.id,
          estadioReferenciaId: estadio.id,
          estadioCodigo: estadio.codigo,
          orden: estadio.ordenCronologico,
          nombre: estadio.nombre,
          diasDesdeSiembra: actual.tipoFecha === 'relativa_siembra' ? 0 : undefined,
          labores: [],
          insumos: [],
        },
      ],
    }));
  }

  function agregarLabor(etapaId: string, servicioAppId?: string) {
    const servicioApp = (servicioAppId ? laboresPorId.get(servicioAppId) : undefined) || laboresDisponibles[0];

    if (!servicioApp) {
      return;
    }

    const cantidadPorHa = 1;
    const costoUnitario = servicioApp.costoUnitarioSugerido || 0;
    const indiceAplicacion = 1;

    actualizarEtapa(etapaId, {
      labores: protocolo.etapas.find((etapa) => etapa.id === etapaId)?.labores.concat({
        id: `labor-${Date.now()}`,
        etapaId,
        indiceAplicacion,
        servicioAppId: servicioApp.id,
        nombre: servicioApp.nombre,
        descripcion: servicioApp.descripcionAbreviada,
        unidad: servicioApp.unidadSugerida,
        cantidadPorHa,
        costoUnitario,
        costoPorHa: calcularCostoLaborProtocolo({ cantidadPorHa, costoUnitario, indiceAplicacion } as Parameters<typeof calcularCostoLaborProtocolo>[0]),
      }) || [],
    });
  }

  function agregarInsumo(etapaId: string, insumoAppId?: string) {
    const insumoApp = (insumoAppId ? insumosPorId.get(insumoAppId) : undefined) || insumosDisponibles[0];

    if (!insumoApp) {
      return;
    }

    const dosisPorHa = 1;
    const precioUnitarioEstimado = insumoApp.precioUnitarioEstimado || 0;
    const indiceAplicacion = 1;

    actualizarEtapa(etapaId, {
      insumos: protocolo.etapas.find((etapa) => etapa.id === etapaId)?.insumos.concat({
        id: `insumo-${Date.now()}`,
        etapaId,
        indiceAplicacion,
        insumoAppId: insumoApp.id,
        insumoErpId: insumoApp.insumoErpId,
        nombre: insumoApp.nombre,
        tipo: insumoApp.tipo,
        unidad: insumoApp.unidad,
        dosisPorHa,
        precioUnitarioEstimado,
        costoPorHa: calcularCostoInsumoProtocolo({ dosisPorHa, precioUnitarioEstimado, indiceAplicacion } as Parameters<typeof calcularCostoInsumoProtocolo>[0]),
      }) || [],
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel modal-panel-wide" role="dialog" aria-modal="true" aria-labelledby="protocolo-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Protocolos productivos</p>
            <h2 id="protocolo-modal-title">{titulo}</h2>
            <p className="hint">Cabecera, etapas, labores e insumos del protocolo seleccionado.</p>
          </div>
          <button className="small" onClick={onClose}>Cerrar</button>
        </div>

        <section className="panel modal-inner-panel">
          <div className="panel-header">
            <div>
              <h2>Cabecera</h2>
              <p className="hint">Actividad obligatoria, campo opcional y costo calculado desde etapas.</p>
            </div>
            <span className="status-pill">{formatearUsd(protocolo.costoEstimadoPorHa)}</span>
          </div>

          <div className="protocol-form">
            <label>
              Campania
              <select
                value={protocolo.campaniaErpId}
                onChange={(event) => actualizarProtocolos((actual) => ({ ...actual, campaniaErpId: event.target.value }))}
                disabled={!puedeConfigurarPlanificacion}
              >
                <option value="">Seleccionar campania</option>
                {campanias.map((campania) => (
                  <option key={campania.erpId} value={campania.erpId}>{campania.nombre || campania.codigo}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre
              <input
                value={protocolo.nombre}
                onChange={(event) => actualizarProtocolos((actual) => ({ ...actual, nombre: event.target.value }))}
                disabled={!puedeConfigurarPlanificacion}
              />
            </label>
            <label>
              Actividad
              <select
                value={protocolo.actividadAppId}
                onChange={(event) => {
                  const actividad = actividadesPorId.get(event.target.value);
                  actualizarProtocolos((actual) => ({ ...actual, actividadAppId: event.target.value, actividadErpId: actividad?.actividadErpId }));
                }}
                disabled={!puedeConfigurarPlanificacion}
              >
                {(planificacion.actividadesApp || []).map((actividad) => (
                  <option key={actividad.id} value={actividad.id}>{actividad.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Zona
              <select
                value={protocolo.zonaAppId || ''}
                onChange={(event) => actualizarProtocolos((actual) => ({ ...actual, zonaAppId: event.target.value || undefined, campoAppId: undefined }))}
                disabled={!puedeConfigurarPlanificacion}
              >
                <option value="">Todas las zonas</option>
                {zonasDisponibles.map((zona) => (
                  <option key={zona.id} value={zona.id}>{zona.codigoInterno ? `${zona.codigoInterno} - ` : ''}{zona.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Campo
              <select
                value={protocolo.campoAppId || ''}
                onChange={(event) => actualizarProtocolos((actual) => ({ ...actual, campoAppId: event.target.value || undefined }))}
                disabled={!puedeConfigurarPlanificacion}
              >
                <option value="">Todos los campos compatibles</option>
                {planificacion.camposApp
                  .filter((campo) => !protocolo.zonaAppId || campo.zonaAppId === protocolo.zonaAppId)
                  .map((campo) => (
                  <option key={campo.id} value={campo.id}>{campo.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo de fechas
              <select
                value={protocolo.tipoFecha}
                onChange={(event) => actualizarProtocolos((actual) => ({
                  ...actual,
                  tipoFecha: event.target.value as ProtocoloProductivoDetalle['tipoFecha'],
                }))}
                disabled={!puedeConfigurarPlanificacion}
              >
                <option value="relativa_siembra">Relativa a siembra</option>
                <option value="absoluta">Absoluta</option>
              </select>
            </label>
            {protocolo.tipoFecha === 'relativa_siembra' && (
              <label>
                Fecha de siembra
                <input
                  type="date"
                  value={protocolo.fechaSiembra || ''}
                  onChange={(event) => actualizarProtocolos((actual) => ({ ...actual, fechaSiembra: event.target.value }))}
                  disabled={!puedeConfigurarPlanificacion}
                />
              </label>
            )}
            <label>
              Descripcion
              <input
                value={protocolo.descripcion}
                onChange={(event) => actualizarProtocolos((actual) => ({ ...actual, descripcion: event.target.value }))}
                disabled={!puedeConfigurarPlanificacion}
              />
            </label>
          </div>
        </section>

        <section className="panel modal-inner-panel">
          <div className="panel-header">
            <div>
              <h2>Etapas</h2>
              <p className="hint">Cada etapa agrupa labores e insumos. El costo por ha se recalcula al editar.</p>
            </div>
            <button className="small" onClick={agregarEtapaProtocolo} disabled={!puedeConfigurarPlanificacion}>Agregar etapa</button>
          </div>

          <div className="protocol-stages">
            {protocolo.etapas.map((etapa) => (
              <article className="protocol-stage" key={etapa.id}>
                <div className="protocol-stage-header">
                  <select
                    value={etapa.estadioReferenciaId || ''}
                    onChange={(event) => {
                      const estadio = estadiosCompatibles.find((item) => item.id === event.target.value);
                      if (!estadio) {
                        return;
                      }

                      actualizarEtapa(etapa.id, {
                        estadioReferenciaId: estadio.id,
                        estadioCodigo: estadio.codigo,
                        nombre: estadio.nombre,
                        orden: estadio.ordenCronologico,
                      });
                    }}
                    disabled={!puedeConfigurarPlanificacion}
                    title="Estadio fenologico de la etapa"
                  >
                    <option value="">{etapa.nombre || 'Seleccionar estadio'}</option>
                    {estadiosCompatibles.map((estadio) => (
                      <option key={estadio.id} value={estadio.id}>{estadio.codigo} - {estadio.nombre}</option>
                    ))}
                  </select>
                  <span>Orden {etapa.orden}</span>
                </div>

                <div className="protocol-date-row">
                  {protocolo.tipoFecha === 'relativa_siembra' ? (
                    <label>
                      Dias desde siembra
                      <SignedIntegerInput
                        value={etapa.diasDesdeSiembra ?? 0}
                        onValueChange={(value) => actualizarEtapa(etapa.id, { diasDesdeSiembra: value, fechaObjetivo: undefined })}
                        disabled={!puedeConfigurarPlanificacion}
                        title="Puede ser negativo para labores anteriores a la siembra"
                      />
                    </label>
                  ) : (
                    <label>
                      Fecha objetivo
                      <input
                        type="date"
                        value={etapa.fechaObjetivo || ''}
                        onChange={(event) => actualizarEtapa(etapa.id, { fechaObjetivo: event.target.value, diasDesdeSiembra: undefined })}
                        disabled={!puedeConfigurarPlanificacion}
                      />
                    </label>
                  )}
                  <label>
                    Observaciones de etapa
                    <input
                      value={etapa.observaciones || ''}
                      onChange={(event) => actualizarEtapa(etapa.id, { observaciones: event.target.value })}
                      disabled={!puedeConfigurarPlanificacion}
                    />
                  </label>
                </div>

                <div className="protocol-detail-grid">
                  <div>
                    <div className="panel-header inline">
                      <h3>Labores</h3>
                      <button
                        className="small"
                        onClick={() => agregarLabor(etapa.id, laboresDisponibles[0]?.id)}
                        disabled={!puedeConfigurarPlanificacion || laboresDisponibles.length === 0}
                        title={laboresDisponibles.length === 0 ? 'Primero carga labores desde Padrones > Labores' : 'Agregar labor al protocolo'}
                      >
                        Agregar
                      </button>
                    </div>
                    {etapa.labores.map((labor) => (
                      <div className="protocol-item" key={labor.id}>
                        <select
                          value={labor.servicioAppId || ''}
                          onChange={(event) => {
                            const ServicioApp = laboresPorId.get(event.target.value);
                            if (!ServicioApp) {
                              return;
                            }

                            const costoUnitario = ServicioApp.costoUnitarioSugerido || 0;
                            actualizarEtapa(etapa.id, {
                              labores: etapa.labores.map((item) => item.id === labor.id ? {
                                ...item,
                                servicioAppId: ServicioApp.id,
                                nombre: ServicioApp.nombre,
                                descripcion: ServicioApp.descripcionAbreviada,
                                unidad: ServicioApp.unidadSugerida,
                                costoUnitario,
                                costoPorHa: calcularCostoLaborProtocolo({ ...item, costoUnitario }),
                              } : item),
                            });
                          }}
                          disabled={!puedeConfigurarPlanificacion}
                          title="Labor del padron maestro"
                        >
                          <option value="">{labor.nombre || 'Seleccionar labor'}</option>
                          {laboresDisponibles.map((ServicioApp) => (
                            <option key={ServicioApp.id} value={ServicioApp.id}>{ServicioApp.nombre}</option>
                          ))}
                        </select>
                        <DecimalInput
                          min={0}
                          max={1}
                          step="0.01"
                          value={labor.indiceAplicacion}
                          onValueChange={(value) => actualizarEtapa(etapa.id, {
                            labores: etapa.labores.map((item) => {
                              if (item.id !== labor.id) {
                                return item;
                              }

                              const actualizado = { ...item, indiceAplicacion: value };
                              return { ...actualizado, costoPorHa: calcularCostoLaborProtocolo(actualizado) };
                            }),
                          })}
                          disabled={!puedeConfigurarPlanificacion}
                          title="Indice de aplicacion entre 0 y 1"
                          ariaLabel={`Indice de aplicacion de ${labor.nombre}`}
                        />
                        <DecimalInput
                          min={0}
                          step="0.01"
                          value={labor.cantidadPorHa}
                          onValueChange={(value) => actualizarEtapa(etapa.id, {
                            labores: etapa.labores.map((item) => {
                              if (item.id !== labor.id) {
                                return item;
                              }

                              const actualizado = { ...item, cantidadPorHa: value };
                              return { ...actualizado, costoPorHa: calcularCostoLaborProtocolo(actualizado) };
                            }),
                          })}
                          disabled={!puedeConfigurarPlanificacion}
                          title={`Cantidad por hectarea en ${labor.unidad}`}
                          ariaLabel={`Cantidad por hectarea de ${labor.nombre}`}
                        />
                        <DecimalInput
                          min={0}
                          step="0.01"
                          value={labor.costoUnitario}
                          onValueChange={(value) => actualizarEtapa(etapa.id, {
                            labores: etapa.labores.map((item) => {
                              if (item.id !== labor.id) {
                                return item;
                              }

                              const actualizado = { ...item, costoUnitario: value };
                              return { ...actualizado, costoPorHa: calcularCostoLaborProtocolo(actualizado) };
                            }),
                          })}
                          disabled={!puedeConfigurarPlanificacion}
                          title="Costo unitario editable copiado desde el padron"
                          ariaLabel={`Costo unitario de ${labor.nombre}`}
                        />
                        <span title={`${labor.cantidadPorHa} ${labor.unidad} por hectarea`}>{formatearUsd(labor.costoPorHa)} / ha</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="panel-header inline">
                      <h3>Insumos</h3>
                      <button
                        className="small"
                        onClick={() => agregarInsumo(etapa.id, insumosDisponibles[0]?.id)}
                        disabled={!puedeConfigurarPlanificacion || insumosDisponibles.length === 0}
                        title={insumosDisponibles.length === 0 ? 'Primero carga o sincroniza insumos' : 'Agregar insumo al protocolo'}
                      >
                        Agregar
                      </button>
                    </div>
                    {etapa.insumos.map((insumo) => (
                      <div className="protocol-item" key={insumo.id}>
                        <select
                          value={insumo.insumoAppId || ''}
                          onChange={(event) => {
                            const insumoApp = insumosPorId.get(event.target.value);
                            if (!insumoApp) {
                              return;
                            }

                            const precioUnitarioEstimado = insumoApp.precioUnitarioEstimado || 0;
                            actualizarEtapa(etapa.id, {
                              insumos: etapa.insumos.map((item) => item.id === insumo.id ? {
                                ...item,
                                insumoAppId: insumoApp.id,
                                insumoErpId: insumoApp.insumoErpId,
                                nombre: insumoApp.nombre,
                                tipo: insumoApp.tipo,
                                unidad: insumoApp.unidad,
                                precioUnitarioEstimado,
                                costoPorHa: calcularCostoInsumoProtocolo({ ...item, precioUnitarioEstimado }),
                              } : item),
                            });
                          }}
                          disabled={!puedeConfigurarPlanificacion}
                          title="Insumo del padron operativo"
                        >
                          <option value="">{insumo.nombre || 'Seleccionar insumo'}</option>
                          {insumosDisponibles.map((insumoDisponible) => (
                            <option key={insumoDisponible.id} value={insumoDisponible.id}>{insumoDisponible.nombre}</option>
                          ))}
                        </select>
                        <DecimalInput
                          min={0}
                          max={1}
                          step="0.01"
                          value={insumo.indiceAplicacion}
                          onValueChange={(value) => actualizarEtapa(etapa.id, {
                            insumos: etapa.insumos.map((item) => {
                              if (item.id !== insumo.id) {
                                return item;
                              }

                              const actualizado = { ...item, indiceAplicacion: value };
                              return { ...actualizado, costoPorHa: calcularCostoInsumoProtocolo(actualizado) };
                            }),
                          })}
                          disabled={!puedeConfigurarPlanificacion}
                          title="Indice de aplicacion entre 0 y 1"
                          ariaLabel={`Indice de aplicacion de ${insumo.nombre}`}
                        />
                        <DecimalInput
                          min={0}
                          step="0.01"
                          value={insumo.dosisPorHa}
                          onValueChange={(value) => actualizarEtapa(etapa.id, {
                            insumos: etapa.insumos.map((item) => {
                              if (item.id !== insumo.id) {
                                return item;
                              }

                              const actualizado = { ...item, dosisPorHa: value };
                              return { ...actualizado, costoPorHa: calcularCostoInsumoProtocolo(actualizado) };
                            }),
                          })}
                          disabled={!puedeConfigurarPlanificacion}
                          title={`Dosis por hectarea en ${insumo.unidad}`}
                          ariaLabel={`Dosis por hectarea de ${insumo.nombre}`}
                        />
                        <DecimalInput
                          min={0}
                          step="0.01"
                          value={insumo.precioUnitarioEstimado}
                          onValueChange={(value) => actualizarEtapa(etapa.id, {
                            insumos: etapa.insumos.map((item) => {
                              if (item.id !== insumo.id) {
                                return item;
                              }

                              const actualizado = { ...item, precioUnitarioEstimado: value };
                              return { ...actualizado, costoPorHa: calcularCostoInsumoProtocolo(actualizado) };
                            }),
                          })}
                          disabled={!puedeConfigurarPlanificacion}
                          title="Precio unitario editable copiado desde el padron"
                          ariaLabel={`Precio unitario de ${insumo.nombre}`}
                        />
                        <span title={`${insumo.dosisPorHa} ${insumo.unidad} por hectarea`}>{formatearUsd(insumo.costoPorHa)} / ha</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="modal-actions">
          <button className="small" onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => onGuardar(protocolo)} disabled={!puedeConfigurarPlanificacion || guardandoProtocolo || !protocolo.nombre.trim() || !protocolo.campaniaErpId || !protocolo.actividadAppId}>
            <span className="button-content">
              {guardandoProtocolo && <LoadingSpinner label="Guardando protocolo" />}
              {textoAccion}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
