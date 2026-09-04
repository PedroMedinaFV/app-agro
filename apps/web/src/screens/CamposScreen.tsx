import { useEffect, useMemo, useState } from 'react';
import type { CampoPlanificacion, ErpCampo, ErpEmpresa, ErpZona, SesionUsuario, ZonaPlanificacion } from '@agro/tipos';
import { guardarCampoPlanificacion, obtenerCamposErpImportados, obtenerCamposPlanificacion, obtenerZonasErpImportadas } from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type CamposScreenProps = {
  sesion: SesionUsuario;
  empresas: ErpEmpresa[];
  zonasPropias: ZonaPlanificacion[];
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type ZonaSeleccionable = {
  id: string;
  empresaErpId: string;
  nombre: string;
  codigo?: string;
  origen: 'erp' | 'agro';
  zonaErpId?: string;
  zonaPlanificacionId?: string;
};

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function crearCampoNuevo(clienteId: string, empresaErpId: string): CampoPlanificacion {
  const ahora = new Date().toISOString();

  return {
    id: `campo-planificacion-${Date.now()}`,
    clienteId,
    empresaErpId,
    nombre: '',
    codigoInterno: '',
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function CamposScreen({ sesion, empresas, zonasPropias, puedeConfigurarPlanificacion, notificar }: CamposScreenProps) {
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [zonasErp, setZonasErp] = useState<ErpZona[]>([]);
  const [camposPropios, setCamposPropios] = useState<CampoPlanificacion[]>([]);
  const [estado, setEstado] = useState('Cargando campos sincronizados.');
  const [guardando, setGuardando] = useState(false);
  const [campoEnEdicion, setCampoEnEdicion] = useState<CampoPlanificacion | null>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function cargarCampos() {
      try {
        const [respuestaErp, respuestaZonasErp, respuestaPropios] = await Promise.all([
          obtenerCamposErpImportados(sesion.token),
          obtenerZonasErpImportadas(sesion.token),
          obtenerCamposPlanificacion(sesion.token),
        ]);

        setCamposErp(respuestaErp.campos);
        setZonasErp(respuestaZonasErp.zonas);
        setCamposPropios(respuestaPropios.campos);
        setEstado('Campos cargados desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los campos.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron campos', mensaje });
      }
    }

    cargarCampos();
  }, [sesion.token, notificar]);

  const empresasPorId = useMemo(() => new Map(empresas.map((empresa) => [empresa.erpId, empresa])), [empresas]);
  const zonasDisponibles = useMemo<ZonaSeleccionable[]>(() => {
    const zonasDesdeErp = zonasErp.map((zona) => ({
      id: zona.erpId,
      empresaErpId: zona.empresaErpId,
      nombre: zona.nombre,
      codigo: zona.codigo,
      origen: 'erp' as const,
      zonaErpId: zona.erpId,
    }));
    const zonasDesdeAgro = zonasPropias.map((zona) => ({
      id: zona.id,
      empresaErpId: zona.empresaErpId,
      nombre: zona.nombre,
      codigo: zona.codigoInterno,
      origen: 'agro' as const,
      zonaErpId: zona.zonaErpId,
      zonaPlanificacionId: zona.id,
    }));

    return [...zonasDesdeAgro, ...zonasDesdeErp].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [zonasErp, zonasPropias]);
  const zonasPorClave = useMemo(() => {
    const mapa = new Map<string, ZonaSeleccionable>();

    for (const zona of zonasDisponibles) {
      if (zona.zonaPlanificacionId) {
        mapa.set(`agro:${zona.zonaPlanificacionId}`, zona);
      }

      if (zona.zonaErpId) {
        mapa.set(`erp:${zona.zonaErpId}`, zona);
      }
    }

    return mapa;
  }, [zonasDisponibles]);
  const camposVinculados = useMemo(() => new Set(camposPropios.map((campo) => campo.campoErpId).filter(Boolean)), [camposPropios]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const camposErpFiltrados = camposErp.filter((campo) => {
    const texto = normalizarCodigo(`${campo.codigo} ${campo.nombre} ${empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId}`);
    return texto.includes(filtroNormalizado);
  });
  const camposPropiosFiltrados = camposPropios.filter((campo) => {
    const texto = normalizarCodigo(`${campo.codigoInterno || ''} ${campo.nombre} ${campo.empresaErpId}`);
    return texto.includes(filtroNormalizado);
  });

  function abrirNuevoCampo() {
    const empresaErpId = empresas[0]?.erpId || zonasDisponibles[0]?.empresaErpId || 'empresa:1';
    const zonaSugerida = zonasDisponibles.find((zona) => zona.empresaErpId === empresaErpId);

    setCampoEnEdicion({
      ...crearCampoNuevo(sesion.usuario.clienteId || 'cliente-demo', empresaErpId),
      zonaPlanificacionId: zonaSugerida?.zonaPlanificacionId,
      zonaErpId: zonaSugerida?.zonaErpId,
    });
  }

  function obtenerClaveZona(campo: CampoPlanificacion) {
    if (campo.zonaPlanificacionId) {
      return `agro:${campo.zonaPlanificacionId}`;
    }

    if (campo.zonaErpId) {
      return `erp:${campo.zonaErpId}`;
    }

    return '';
  }

  function obtenerNombreZona(campo: CampoPlanificacion) {
    return zonasPorClave.get(obtenerClaveZona(campo))?.nombre || campo.zonaErpId || 'Sin zona';
  }

  function obtenerNombreZonaErp(campo: ErpCampo) {
    const zonaErpId = campo.idZona ? `${campo.empresaErpId}:zona:${campo.idZona}` : undefined;
    return zonaErpId ? zonasPorClave.get(`erp:${zonaErpId}`)?.nombre || `Zona ${campo.idZona}` : 'Sin zona';
  }

  function seleccionarZona(claveZona: string) {
    const zona = claveZona ? zonasPorClave.get(claveZona) : undefined;

    setCampoEnEdicion((actual) => actual && {
      ...actual,
      empresaErpId: zona?.empresaErpId || actual.empresaErpId,
      zonaPlanificacionId: zona?.zonaPlanificacionId,
      zonaErpId: zona?.zonaErpId,
    });
  }

  async function guardarCampo() {
    if (!campoEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(campoEnEdicion.nombre);

    if (!nombre) {
      notificar?.({ tipo: 'error', titulo: 'Campo incompleto', mensaje: 'El nombre del campo es obligatorio.' });
      return;
    }

    const campoPreparado: CampoPlanificacion = {
      ...campoEnEdicion,
      nombre,
      codigoInterno: campoEnEdicion.codigoInterno ? normalizarCodigo(campoEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarCampoPlanificacion(campoPreparado.id, {
        campo: campoPreparado,
        origen: 'web',
        motivo: 'Alta o edicion de campo desde padron maestro web',
      }, sesion.token);

      setCamposPropios((actuales) => {
        const existe = actuales.some((campo) => campo.id === respuesta.campo.id);
        return existe
          ? actuales.map((campo) => (campo.id === respuesta.campo.id ? respuesta.campo : campo))
          : [respuesta.campo, ...actuales];
      });
      setCampoEnEdicion(null);
      setEstado('Campo guardado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Campo guardado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el campo.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo el campo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article>
          <span>ERP sincronizados</span>
          <strong>{camposErp.length}</strong>
        </article>
        <article>
          <span>Propios Agro App</span>
          <strong>{camposPropios.length}</strong>
        </article>
        <article>
          <span>Provisorios</span>
          <strong>{camposPropios.filter((campo) => campo.estadoVinculacion === 'provisorio').length}</strong>
        </article>
        <article>
          <span>Vinculados</span>
          <strong>{camposPropios.filter((campo) => campo.estadoVinculacion === 'vinculado_erp').length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Campos</h2>
            <p className="hint">{estado}</p>
          </div>
          <div className="button-row">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo, nombre o empresa" />
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoCampo}>
              Nuevo campo
            </button>
          </div>
        </div>

        <div className="field-list">
          <div className="field-row reference-list-head">
            <span>Campo</span>
            <span>Empresa</span>
            <span>Zona ERP</span>
            <span>Origen</span>
            <span>Estado</span>
            <span>Accion</span>
          </div>

          {camposPropiosFiltrados.map((campo) => (
            <div className="field-row" key={campo.id}>
              <div>
                <strong>{campo.nombre}</strong>
                <span>{campo.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <span>{empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId}</span>
              <span>{obtenerNombreZona(campo)}</span>
              <span>Agro App</span>
              <em>{campo.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP'}</em>
              <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => setCampoEnEdicion(campo)}>
                Editar
              </button>
            </div>
          ))}

          {camposErpFiltrados.map((campo) => (
            <div className="field-row" key={campo.erpId}>
              <div>
                <strong>{campo.nombre}</strong>
                <span>{campo.codigo} - x-company {campo.empresaErpId.replace('empresa:', '')}</span>
              </div>
              <span>{empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId}</span>
              <span>{obtenerNombreZonaErp(campo)}</span>
              <span>ERP</span>
              <em>{camposVinculados.has(campo.erpId) ? 'Vinculado' : 'Disponible'}</em>
              <button className="small" type="button" disabled>
                Vincular
              </button>
            </div>
          ))}
        </div>
      </section>

      {campoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel">
            <div className="modal-header">
              <div>
                <h2>{camposPropios.some((campo) => campo.id === campoEnEdicion.id) ? 'Editar campo' : 'Nuevo campo'}</h2>
                <p className="hint">Los campos creados aca son propios de Agro App hasta vincularlos con ALBOR.</p>
              </div>
              <button className="ghost" type="button" onClick={() => setCampoEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Empresa
                <select
                  value={campoEnEdicion.empresaErpId}
                  onChange={(event) => setCampoEnEdicion((actual) => {
                    if (!actual) {
                      return actual;
                    }

                    const zonaActual = zonasPorClave.get(obtenerClaveZona(actual));
                    const mismaEmpresa = zonaActual?.empresaErpId === event.target.value;

                    return {
                      ...actual,
                      empresaErpId: event.target.value,
                      zonaPlanificacionId: mismaEmpresa ? actual.zonaPlanificacionId : undefined,
                      zonaErpId: mismaEmpresa ? actual.zonaErpId : undefined,
                    };
                  })}
                >
                  {empresas.map((empresa) => (
                    <option key={empresa.erpId} value={empresa.erpId}>{empresa.codigo} - {empresa.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                Codigo interno
                <input
                  value={campoEnEdicion.codigoInterno || ''}
                  onChange={(event) => setCampoEnEdicion((actual) => actual && { ...actual, codigoInterno: event.target.value })}
                  placeholder="Se normaliza en mayusculas"
                />
              </label>
              <label className="reference-wide">
                Nombre
                <input
                  value={campoEnEdicion.nombre}
                  onChange={(event) => setCampoEnEdicion((actual) => actual && { ...actual, nombre: event.target.value })}
                  placeholder="Nombre del campo"
                />
              </label>
              <label>
                Zona
                <select value={obtenerClaveZona(campoEnEdicion)} onChange={(event) => seleccionarZona(event.target.value)}>
                  <option value="">Sin zona</option>
                  {zonasDisponibles
                    .filter((zona) => zona.empresaErpId === campoEnEdicion.empresaErpId)
                    .map((zona) => (
                      <option key={`${zona.origen}:${zona.id}`} value={`${zona.origen}:${zona.id}`}>
                        {zona.codigo ? `${zona.codigo} - ` : ''}{zona.nombre} ({zona.origen === 'erp' ? 'ERP' : 'Agro App'})
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Estado
                <select
                  value={campoEnEdicion.estadoVinculacion}
                  onChange={(event) => setCampoEnEdicion((actual) => actual && { ...actual, estadoVinculacion: event.target.value as CampoPlanificacion['estadoVinculacion'] })}
                >
                  <option value="provisorio">Provisorio</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">La vinculacion con ERP quedara como accion separada y auditada.</span>
              <button className="primary" type="button" disabled={guardando} onClick={guardarCampo}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Guardar
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
