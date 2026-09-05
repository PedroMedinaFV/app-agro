import { useEffect, useMemo, useState } from 'react';
import type { CampoPlanificacion, ErpCampo, ErpEmpresa, ErpZona, SesionUsuario, ZonaPlanificacion } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { guardarCampoPlanificacion, obtenerCamposErpImportados, obtenerCamposPlanificacion, obtenerZonasErpImportadas, obtenerZonasPlanificacion } from '../services/api';

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
  idZona?: number;
  origen: 'erp' | 'agro';
  zonaErpId?: string;
  zonaPlanificacionId?: string;
};

type CampoTabla = {
  id: string;
  nombre: string;
  detalle: string;
  empresa: string;
  zona: string;
  origen: string;
  estado: string;
  accion: 'editar' | 'vincular';
  campoPropio?: CampoPlanificacion;
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

function obtenerIdZonaDesdeErpId(zonaErpId?: string) {
  const match = zonaErpId?.match(/zona:(\d+)$/);

  return match ? Number(match[1]) : undefined;
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
  const [zonasPropiasActuales, setZonasPropiasActuales] = useState<ZonaPlanificacion[]>(zonasPropias);
  const [estado, setEstado] = useState('Cargando campos sincronizados.');
  const [guardando, setGuardando] = useState(false);
  const [campoEnEdicion, setCampoEnEdicion] = useState<CampoPlanificacion | null>(null);
  const [filtro, setFiltro] = useState('');
  const [filtroZonaClave, setFiltroZonaClave] = useState('');

  useEffect(() => {
    async function cargarCampos() {
      try {
        const [respuestaErp, respuestaZonasErp, respuestaPropios, respuestaZonasPropias] = await Promise.all([
          obtenerCamposErpImportados(sesion.token),
          obtenerZonasErpImportadas(sesion.token),
          obtenerCamposPlanificacion(sesion.token),
          obtenerZonasPlanificacion(sesion.token),
        ]);

        setCamposErp(respuestaErp.campos);
        setZonasErp(respuestaZonasErp.zonas);
        setCamposPropios(respuestaPropios.campos);
        setZonasPropiasActuales(respuestaZonasPropias.zonas);
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
      idZona: zona.idZona,
      origen: 'erp' as const,
      zonaErpId: zona.erpId,
    }));
    const zonasDesdeAgro = zonasPropiasActuales.map((zona) => ({
      id: zona.id,
      empresaErpId: zona.empresaErpId,
      nombre: zona.nombre,
      codigo: zona.codigoInterno,
      idZona: obtenerIdZonaDesdeErpId(zona.zonaErpId),
      origen: 'agro' as const,
      zonaErpId: zona.zonaErpId,
      zonaPlanificacionId: zona.id,
    }));

    return [...zonasDesdeAgro, ...zonasDesdeErp].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [zonasErp, zonasPropiasActuales]);
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
    const zonaFiltrada = filtroZonaClave ? zonasPorClave.get(filtroZonaClave) : undefined;
    const texto = normalizarCodigo(`${campo.codigo} ${campo.nombre} ${empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId}`);
    const coincideZona = !zonaFiltrada || zonaFiltrada.idZona === campo.idZona;

    return texto.includes(filtroNormalizado) && coincideZona;
  });
  const camposPropiosFiltrados = camposPropios.filter((campo) => {
    const zonaFiltrada = filtroZonaClave ? zonasPorClave.get(filtroZonaClave) : undefined;
    const texto = normalizarCodigo(`${campo.codigoInterno || ''} ${campo.nombre} ${campo.empresaErpId}`);
    const idZonaCampo = obtenerIdZonaDesdeErpId(campo.zonaErpId);
    const coincideZona = !zonaFiltrada
      || filtroZonaClave === obtenerClaveZona(campo)
      || Boolean(zonaFiltrada.idZona && idZonaCampo === zonaFiltrada.idZona);

    return texto.includes(filtroNormalizado) && coincideZona;
  });
  const filasCampo: CampoTabla[] = [
    ...camposPropiosFiltrados.map((campo) => ({
      id: campo.id,
      nombre: campo.nombre,
      detalle: campo.codigoInterno || 'Sin codigo interno',
      empresa: empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId,
      zona: obtenerNombreZona(campo),
      origen: 'Agro App',
      estado: campo.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP',
      accion: 'editar' as const,
      campoPropio: campo,
    })),
    ...camposErpFiltrados.map((campo) => ({
      id: campo.erpId,
      nombre: campo.nombre,
      detalle: `${campo.codigo} - x-company ${campo.empresaErpId.replace('empresa:', '')}`,
      empresa: empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId,
      zona: obtenerNombreZonaErp(campo),
      origen: 'ERP',
      estado: camposVinculados.has(campo.erpId) ? 'Vinculado' : 'Disponible',
      accion: 'vincular' as const,
    })),
  ];

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
    const zonaErpIdGlobal = campo.idZona ? `zona:${campo.idZona}` : undefined;
    const zonaErpIdLegacy = campo.idZona ? `${campo.empresaErpId}:zona:${campo.idZona}` : undefined;

    return zonaErpIdGlobal
      ? zonasPorClave.get(`erp:${zonaErpIdGlobal}`)?.nombre
        || zonasPorClave.get(`erp:${zonaErpIdLegacy}`)?.nombre
        || `Zona ${campo.idZona}`
      : 'Sin zona';
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
            <label className="compact-field">
              Zona
              <select value={filtroZonaClave} onChange={(event) => setFiltroZonaClave(event.target.value)}>
                <option value="">Todas</option>
                {zonasDisponibles.map((zona) => (
                  <option key={`${zona.origen}:${zona.id}`} value={`${zona.origen}:${zona.id}`}>
                    {zona.codigo ? `${zona.codigo} - ` : ''}{zona.nombre} ({zona.origen === 'erp' ? 'ERP' : 'Agro App'})
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoCampo}>
              Nuevo campo
            </button>
          </div>
        </div>

        <DataTable
          rows={filasCampo}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay campos para el filtro seleccionado."
          initialPageSize={25}
          columns={[
            { key: 'campo', label: 'Campo', width: 'minmax(190px, 1.35fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'empresa', label: 'Empresa', width: 'minmax(150px, 1fr)', render: (fila) => fila.empresa },
            { key: 'zona', label: 'Zona', width: 'minmax(110px, 0.75fr)', render: (fila) => fila.zona },
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => fila.origen },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.7fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(86px, 0.5fr)',
              render: (fila) => fila.accion === 'editar'
                ? <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => fila.campoPropio && setCampoEnEdicion(fila.campoPropio)}>Editar</button>
                : <button className="small" type="button" disabled>Vincular</button>,
            },
          ]}
        />
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
                    .filter((zona) => zona.empresaErpId === 'global' || zona.empresaErpId === campoEnEdicion.empresaErpId)
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
