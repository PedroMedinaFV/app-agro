import { useEffect, useMemo, useState } from 'react';
import type { CampoPlanificacion, ErpCampo, ErpEmpresa, ErpLote, LotePlanificacion, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
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

type LoteTabla = {
  id: string;
  nombre: string;
  detalle: string;
  campo: string;
  superficie: string;
  origen: string;
  estado: string;
  accion: 'editar' | 'importado';
  lotePropio?: LotePlanificacion;
  loteErp?: ErpLote;
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
  const [modoFormulario, setModoFormulario] = useState<'crear' | 'editar' | 'copiar'>('crear');
  const [lotePropioParaVincular, setLotePropioParaVincular] = useState<LotePlanificacion | null>(null);
  const [loteErpVincularId, setLoteErpVincularId] = useState('');
  const [campoSeleccionadoClave, setCampoSeleccionadoClave] = useState('');
  const [filtroCampoClave, setFiltroCampoClave] = useState('');
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
  const camposParaFiltrar = useMemo<CampoSeleccionable[]>(() => {
    const propios = camposPropiosActuales.map((campo) => ({
      clave: `agro:${campo.id}`,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigoInterno,
      nombre: campo.nombre,
      origen: 'agro' as const,
    }));
    const importados = camposErp.map((campo) => ({
      clave: `erp:${campo.erpId}`,
      campoErpId: campo.erpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigo,
      nombre: campo.nombre,
      origen: 'erp' as const,
    }));

    return [...propios, ...importados].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposErp, camposPropiosActuales]);
  const camposParaFiltrarPorClave = useMemo(
    () => new Map(camposParaFiltrar.map((campo) => [campo.clave, campo])),
    [camposParaFiltrar],
  );
  const lotesVinculados = useMemo(() => new Set(lotesPropios.map((lote) => lote.loteErpId).filter(Boolean)), [lotesPropios]);
  const lotesErpDisponiblesParaVincular = useMemo(() => {
    if (!lotePropioParaVincular) {
      return [];
    }

    const campoPropio = camposPropiosPorId.get(lotePropioParaVincular.campoPlanificacionId);

    return lotesErp
      .filter((lote) => !lotesVinculados.has(lote.erpId))
      .filter((lote) => !campoPropio?.campoErpId || campoPropio.campoErpId === lote.campoErpId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposPropiosPorId, lotePropioParaVincular, lotesErp, lotesVinculados]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const campoFiltrado = filtroCampoClave ? camposParaFiltrarPorClave.get(filtroCampoClave) : undefined;
  const lotesErpFiltrados = lotesErp.filter((lote) => {
    const campo = camposErpPorId.get(lote.campoErpId);
    const texto = normalizarCodigo(`${lote.codigo} ${lote.nombre} ${campo?.nombre || ''} ${empresasPorId.get(lote.empresaErpId)?.nombre || lote.empresaErpId}`);
    const coincideCampo = !campoFiltrado || lote.campoErpId === campoFiltrado.campoErpId;

    return texto.includes(filtroNormalizado) && coincideCampo;
  });
  const lotesPropiosFiltrados = lotesPropios.filter((lote) => !lote.loteErpId).filter((lote) => {
    const campo = camposPropiosPorId.get(lote.campoPlanificacionId);
    const texto = normalizarCodigo(`${lote.codigoInterno || ''} ${lote.nombre} ${campo?.nombre || ''}`);
    const coincideCampo = !campoFiltrado
      || lote.campoPlanificacionId === campoFiltrado.campoPlanificacionId
      || Boolean(campoFiltrado.campoErpId && campo?.campoErpId === campoFiltrado.campoErpId);

    return texto.includes(filtroNormalizado) && coincideCampo;
  });
  const filasLote: LoteTabla[] = [
    ...lotesPropiosFiltrados.map((lote) => {
      const campo = camposPropiosPorId.get(lote.campoPlanificacionId);

      return {
        id: lote.id,
        nombre: lote.nombre,
        detalle: lote.codigoInterno || 'Sin codigo interno',
        campo: campo?.nombre || 'Campo no disponible',
        superficie: `${lote.superficieProductiva} / ${lote.superficieTotal} ha`,
        origen: 'Agro App',
        estado: lote.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP',
        accion: 'editar' as const,
        lotePropio: lote,
      };
    }),
    ...lotesErpFiltrados.map((lote) => {
      const campo = camposErpPorId.get(lote.campoErpId);

      return {
        id: lote.erpId,
        nombre: lote.nombre,
        detalle: `${lote.codigo} - x-company ${lote.empresaErpId.replace('empresa:', '')}`,
        campo: campo?.nombre || `Campo ${lote.idCampo}`,
        superficie: `${lote.hectareasProductivas ?? lote.areaHectareas} / ${lote.areaHectareas} ha`,
        origen: 'ERP',
        estado: lotesVinculados.has(lote.erpId) ? 'Vinculado' : 'Disponible',
        accion: 'importado' as const,
        loteErp: lote,
      };
    }),
  ];

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

    setModoFormulario('crear');
    setCampoSeleccionadoClave(campoSugerido.clave);
    setLoteEnEdicion(crearLoteNuevo(sesion.usuario.clienteId || 'cliente-demo', campoSugerido.campoPlanificacionId || ''));
  }

  function editarLote(lote: LotePlanificacion) {
    setModoFormulario('editar');
    setCampoSeleccionadoClave(`agro:${lote.campoPlanificacionId}`);
    setLoteEnEdicion(lote);
  }

  function copiarLote(lote: LotePlanificacion) {
    const ahora = new Date().toISOString();

    setModoFormulario('copiar');
    setCampoSeleccionadoClave(`agro:${lote.campoPlanificacionId}`);
    setLoteEnEdicion({
      ...lote,
      id: `lote-planificacion-${Date.now()}`,
      loteErpId: undefined,
      nombre: lote.nombre,
      codigoInterno: lote.codigoInterno ? `${lote.codigoInterno}-COPIA` : '',
      estadoVinculacion: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    });
  }

  function copiarLoteErp(lote: ErpLote) {
    const campoErp = camposErpPorId.get(lote.campoErpId);
    const campoClave = `erp:${lote.campoErpId}`;
    const ahora = new Date().toISOString();

    setModoFormulario('copiar');
    setCampoSeleccionadoClave(campoClave);
    setLoteEnEdicion({
      id: `lote-planificacion-${Date.now()}`,
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      campoPlanificacionId: '',
      loteErpId: undefined,
      nombre: lote.nombre,
      //codigoInterno: lote.codigo ? `${normalizarCodigo(lote.codigo)}-COPIA` : '',
      codigoInterno: '',
      superficieTotal: 0,
      superficieProductiva: 0,
      estadoVinculacion: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    });

    if (!campoErp) {
      notificar?.({
        tipo: 'info',
        titulo: 'Campo ERP pendiente',
        mensaje: 'Al guardar se validara que el campo del lote exista como campo operativo.',
      });
    }
  }

  function abrirVinculacion(lote: LotePlanificacion) {
    const campoPropio = camposPropiosPorId.get(lote.campoPlanificacionId);
    const candidatos = lotesErp
      .filter((loteErp) => !lotesVinculados.has(loteErp.erpId))
      .filter((loteErp) => !campoPropio?.campoErpId || campoPropio.campoErpId === loteErp.campoErpId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    if (lote.estadoVinculacion !== 'provisorio' || lote.loteErpId) {
      notificar?.({
        tipo: 'info',
        titulo: 'Lote no vinculable',
        mensaje: 'Solo se pueden vincular lotes propios en estado provisorio.',
      });
      return;
    }

    if (!candidatos.length) {
      notificar?.({
        tipo: 'info',
        titulo: 'No hay lote ERP compatible',
        mensaje: 'No se encontro un lote ERP disponible para vincular con este lote provisorio.',
      });
      return;
    }

    setLotePropioParaVincular(lote);
    setLoteErpVincularId(candidatos[0].erpId);
  }

  async function confirmarVinculacionLote() {
    if (!lotePropioParaVincular || !loteErpVincularId) {
      return;
    }

    const loteErp = lotesErp.find((lote) => lote.erpId === loteErpVincularId);

    if (!loteErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro el lote ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await guardarLotePlanificacion(lotePropioParaVincular.id, {
        lote: {
          ...lotePropioParaVincular,
          loteErpId: loteErp.erpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con lote ERP ${loteErp.erpId}`,
      }, sesion.token);

      setLotesPropios((actuales) => actuales.map((lote) => (lote.id === respuesta.lote.id ? respuesta.lote : lote)));
      setLotePropioParaVincular(null);
      setLoteErpVincularId('');
      setEstado('Lote vinculado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Lote vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el lote.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo el lote', mensaje });
    } finally {
      setGuardando(false);
    }
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
      zonaErpId: campoErp.idZona ? `zona:${campoErp.idZona}` : undefined,
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
            <label className="compact-field">
              Campo
              <select value={filtroCampoClave} onChange={(event) => setFiltroCampoClave(event.target.value)}>
                <option value="">Todos</option>
                {camposParaFiltrar.map((campo) => (
                  <option key={campo.clave} value={campo.clave}>
                    {campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoLote}>
              Nuevo lote
            </button>
          </div>
        </div>

        <DataTable
          rows={filasLote}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay lotes para el filtro seleccionado."
          initialPageSize={25}
          columns={[
            { key: 'lote', label: 'Lote', width: 'minmax(190px, 1.35fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'campo', label: 'Campo', width: 'minmax(150px, 1fr)', render: (fila) => fila.campo },
            { key: 'superficie', label: 'Superficie', width: 'minmax(110px, 0.75fr)', render: (fila) => fila.superficie },
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => fila.origen },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.7fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(150px, 0.75fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="button-row table-actions">
                    <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && editarLote(fila.lotePropio)}>Editar</button>
                    <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && copiarLote(fila.lotePropio)}>Copiar</button>
                    {fila.lotePropio?.estadoVinculacion === 'provisorio' && (
                      <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && abrirVinculacion(fila.lotePropio)}>Vincular</button>
                    )}
                  </div>
                )
                : (
                  <div className="button-row table-actions">
                    <button className="small" type="button" disabled={!puedeConfigurarPlanificacion || !fila.loteErp} onClick={() => fila.loteErp && copiarLoteErp(fila.loteErp)}>Copiar</button>
                  </div>
                ),
            },
          ]}
        />
      </section>

      {loteEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel">
            <div className="modal-header">
              <div>
                <h2>{modoFormulario === 'editar' ? 'Editar lote' : modoFormulario === 'copiar' ? 'Copiar lote' : 'Nuevo lote'}</h2>
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
              <span className="hint">{modoFormulario === 'copiar' ? 'La copia se guarda como lote provisorio nuevo y queda lista para ajustar nombre o codigo.' : 'La vinculacion con ERP quedara como accion separada, propuesta y auditada.'}</span>
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

      {lotePropioParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-lote-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-lote-title">Vincular lote provisorio</h2>
                <p className="hint">La vinculacion no modifica los datos historicos de planificacion; solo enlaza el lote propio con el identificador ERP.</p>
              </div>
              <button className="ghost" type="button" onClick={() => { setLotePropioParaVincular(null); setLoteErpVincularId(''); }}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Lote provisorio</span>
                <strong>{lotePropioParaVincular.nombre}</strong>
                <span>{lotePropioParaVincular.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <label className="reference-wide">
                Lote ERP disponible
                <select value={loteErpVincularId} onChange={(event) => setLoteErpVincularId(event.target.value)}>
                  {lotesErpDisponiblesParaVincular.map((lote) => {
                    const campo = camposErpPorId.get(lote.campoErpId);

                    return (
                      <option key={lote.erpId} value={lote.erpId}>
                        {lote.codigo ? `${lote.codigo} - ` : ''}{lote.nombre} ({campo?.nombre || `Campo ${lote.idCampo}`})
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">El backend valida que el lote ERP exista y que no este vinculado a otro lote del cliente.</span>
              <button className="primary" type="button" disabled={guardando || !loteErpVincularId} onClick={confirmarVinculacionLote}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Vincular
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
