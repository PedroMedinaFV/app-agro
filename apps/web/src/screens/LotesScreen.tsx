import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, ErpCampo, ErpEmpresa, ErpLote, LoteApp, LoteArchivoGeografico, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { FormularioLoteModal } from '../components/lotes/FormularioLoteModal';
import { ModalArchivosGeograficosLote } from '../components/lotes/ModalArchivosGeograficosLote';
import { ModalVincularLote } from '../components/lotes/ModalVincularLote';
import { OriginBadge } from '../components/OriginBadge';
import { Panel } from '../components/Panel';
import {
  guardarCampoApp,
  guardarArchivoGeograficoLote,
  guardarLoteApp,
  crearUrlSubidaArchivoGeograficoLote,
  obtenerArchivosGeograficosLote,
  obtenerCamposErpImportados,
  obtenerCamposApp,
  obtenerLotesErpImportados,
  obtenerLotesApp,
  subirArchivoAFirmaSupabase,
} from '../services/api';
import {
  construirCamposSeleccionables,
  construirFilasLotes,
  crearIdArchivoGeografico,
  crearIdCampoDesdeErp,
  crearLoteNuevo,
  filtrarLotesErp,
  filtrarLotesPropios,
  limpiarTextoVisible,
  normalizarCodigo,
  obtenerMimeArchivoGeografico,
  obtenerTipoArchivoGeografico,
} from '../utils/lotes/helpersLotes';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type LotesScreenProps = {
  sesion: SesionUsuario;
  empresas: ErpEmpresa[];
  camposPropios: CampoApp[];
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

export function LotesScreen({ sesion, empresas, camposPropios, puedeConfigurarPlanificacion, notificar }: LotesScreenProps) {
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [camposPropiosActuales, setCamposPropiosActuales] = useState<CampoApp[]>(camposPropios);
  const [lotesPropios, setLotesPropios] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando lotes sincronizados.');
  const [guardando, setGuardando] = useState(false);
  const [loteEnEdicion, setLoteEnEdicion] = useState<LoteApp | null>(null);
  const [modoFormulario, setModoFormulario] = useState<'crear' | 'editar' | 'copiar'>('crear');
  const [lotePropioParaVincular, setLotePropioParaVincular] = useState<LoteApp | null>(null);
  const [loteArchivosGeograficos, setLoteArchivosGeograficos] = useState<LoteApp | null>(null);
  const [archivosGeograficos, setArchivosGeograficos] = useState<LoteArchivoGeografico[]>([]);
  const [archivoGeograficoSeleccionado, setArchivoGeograficoSeleccionado] = useState<File | null>(null);
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
          obtenerCamposApp(sesion.token),
          obtenerLotesApp(sesion.token),
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
  const camposSeleccionables = useMemo(
    () => construirCamposSeleccionables(camposPropiosActuales, camposErp),
    [camposErp, camposPropiosActuales],
  );
  const camposSeleccionablesPorClave = useMemo(
    () => new Map(camposSeleccionables.map((campo) => [campo.clave, campo])),
    [camposSeleccionables],
  );
  const camposParaFiltrar = useMemo(
    () => construirCamposSeleccionables(camposPropiosActuales, camposErp, false),
    [camposErp, camposPropiosActuales],
  );
  const camposParaFiltrarPorClave = useMemo(
    () => new Map(camposParaFiltrar.map((campo) => [campo.clave, campo])),
    [camposParaFiltrar],
  );
  const lotesVinculados = useMemo(() => (
    new Set(lotesPropios.map((lote) => lote.loteErpId).filter((loteErpId): loteErpId is string => Boolean(loteErpId)))
  ), [lotesPropios]);
  const lotesErpDisponiblesParaVincular = useMemo(() => {
    if (!lotePropioParaVincular) {
      return [];
    }

    const campoPropio = camposPropiosPorId.get(lotePropioParaVincular.campoAppId);

    return lotesErp
      .filter((lote) => !lotesVinculados.has(lote.erpId))
      .filter((lote) => !campoPropio?.campoErpId || campoPropio.campoErpId === lote.campoErpId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposPropiosPorId, lotePropioParaVincular, lotesErp, lotesVinculados]);
  const lotesErpSugeridosParaVincular = useMemo(() => (
    lotePropioParaVincular
      ? sugerirVinculacion(
        { codigo: lotePropioParaVincular.codigoInterno, nombre: lotePropioParaVincular.nombre },
        lotesErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.nombre,
      )
      : []
  ), [lotePropioParaVincular, lotesErpDisponiblesParaVincular]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const campoFiltrado = filtroCampoClave ? camposParaFiltrarPorClave.get(filtroCampoClave) : undefined;
  const lotesErpFiltrados = filtrarLotesErp(lotesErp, camposErpPorId, empresasPorId, filtroNormalizado, campoFiltrado);
  const lotesPropiosFiltrados = filtrarLotesPropios(lotesPropios, camposPropiosPorId, filtroNormalizado, campoFiltrado);
  const filasLote = construirFilasLotes(lotesPropiosFiltrados, lotesErpFiltrados, camposPropiosPorId, camposErpPorId, lotesVinculados);

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
    setLoteEnEdicion(crearLoteNuevo(sesion.usuario.clienteId || '', campoSugerido.campoAppId || ''));
  }

  function editarLote(lote: LoteApp) {
    setModoFormulario('editar');
    setCampoSeleccionadoClave(`agro:${lote.campoAppId}`);
    setLoteEnEdicion(lote);
  }

  function copiarLote(lote: LoteApp) {
    const ahora = new Date().toISOString();

    setModoFormulario('copiar');
    setCampoSeleccionadoClave(`agro:${lote.campoAppId}`);
    setLoteEnEdicion({
      ...lote,
      id: `lote-app-${Date.now()}`,
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
      id: `lote-app-${Date.now()}`,
      clienteId: sesion.usuario.clienteId || '',
      campoAppId: '',
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

  function abrirVinculacion(lote: LoteApp) {
    const campoPropio = camposPropiosPorId.get(lote.campoAppId);
    const candidatos = sugerirVinculacion(
      { codigo: lote.codigoInterno, nombre: lote.nombre },
      lotesErp
        .filter((loteErp) => !lotesVinculados.has(loteErp.erpId))
        .filter((loteErp) => !campoPropio?.campoErpId || campoPropio.campoErpId === loteErp.campoErpId),
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );

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
    setLoteErpVincularId(candidatos[0].registro.erpId);
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
      const respuesta = await guardarLoteApp(lotePropioParaVincular.id, {
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

  async function abrirArchivosGeograficos(lote: LoteApp) {
    setLoteArchivosGeograficos(lote);
    setArchivoGeograficoSeleccionado(null);
    setArchivosGeograficos([]);
    setGuardando(true);

    try {
      const respuesta = await obtenerArchivosGeograficosLote(lote.id, sesion.token);
      setArchivosGeograficos(respuesta.archivos);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los archivos geograficos.';
      notificar?.({ tipo: 'error', titulo: 'No se cargaron archivos', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  async function subirArchivoGeografico() {
    if (!loteArchivosGeograficos || !archivoGeograficoSeleccionado) {
      return;
    }

    const tipo = obtenerTipoArchivoGeografico(archivoGeograficoSeleccionado);
    const mimeType = obtenerMimeArchivoGeografico(archivoGeograficoSeleccionado);

    if (!tipo) {
      notificar?.({ tipo: 'error', titulo: 'Archivo invalido', mensaje: 'Solo se permiten archivos .kml o .kmz.' });
      return;
    }

    setGuardando(true);

    try {
      const urlSubida = await crearUrlSubidaArchivoGeograficoLote(loteArchivosGeograficos.id, {
        nombreArchivo: archivoGeograficoSeleccionado.name,
        mimeType,
        tamanioBytes: archivoGeograficoSeleccionado.size,
      }, sesion.token);
      const archivoParaSubir = archivoGeograficoSeleccionado.type
        ? archivoGeograficoSeleccionado
        : new File([archivoGeograficoSeleccionado], archivoGeograficoSeleccionado.name, { type: mimeType });

      await subirArchivoAFirmaSupabase(urlSubida.signedUploadUrl, archivoParaSubir);

      const ahora = new Date().toISOString();
      const respuesta = await guardarArchivoGeograficoLote(loteArchivosGeograficos.id, {
        archivo: {
          id: crearIdArchivoGeografico(),
          clienteId: sesion.usuario.clienteId || '',
          loteAppId: loteArchivosGeograficos.id,
          nombreArchivo: archivoGeograficoSeleccionado.name,
          tipo,
          mimeType,
          tamanioBytes: archivoGeograficoSeleccionado.size,
          storageBucket: urlSubida.storageBucket,
          storagePath: urlSubida.storagePath,
          estado: 'pendiente_procesamiento',
          esPrincipal: archivosGeograficos.length === 0,
          createdAt: ahora,
          updatedAt: ahora,
        },
        origen: 'web',
        motivo: 'Vinculacion de archivo geografico KML/KMZ al lote',
      }, sesion.token);

      setArchivosGeograficos((actuales) => [respuesta.archivo, ...actuales]);
      setArchivoGeograficoSeleccionado(null);
      notificar?.({ tipo: 'success', titulo: 'Archivo vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el archivo geografico.';
      notificar?.({ tipo: 'error', titulo: 'No se subio el archivo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  function seleccionarCampo(clave: string) {
    const campo = camposSeleccionablesPorClave.get(clave);

    setCampoSeleccionadoClave(clave);
    setLoteEnEdicion((actual) => actual && {
      ...actual,
      campoAppId: campo?.campoAppId || '',
    });
  }

  async function obtenerCampoAppParaGuardar() {
    const campoSeleccionado = camposSeleccionablesPorClave.get(campoSeleccionadoClave);

    if (!campoSeleccionado) {
      return undefined;
    }

    if (campoSeleccionado.campoAppId) {
      return camposPropiosPorId.get(campoSeleccionado.campoAppId);
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
    const campoPreparado: CampoApp = {
      id: crearIdCampoDesdeErp(campoErp.erpId),
      clienteId: sesion.usuario.clienteId || '',
      empresaErpId: campoErp.empresaErpId,
      campoErpId: campoErp.erpId,
      nombre: campoErp.nombre,
      codigoInterno: normalizarCodigo(campoErp.codigo),
      zonaErpId: campoErp.idZona ? `zona:${campoErp.idZona}` : undefined,
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const respuesta = await guardarCampoApp(campoPreparado.id, {
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

    const lotePreparado: LoteApp = {
      ...loteEnEdicion,
      nombre,
      codigoInterno: loteEnEdicion.codigoInterno ? normalizarCodigo(loteEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const campoParaGuardar = await obtenerCampoAppParaGuardar();

      if (!campoParaGuardar) {
        throw new Error('Selecciona un campo valido para el lote.');
      }

      const respuesta = await guardarLoteApp(lotePreparado.id, {
        lote: {
          ...lotePreparado,
          campoAppId: campoParaGuardar.id,
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

      <Panel
        title="Lotes"
        description={estado}
        actions={(
          <ActionBar align="end">
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
            <Button variant="primary" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoLote}>
              Nuevo lote
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={filasLote}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay lotes para el filtro seleccionado."
          initialPageSize={25}
          columns={[
            { key: 'lote', label: 'Lote', width: 'minmax(190px, 1.35fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'campo', label: 'Campo', width: 'minmax(150px, 1fr)', render: (fila) => fila.campo },
            { key: 'superficie', label: 'Superficie', width: 'minmax(110px, 0.75fr)', render: (fila) => fila.superficie },
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.7fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(190px, 0.85fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton icon="edit" label={`Editar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && editarLote(fila.lotePropio)} />
                    <IconButton icon="copy" label={`Copiar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && copiarLote(fila.lotePropio)} />
                    <IconButton icon="map" label={`Archivos geograficos de ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && abrirArchivosGeograficos(fila.lotePropio)} />
                    {fila.lotePropio?.estadoVinculacion === 'provisorio' && (
                      <IconButton icon="link" label={`Vincular lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && abrirVinculacion(fila.lotePropio)} />
                    )}
                  </div>
                )
                : (
                  <div className="table-icon-actions">
                    <IconButton icon="copy" label={`Copiar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion || !fila.loteErp} onClick={() => fila.loteErp && copiarLoteErp(fila.loteErp)} />
                  </div>
                ),
            },
          ]}
        />
      </Panel>

      {loteEnEdicion && (
        <FormularioLoteModal
          lote={loteEnEdicion}
          modo={modoFormulario}
          camposSeleccionables={camposSeleccionables}
          campoSeleccionadoClave={campoSeleccionadoClave}
          guardando={guardando}
          onClose={() => setLoteEnEdicion(null)}
          onSeleccionarCampo={seleccionarCampo}
          onActualizarLote={(lote) => setLoteEnEdicion(lote)}
          onGuardar={guardarLote}
        />
      )}
      {lotePropioParaVincular && (
        <ModalVincularLote
          lote={lotePropioParaVincular}
          loteErpVincularId={loteErpVincularId}
          sugerencias={lotesErpSugeridosParaVincular}
          camposErpPorId={camposErpPorId}
          guardando={guardando}
          onClose={() => { setLotePropioParaVincular(null); setLoteErpVincularId(''); }}
          onChangeLoteErp={setLoteErpVincularId}
          onConfirmar={confirmarVinculacionLote}
        />
      )}
      {loteArchivosGeograficos && (
        <ModalArchivosGeograficosLote
          lote={loteArchivosGeograficos}
          archivos={archivosGeograficos}
          archivoSeleccionado={archivoGeograficoSeleccionado}
          guardando={guardando}
          onClose={() => { setLoteArchivosGeograficos(null); setArchivoGeograficoSeleccionado(null); }}
          onSeleccionarArchivo={setArchivoGeograficoSeleccionado}
          onSubirArchivo={subirArchivoGeografico}
        />
      )}
    </div>
  );
}
