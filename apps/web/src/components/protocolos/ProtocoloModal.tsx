import { ErpCampania, PlanificacionSnapshot, ProtocoloProductivoDetalle } from '@agro/tipos';
import { DecimalInput } from '../DecimalInput';
import { IconButton } from '../IconButton';
import { LoadingSpinner } from '../LoadingSpinner';
import { SignedIntegerInput } from '../SignedIntegerInput';
import { calcularCostoInsumoProtocolo, calcularCostoLaborProtocolo } from '../../utils/formatters';
import { fechaParaInput, useEditorProtocolo } from './useEditorProtocolo';

type ModoProtocoloModal = 'crear' | 'editar' | 'copiar';

interface ProtocoloModalProps {
  modo: ModoProtocoloModal;
  presentacion?: 'modal' | 'pantalla';
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
  presentacion = 'modal',
  protocolo: protocoloInicial,
  planificacion,
  campanias,
  puedeConfigurarPlanificacion,
  guardandoProtocolo,
  onClose,
  onGuardar,
  formatearUsd,
}: ProtocoloModalProps) {
  const {
    protocolo,
    laboresDisponibles,
    insumosDisponibles,
    laboresPorId,
    insumosPorId,
    estadiosCompatibles,
    zonasDisponibles,
    actualizarProtocolo,
    actualizarEtapa,
    agregarEtapaProtocolo,
    agregarLabor,
    eliminarLabor,
    agregarInsumo,
    eliminarInsumo,
    cambiarCampania,
    cambiarActividad,
    cambiarZona,
    cambiarCampo,
  } = useEditorProtocolo({ protocoloInicial, planificacion });
  const titulo = modo === 'crear' ? 'Nuevo protocolo' : modo === 'copiar' ? 'Guardar copia' : 'Editar protocolo';
  const textoAccion = guardandoProtocolo ? 'Guardando...' : modo === 'editar' ? 'Editar' : 'Guardar';
  const contenido = (
    <>
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
                onChange={(event) => cambiarCampania(event.target.value)}
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
                onChange={(event) => actualizarProtocolo((actual) => ({ ...actual, nombre: event.target.value }))}
                disabled={!puedeConfigurarPlanificacion}
              />
            </label>
            <label>
              Actividad
              <select
                value={protocolo.actividadAppId}
                onChange={(event) => cambiarActividad(event.target.value)}
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
                onChange={(event) => cambiarZona(event.target.value)}
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
                onChange={(event) => cambiarCampo(event.target.value)}
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
                onChange={(event) => actualizarProtocolo((actual) => ({
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
                  value={fechaParaInput(protocolo.fechaSiembra)}
                  onChange={(event) => actualizarProtocolo((actual) => ({ ...actual, fechaSiembra: event.target.value }))}
                  disabled={!puedeConfigurarPlanificacion}
                />
              </label>
            )}
            <label>
              Descripcion
              <input
                value={protocolo.descripcion}
                onChange={(event) => actualizarProtocolo((actual) => ({ ...actual, descripcion: event.target.value }))}
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
            {protocolo.etapas.map((etapa, indiceEtapa) => (
              <article className={`protocol-stage protocol-stage-tone-${indiceEtapa % 6}`} key={etapa.id}>
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
                        value={fechaParaInput(etapa.fechaObjetivo)}
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
                      <IconButton
                        icon="plus"
                        label="Agregar labor"
                        onClick={() => agregarLabor(etapa.id, laboresDisponibles[0]?.id)}
                        disabled={!puedeConfigurarPlanificacion || laboresDisponibles.length === 0}
                        title={laboresDisponibles.length === 0 ? 'Primero carga labores desde Padrones > Labores' : 'Agregar labor al protocolo'}
                      />
                    </div>
                    <div className="protocol-detail-grid-header">
                      <span>Labor</span>
                      <span>Cant./ha</span>
                      <span>Indice</span>
                      <span>Costo unit.</span>
                      <span>Costo/ha</span>
                      <span></span>
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
                        <span className="protocol-readonly-value" title="El costo unitario se administra desde Padrones > Labores">
                          {formatearUsd(labor.costoUnitario)}
                        </span>
                        <span title={`${labor.cantidadPorHa} ${labor.unidad} por hectarea`}>{formatearUsd(labor.costoPorHa)} / ha</span>
                        <IconButton
                          icon="trash"
                          className="danger-icon"
                          label={`Eliminar labor ${labor.nombre}`}
                          onClick={() => eliminarLabor(etapa.id, labor.id)}
                          disabled={!puedeConfigurarPlanificacion}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="panel-header inline">
                      <h3>Insumos</h3>
                      <IconButton
                        icon="plus"
                        label="Agregar insumo"
                        onClick={() => agregarInsumo(etapa.id, insumosDisponibles[0]?.id)}
                        disabled={!puedeConfigurarPlanificacion || insumosDisponibles.length === 0}
                        title={insumosDisponibles.length === 0 ? 'Primero carga o sincroniza insumos' : 'Agregar insumo al protocolo'}
                      />
                    </div>
                    <div className="protocol-detail-grid-header">
                      <span>Insumo</span>
                      <span>Dosis/ha</span>
                      <span>Indice</span>
                      <span>Precio unit.</span>
                      <span>Costo/ha</span>
                      <span></span>
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
                        <span className="protocol-readonly-value" title="El precio unitario se administra desde Padrones > Insumos">
                          {formatearUsd(insumo.precioUnitarioEstimado)}
                        </span>
                        <span title={`${insumo.dosisPorHa} ${insumo.unidad} por hectarea`}>{formatearUsd(insumo.costoPorHa)} / ha</span>
                        <IconButton
                          icon="trash"
                          className="danger-icon"
                          label={`Eliminar insumo ${insumo.nombre}`}
                          onClick={() => eliminarInsumo(etapa.id, insumo.id)}
                          disabled={!puedeConfigurarPlanificacion}
                        />
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
    </>
  );

  if (presentacion === 'pantalla') {
    return (
      <section className="protocol-editor-panel" aria-labelledby="protocolo-modal-title">
        {contenido}
      </section>
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel modal-panel-wide" role="dialog" aria-modal="true" aria-labelledby="protocolo-modal-title">
        {contenido}
      </section>
    </div>
  );
}
