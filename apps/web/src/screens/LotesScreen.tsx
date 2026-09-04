import { useEffect, useMemo, useState } from 'react';
import type { CampoPlanificacion, ErpCampo, ErpEmpresa, ErpLote, LotePlanificacion, SesionUsuario } from '@agro/tipos';
import {
  guardarCampoPlanificacion,
  guardarLotePlanificacion,
  obtenerCamposErpImportados,
  obtenerCamposPlanificacion,
  obtenerLotesErpImportados,
  obtenerLotesPlanificacion,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type LotesScreenProps = {
  sesion: SesionUsuario;
  empresas: ErpEmpresa[];
  camposPropios: CampoPlanificacion[];
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type CampoSeleccionable = {
  clave: string;
  campoPlanificacionId?: string;
  campoErpId?: string;
  empresaErpId: string;
  codigo?: string;
  nombre: string;
  origen: 'agro' | 'erp';
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

function leerNumeroPositivo(valor: string) {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function crearLoteNuevo(clienteId: string, campoPlanificacionId: string): LotePlanificacion {
  const ahora = new Date().toISOString();

  return {
    id: `lote-planificacion-${Date.now()}`,
    clienteId,
    campoPlanificacionId,
    nombre: '',
    codigoInterno: '',
    superficieTotal: 0,
    superficieProductiva: 0,
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

function crearIdCampoDesdeErp(campoErpId: string) {
  return `campo-planificacion-${campoErpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

export function LotesScreen({ sesion, empresas, camposPropios, puedeConfigurarPlanificacion, notificar }: LotesScreenProps) {
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [camposPropiosActuales, setCamposPropiosActuales] = useState<CampoPlanificacion[]>(camposPropios);
  const [lotesPropios, setLotesPropios] = useState<LotePlanificacion[]>([]);
  const [estado, setEstado] = useState('Cargando lotes sincronizados.');
  const [guardando, setGuardando] = useState(false);
  const [loteEnEdicion, setLoteEnEdicion] = useState<LotePlanificacion | null>(null);
  const [campoSeleccionadoClave, setCampoSeleccionadoClave] = useState('');
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function cargarLotes() {
      try {
        const [respuestaLotesErp, respuestaCamposErp, respuestaCamposPropios, respuestaLotesPropios] = await Promise.all([
          obtenerLotesErpImportados(sesion.token),
          obtenerCamposErpImportados(sesion.token),
          obtenerCamposPlanificacion(sesion.token),
          obtenerLotesPlanificacion(sesion.token),
        ]);

        setLotesErp(respuestaLotesErp.lotes);
        setCamposErp(respuestaCamposErp.campos);
        setCamposPropiosActuales(respuestaCamposPropios.campos);
        setLotesPropios(respuestaLotesPropios.lotes);
        setEstado('Lotes cargados desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron lotes', mensaje });
      }
    }

    cargarLotes();
  }, [sesion.token, notificar]);

  const empresasPorId = useMemo(() => new Map(empresas.map((empresa) => [empresa.erpId, empresa])), [empresas]);
  const camposPropiosPorId = useMemo(() => new Map(camposPropiosActuales.map((campo) => [campo.id, campo])), [camposPropiosActuales]);
  const camposErpPorId = useMemo(() => new Map(camposErp.map((campo) => [campo.erpId, campo])), [camposErp]);
  const camposVinculados = useMemo(() => new Set(camposPropiosActuales.map((campo) => campo.campoErpId).filter(Boolean)), [camposPropiosActuales]);
  const camposSeleccionables = useMemo<CampoSeleccionable[]>(() => {
    const propios = camposPropiosActuales.map((campo) => ({
      clave: `agro:${campo.id}`,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigoInterno,
      nombre: campo.nombre,
      origen: 'agro' as const,
    }));
    const importados = camposErp
      .filter((campo) => !camposVinculados.has(campo.erpId))
      .map((campo) => ({
        clave: `erp:${campo.erpId}`,
        campoErpId: campo.erpId,
        empresaErpId: campo.empresaErpId,
        codigo: campo.codigo,
        nombre: campo.nombre,
        origen: 'erp' as const,
      }));

    return [...propios, ...importados].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposErp, camposPropiosActuales, camposVinculados]);
  const camposSeleccionablesPorClave = useMemo(
    () => new Map(camposSeleccionables.map((campo) => [campo.clave, campo])),
    [camposSeleccionables],
  );
  const lotesVinculados = useMemo(() => new Set(lotesPropios.map((lote) => lote.loteErpId).filter(Boolean)), [lotesPropios]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const lotesErpFiltrados = lotesErp.filter((lote) => {
    const campo = camposErpPorId.get(lote.campoErpId);
    const texto = normalizarCodigo(`${lote.codigo} ${lote.nombre} ${campo?.nombre || ''} ${empresasPorId.get(lote.empresaErpId)?.nombre || lote.empresaErpId}`);
    return texto.includes(filtroNormalizado);
  });
  const lotesPropiosFiltrados = lotesPropios.filter((lote) => {
    const campo = camposPropiosPorId.get(lote.campoPlanificacionId);
    const texto = normalizarCodigo(`${lote.codigoInterno || ''} ${lote.nombre} ${campo?.nombre || ''}`);
    return texto.includes(filtroNormalizado);
  });

  function abrirNuevoLote() {
    const campoSugerido = camposSeleccionables[0];

    if (!campoSugerido) {
      notificar?.({
        tipo: 'info',
        titulo: 'Primero falta un campo',
        mensaje: 'Para crear un lote propio, antes sincroniza campos ERP o crea un campo en Padrones > Campos.',
      });
      return;
    }

    setCampoSeleccionadoClave(campoSugerido.clave);
    setLoteEnEdicion(crearLoteNuevo(sesion.usuario.clienteId || 'cliente-demo', campoSugerido.campoPlanificacionId || ''));
  }

  function editarLote(lote: LotePlanificacion) {
    setCampoSeleccionadoClave(`agro:${lote.campoPlanificacionId}`);
    setLoteEnEdicion(lote);
  }

  function seleccionarCampo(clave: string) {
    const campo = camposSeleccionablesPorClave.get(clave);

    setCampoSeleccionadoClave(clave);
    setLoteEnEdicion((actual) => actual && {
      ...actual,
      campoPlanificacionId: campo?.campoPlanificacionId || '',
    });
  }

  async function obtenerCampoPlanificacionParaGuardar() {
    const campoSeleccionado = camposSeleccionablesPorClave.get(campoSeleccionadoClave);

    if (!campoSeleccionado) {
      return undefined;
    }

    if (campoSeleccionado.campoPlanificacionId) {
      return camposPropiosPorId.get(campoSeleccionado.campoPlanificacionId);
    }

    if (!campoSeleccionado.campoErpId) {
      return undefined;
    }

    const existente = camposPropiosActuales.find((campo) => campo.campoErpId === campoSeleccionado.campoErpId);

    if (existente) {
      return existente;
    }

    const campoErp = camposErpPorId.get(campoSeleccionado.campoErpId);

    if (!campoErp) {
      return undefined;
    }

    const ahora = new Date().toISOString();
    const campoPreparado: CampoPlanificacion = {
      id: crearIdCampoDesdeErp(campoErp.erpId),
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      empresaErpId: campoErp.empresaErpId,
      campoErpId: campoErp.erpId,
      nombre: campoErp.nombre,
      codigoInterno: normalizarCodigo(campoErp.codigo),
      zonaErpId: campoErp.idZona ? `${campoErp.empresaErpId}:zona:${campoErp.idZona}` : undefined,
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const respuesta = await guardarCampoPlanificacion(campoPreparado.id, {
      campo: campoPreparado,
      origen: 'web',
      motivo: 'Creacion automatica de campo operativo vinculado desde alta de lote',
    }, sesion.token);

    setCamposPropiosActuales((actuales) => [respuesta.campo, ...actuales]);
    setCampoSeleccionadoClave(`agro:${respuesta.campo.id}`);

    return respuesta.campo;
  }

  async function guardarLote() {
    if (!loteEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(loteEnEdicion.nombre);

    const superficieTotal = loteEnEdicion.superficieTotal;
    const superficieProductiva = loteEnEdicion.superficieProductiva;

    if (!nombre) {
      notificar?.({ tipo: 'error', titulo: 'Lote incompleto', mensaje: 'El nombre del lote es obligatorio.' });
      return;
    }

    if (superficieTotal <= 0 || superficieProductiva <= 0) {
      notificar?.({ tipo: 'error', titulo: 'Lote incompleto', mensaje: 'Las superficies del lote son obligatorias.' });
      return;
    }


    if (loteEnEdicion.superficieProductiva > loteEnEdicion.superficieTotal) {
      notificar?.({ tipo: 'error', titulo: 'Superficie invalida', mensaje: 'La superficie productiva no puede superar la superficie total.' });
      return;
    }

    const lotePreparado: LotePlanificacion = {
      ...loteEnEdicion,
      nombre,
      codigoInterno: loteEnEdicion.codigoInterno ? normalizarCodigo(loteEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const campoParaGuardar = await obtenerCampoPlanificacionParaGuardar();

      if (!campoParaGuardar) {
        throw new Error('Selecciona un campo valido para el lote.');
      }

      const respuesta = await guardarLotePlanificacion(lotePreparado.id, {
        lote: {
          ...lotePreparado,
          campoPlanificacionId: campoParaGuardar.id,
        },
        origen: 'web',
        motivo: 'Alta o edicion de lote desde padron maestro web',
      }, sesion.token);

      setLotesPropios((actuales) => {
        const existe = actuales.some((lote) => lote.id === respuesta.lote.id);
        return existe
          ? actuales.map((lote) => (lote.id === respuesta.lote.id ? respuesta.lote : lote))
          : [respuesta.lote, ...actuales];
      });
      setLoteEnEdicion(null);
      setEstado('Lote guardado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Lote guardado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el lote.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo el lote', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article>
          <span>ERP sincronizados</span>
          <strong>{lotesErp.length}</strong>
        </article>
        <article>
          <span>Propios Agro App</span>
          <strong>{lotesPropios.length}</strong>
        </article>
        <article>
          <span>Provisorios</span>
          <strong>{lotesPropios.filter((lote) => lote.estadoVinculacion === 'provisorio').length}</strong>
        </article>
        <article>
          <span>Vinculados</span>
          <strong>{lotesPropios.filter((lote) => lote.estadoVinculacion === 'vinculado_erp').length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Lotes</h2>
            <p className="hint">{estado}</p>
          </div>
          <div className="button-row">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo, lote, campo o empresa" />
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoLote}>
              Nuevo lote
            </button>
          </div>
        </div>

        <div className="field-list">
          <div className="field-row reference-list-head">
            <span>Lote</span>
            <span>Campo</span>
            <span>Superficie</span>
            <span>Origen</span>
            <span>Estado</span>
            <span>Accion</span>
          </div>

          {lotesPropiosFiltrados.map((lote) => {
            const campo = camposPropiosPorId.get(lote.campoPlanificacionId);

            return (
              <div className="field-row" key={lote.id}>
                <div>
                  <strong>{lote.nombre}</strong>
                  <span>{lote.codigoInterno || 'Sin codigo interno'}</span>
                </div>
                <span>{campo?.nombre || 'Campo no disponible'}</span>
                <span>{lote.superficieProductiva} / {lote.superficieTotal} ha</span>
                <span>Agro App</span>
                <em>{lote.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP'}</em>
                <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => editarLote(lote)}>
                  Editar
                </button>
              </div>
            );
          })}

          {lotesErpFiltrados.map((lote) => {
            const campo = camposErpPorId.get(lote.campoErpId);

            return (
              <div className="field-row" key={lote.erpId}>
                <div>
                  <strong>{lote.nombre}</strong>
                  <span>{lote.codigo} - x-company {lote.empresaErpId.replace('empresa:', '')}</span>
                </div>
                <span>{campo?.nombre || `Campo ${lote.idCampo}`}</span>
                <span>{lote.hectareasProductivas ?? lote.areaHectareas} / {lote.areaHectareas} ha</span>
                <span>ERP</span>
                <em>{lotesVinculados.has(lote.erpId) ? 'Vinculado' : 'Disponible'}</em>
                <button className="small" type="button" disabled>
                  Vincular
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {loteEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel">
            <div className="modal-header">
              <div>
                <h2>{lotesPropios.some((lote) => lote.id === loteEnEdicion.id) ? 'Editar lote' : 'Nuevo lote'}</h2>
                <p className="hint">Los lotes propios permiten planificar aunque todavia no existan en ALBOR.</p>
              </div>
              <button className="ghost" type="button" onClick={() => setLoteEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label className="reference-wide">
                Campo
                <select
                  value={campoSeleccionadoClave || `agro:${loteEnEdicion.campoPlanificacionId}`}
                  onChange={(event) => seleccionarCampo(event.target.value)}
                >
                  {camposSeleccionables.map((campo) => (
                    <option key={campo.clave} value={campo.clave}>
                      {campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Codigo interno
                <input
                  value={loteEnEdicion.codigoInterno || ''}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, codigoInterno: event.target.value })}
                  placeholder="Se normaliza en mayusculas"
                />
              </label>
              <label className="reference-wide">
                Nombre
                <input
                  value={loteEnEdicion.nombre}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, nombre: event.target.value })}
                  placeholder="Nombre del lote"
                />
              </label>
              <label>
                Superficie total
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={loteEnEdicion.superficieTotal}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, superficieTotal: leerNumeroPositivo(event.target.value) })}
                />
              </label>
              <label>
                Superficie productiva
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={loteEnEdicion.superficieProductiva}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, superficieProductiva: leerNumeroPositivo(event.target.value) })}
                />
              </label>
              <label>
                Estado
                <select
                  value={loteEnEdicion.estadoVinculacion}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, estadoVinculacion: event.target.value as LotePlanificacion['estadoVinculacion'] })}
                >
                  <option value="provisorio">Provisorio</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">La vinculacion con ERP quedara como accion separada, propuesta y auditada.</span>
              <button className="primary" type="button" disabled={guardando} onClick={guardarLote}>
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
