import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, ErpCampo, ErpEmpresa, ErpZona, SesionUsuario, ZonaApp } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { OriginBadge } from '../components/OriginBadge';
import { Panel } from '../components/Panel';
import { guardarCampoApp, obtenerCamposErpImportados, obtenerCamposApp, obtenerZonasErpImportadas, obtenerZonasApp } from '../services/api';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type CamposScreenProps = {
  sesion: SesionUsuario;
  empresas: ErpEmpresa[];
  zonasPropias: ZonaApp[];
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
  zonaAppId?: string;
};

type CampoTabla = {
  id: string;
  nombre: string;
  detalle: string;
  empresa: string;
  zona: string;
  origen: string;
  estado: string;
  accion: 'editar' | 'importado';
  campoPropio?: CampoApp;
  campoErp?: ErpCampo;
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

function crearCampoNuevo(clienteId: string, empresaErpId: string): CampoApp {
  const ahora = new Date().toISOString();

  return {
    id: `campo-app-${Date.now()}`,
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
  const [camposPropios, setCamposPropios] = useState<CampoApp[]>([]);
  const [zonasPropiasActuales, setZonasPropiasActuales] = useState<ZonaApp[]>(zonasPropias);
  const [estado, setEstado] = useState('Cargando campos sincronizados.');
  const [guardando, setGuardando] = useState(false);
  const [campoEnEdicion, setCampoEnEdicion] = useState<CampoApp | null>(null);
  const [campoPropioParaVincular, setCampoPropioParaVincular] = useState<CampoApp | null>(null);
  const [campoErpVincularId, setCampoErpVincularId] = useState('');
  const [filtro, setFiltro] = useState('');
  const [filtroZonaClave, setFiltroZonaClave] = useState('');

  useEffect(() => {
    async function cargarCampos() {
      try {
        const [respuestaErp, respuestaZonasErp, respuestaPropios, respuestaZonasPropias] = await Promise.all([
          obtenerCamposErpImportados(sesion.token),
          obtenerZonasErpImportadas(sesion.token),
          obtenerCamposApp(sesion.token),
          obtenerZonasApp(sesion.token),
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
      zonaAppId: zona.id,
    }));

    return [...zonasDesdeAgro, ...zonasDesdeErp].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [zonasErp, zonasPropiasActuales]);
  const zonasPorClave = useMemo(() => {
    const mapa = new Map<string, ZonaSeleccionable>();

    for (const zona of zonasDisponibles) {
      if (zona.zonaAppId) {
        mapa.set(`agro:${zona.zonaAppId}`, zona);
      }

      if (zona.zonaErpId) {
        mapa.set(`erp:${zona.zonaErpId}`, zona);
      }
    }

    return mapa;
  }, [zonasDisponibles]);
  const camposVinculados = useMemo(
    () => new Set(camposPropios.map((campo) => campo.campoErpId).filter((id): id is string => Boolean(id))),
    [camposPropios],
  );
  const camposErpDisponiblesParaVincular = useMemo(() => {
    if (!campoPropioParaVincular) {
      return [];
    }

    const zonaPropia = campoPropioParaVincular.zonaAppId
      ? zonasPropiasActuales.find((zona) => zona.id === campoPropioParaVincular.zonaAppId)
      : undefined;
    const zonaErpEsperada = campoPropioParaVincular.zonaErpId || zonaPropia?.zonaErpId;
    const idZonaEsperada = obtenerIdZonaDesdeErpId(zonaErpEsperada);

    return camposErp
      .filter((campo) => !camposVinculados.has(campo.erpId))
      .filter((campo) => campo.empresaErpId === campoPropioParaVincular.empresaErpId)
      .filter((campo) => !idZonaEsperada || campo.idZona === idZonaEsperada)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [campoPropioParaVincular, camposErp, camposVinculados, zonasPropiasActuales]);
  const camposErpSugeridosParaVincular = useMemo(() => (
    campoPropioParaVincular
      ? sugerirVinculacion(
        { codigo: campoPropioParaVincular.codigoInterno, nombre: campoPropioParaVincular.nombre },
        camposErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.nombre,
      )
      : []
  ), [campoPropioParaVincular, camposErpDisponiblesParaVincular]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const camposErpFiltrados = camposErp.filter((campo) => {
    const zonaFiltrada = filtroZonaClave ? zonasPorClave.get(filtroZonaClave) : undefined;
    const texto = normalizarCodigo(`${campo.codigo} ${campo.nombre} ${empresasPorId.get(campo.empresaErpId)?.nombre || campo.empresaErpId}`);
    const coincideZona = !zonaFiltrada || zonaFiltrada.idZona === campo.idZona;

    return texto.includes(filtroNormalizado) && coincideZona;
  });
  const camposPropiosFiltrados = camposPropios.filter((campo) => !campo.campoErpId).filter((campo) => {
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
      accion: 'importado' as const,
      campoErp: campo,
    })),
  ];

  function abrirNuevoCampo() {
    const empresaErpId = empresas[0]?.erpId || zonasDisponibles[0]?.empresaErpId || 'empresa:1';
    const zonaSugerida = zonasDisponibles.find((zona) => zona.empresaErpId === empresaErpId);

    setCampoEnEdicion({
      ...crearCampoNuevo(sesion.usuario.clienteId || 'cliente-demo', empresaErpId),
      zonaAppId: zonaSugerida?.zonaAppId,
      zonaErpId: zonaSugerida?.zonaErpId,
    });
  }

  function obtenerClaveZona(campo: CampoApp) {
    if (campo.zonaAppId) {
      return `agro:${campo.zonaAppId}`;
    }

    if (campo.zonaErpId) {
      return `erp:${campo.zonaErpId}`;
    }

    return '';
  }

  function obtenerNombreZona(campo: CampoApp) {
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
      empresaErpId: zona && zona.empresaErpId !== 'global' ? zona.empresaErpId : actual.empresaErpId,
      zonaAppId: zona?.zonaAppId,
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

    const campoPreparado: CampoApp = {
      ...campoEnEdicion,
      nombre,
      codigoInterno: campoEnEdicion.codigoInterno ? normalizarCodigo(campoEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarCampoApp(campoPreparado.id, {
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

  function abrirVinculacion(campo: CampoApp) {
    const candidatos = sugerirVinculacion(
      { codigo: campo.codigoInterno, nombre: campo.nombre },
      obtenerCamposErpCompatibles(campo),
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );

    if (campo.estadoVinculacion !== 'provisorio' || campo.campoErpId) {
      notificar?.({
        tipo: 'info',
        titulo: 'Campo no vinculable',
        mensaje: 'Solo se pueden vincular campos propios en estado provisorio.',
      });
      return;
    }

    if (!candidatos.length) {
      notificar?.({
        tipo: 'info',
        titulo: 'No hay campo ERP compatible',
        mensaje: 'No se encontro un campo ERP disponible para vincular con este campo provisorio.',
      });
      return;
    }

    setCampoPropioParaVincular(campo);
    setCampoErpVincularId(candidatos[0].registro.erpId);
  }

  function obtenerCamposErpCompatibles(campoPropio: CampoApp) {
    const zonaPropia = campoPropio.zonaAppId
      ? zonasPropiasActuales.find((zona) => zona.id === campoPropio.zonaAppId)
      : undefined;
    const zonaErpEsperada = campoPropio.zonaErpId || zonaPropia?.zonaErpId;
    const idZonaEsperada = obtenerIdZonaDesdeErpId(zonaErpEsperada);

    return camposErp
      .filter((campo) => !camposVinculados.has(campo.erpId))
      .filter((campo) => campo.empresaErpId === campoPropio.empresaErpId)
      .filter((campo) => !idZonaEsperada || campo.idZona === idZonaEsperada)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async function confirmarVinculacionCampo() {
    if (!campoPropioParaVincular || !campoErpVincularId) {
      return;
    }

    const campoErp = camposErp.find((campo) => campo.erpId === campoErpVincularId);

    if (!campoErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro el campo ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await guardarCampoApp(campoPropioParaVincular.id, {
        campo: {
          ...campoPropioParaVincular,
          empresaErpId: campoErp.empresaErpId,
          campoErpId: campoErp.erpId,
          zonaErpId: campoErp.idZona ? `zona:${campoErp.idZona}` : campoPropioParaVincular.zonaErpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con campo ERP ${campoErp.erpId}`,
      }, sesion.token);

      setCamposPropios((actuales) => actuales.map((campo) => (campo.id === respuesta.campo.id ? respuesta.campo : campo)));
      setCampoPropioParaVincular(null);
      setCampoErpVincularId('');
      setEstado('Campo vinculado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Campo vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el campo.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo el campo', mensaje });
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

      <Panel
        title="Campos"
        description={estado}
        actions={(
          <ActionBar align="end">
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
            <Button variant="primary" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoCampo}>
              Nuevo campo
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={filasCampo}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay campos para el filtro seleccionado."
          initialPageSize={25}
          columns={[
            { key: 'campo', label: 'Campo', width: 'minmax(190px, 1.35fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'empresa', label: 'Empresa', width: 'minmax(150px, 1fr)', render: (fila) => fila.empresa },
            { key: 'zona', label: 'Zona', width: 'minmax(110px, 0.75fr)', render: (fila) => fila.zona },
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.7fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(150px, 0.7fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton icon="edit" label={`Editar campo ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.campoPropio && setCampoEnEdicion(fila.campoPropio)} />
                    {fila.campoPropio?.estadoVinculacion === 'provisorio' && !fila.campoPropio.campoErpId && (
                      <IconButton icon="link" label={`Vincular campo ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.campoPropio && abrirVinculacion(fila.campoPropio)} />
                    )}
                  </div>
                )
                : <span className="hint">Importado</span>,
            },
          ]}
        />
      </Panel>

      {campoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel">
            <div className="modal-header">
              <div>
                <h2>{camposPropios.some((campo) => campo.id === campoEnEdicion.id) ? 'Editar campo' : 'Nuevo campo'}</h2>
                <p className="hint">Los campos creados aca son propios de Agro App hasta vincularlos con ALBOR.</p>
              </div>
              <Button variant="ghost" onClick={() => setCampoEnEdicion(null)}>Cerrar</Button>
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
                      zonaAppId: mismaEmpresa ? actual.zonaAppId : undefined,
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
                  onChange={(event) => setCampoEnEdicion((actual) => actual && { ...actual, estadoVinculacion: event.target.value as CampoApp['estadoVinculacion'] })}
                >
                  <option value="provisorio">Provisorio</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">La vinculacion con ERP quedara como accion separada y auditada.</span>
              <Button variant="primary" disabled={guardando} onClick={guardarCampo}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Guardar
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {campoPropioParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-campo-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-campo-title">Vincular campo provisorio</h2>
                <p className="hint">La vinculacion enlaza el campo propio con el identificador ERP y deja visible el campo sincronizado como referencia operativa.</p>
              </div>
              <Button variant="ghost" onClick={() => { setCampoPropioParaVincular(null); setCampoErpVincularId(''); }}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Campo provisorio</span>
                <strong>{campoPropioParaVincular.nombre}</strong>
                <span>{campoPropioParaVincular.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <label className="reference-wide">
                Campo ERP disponible
                <select value={campoErpVincularId} onChange={(event) => setCampoErpVincularId(event.target.value)}>
                  {camposErpSugeridosParaVincular.map(({ registro, motivo }) => (
                    <option key={registro.erpId} value={registro.erpId}>
                      {registro.codigo ? `${registro.codigo} - ` : ''}{registro.nombre} ({obtenerNombreZonaErp(registro)}; {motivo})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">El backend valida que el campo ERP exista, respete la zona vinculada y no este asociado a otro campo del cliente.</span>
              <Button variant="primary" disabled={guardando || !campoErpVincularId} onClick={confirmarVinculacionCampo}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Vincular
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
