import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, FichaLoteOperativoResponse, LoteApp, ObservacionCampo, RecorridaCampo, SesionUsuario, SeveridadObservacion } from '@agro/tipos';
import {
  crearObservacion,
  crearUrlLecturaAdjuntoObservacion,
  crearUrlSubidaAdjuntoObservacion,
  obtenerFichaLoteOperativo,
  obtenerObservaciones,
  obtenerPlanificacionSnapshot,
  obtenerRecorridasCampo,
  subirArchivoAFirmaSupabase,
} from '../services/api';
import {
  crearFormularioObservacionInicial,
  FormularioObservacion,
  obtenerSeveridadMaximaObservacion,
} from '../utils/observaciones/helpersObservaciones';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

export type FiltroSeveridadObservacion = SeveridadObservacion | 'todas';

export function useObservaciones(sesion: SesionUsuario, notificar?: Notificar) {
  const [observaciones, setObservaciones] = useState<ObservacionCampo[]>([]);
  const [recorridas, setRecorridas] = useState<RecorridaCampo[]>([]);
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando observaciones.');
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState<FormularioObservacion>(crearFormularioObservacionInicial());
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<FiltroSeveridadObservacion>('todas');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [fichaLote, setFichaLote] = useState<FichaLoteOperativoResponse | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  async function cargarDatos() {
    try {
      const [respuestaObservaciones, respuestaPlanificacion, respuestaRecorridas] = await Promise.all([
        obtenerObservaciones(sesion.token),
        obtenerPlanificacionSnapshot(sesion.token),
        obtenerRecorridasCampo(sesion.token),
      ]);

      setObservaciones(respuestaObservaciones.observaciones);
      setRecorridas(respuestaRecorridas.recorridas);
      setCampos(respuestaPlanificacion.camposApp);
      setLotes(respuestaPlanificacion.lotesApp);
      setFormulario((actual) => (
        actual.campoAppId
          ? actual
          : crearFormularioObservacionInicial(respuestaPlanificacion.camposApp[0]?.id || '')
      ));
      setEstado('Observaciones cargadas desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las observaciones.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron observaciones', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const recorridasPorId = useMemo(() => new Map(recorridas.map((recorrida) => [recorrida.id, recorrida])), [recorridas]);
  const lotesDelCampo = useMemo(
    () => lotes.filter((lote) => lote.campoAppId === formulario.campoAppId),
    [formulario.campoAppId, lotes],
  );
  const recorridasAbiertasCompatibles = useMemo(() => recorridas.filter((recorrida) => {
    const estaAbierta = recorrida.estado === 'en_curso' || recorrida.estado === 'borrador';
    const coincideCampo = recorrida.campoAppId === formulario.campoAppId;
    const coincideLote = !recorrida.loteAppId || recorrida.loteAppId === formulario.loteAppId;

    return estaAbierta && coincideCampo && coincideLote;
  }), [formulario.campoAppId, formulario.loteAppId, recorridas]);
  const lotesFiltro = filtroCampoId ? lotes.filter((lote) => lote.campoAppId === filtroCampoId) : lotes;
  const puedeCrear = sesion.permisos.includes('observaciones:crear');
  const observacionesAltas = observaciones.filter((observacion) => observacion.severidad === 'alta').length;
  const observacionesFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLocaleLowerCase('es');

    return observaciones.filter((observacion) => {
      const campo = camposPorId.get(observacion.campoAppId);
      const lote = observacion.loteAppId ? lotesPorId.get(observacion.loteAppId) : undefined;
      const recorrida = observacion.recorridaId ? recorridasPorId.get(observacion.recorridaId) : undefined;
      const coincideCampo = !filtroCampoId || observacion.campoAppId === filtroCampoId;
      const coincideLote = !filtroLoteId || observacion.loteAppId === filtroLoteId;
      const coincideSeveridad = filtroSeveridad === 'todas' || observacion.severidad === filtroSeveridad;
      const coincideTexto = !texto
        || observacion.titulo.toLocaleLowerCase('es').includes(texto)
        || observacion.descripcion.toLocaleLowerCase('es').includes(texto)
        || campo?.nombre.toLocaleLowerCase('es').includes(texto)
        || lote?.nombre.toLocaleLowerCase('es').includes(texto)
        || recorrida?.titulo.toLocaleLowerCase('es').includes(texto);

      return coincideCampo && coincideLote && coincideSeveridad && coincideTexto;
    });
  }, [camposPorId, filtroCampoId, filtroLoteId, filtroSeveridad, filtroTexto, lotesPorId, observaciones, recorridasPorId]);

  function actualizarFormulario(cambios: Partial<FormularioObservacion>) {
    setFormulario((actual) => ({
      ...actual,
      ...cambios,
      loteAppId: Object.prototype.hasOwnProperty.call(cambios, 'campoAppId') ? '' : cambios.loteAppId ?? actual.loteAppId,
      recorridaId: Object.prototype.hasOwnProperty.call(cambios, 'campoAppId') || Object.prototype.hasOwnProperty.call(cambios, 'loteAppId')
        ? ''
        : cambios.recorridaId ?? actual.recorridaId,
    }));
  }

  async function guardar() {
    const latitud = formulario.latitud.trim() ? Number(formulario.latitud) : undefined;
    const longitud = formulario.longitud.trim() ? Number(formulario.longitud) : undefined;

    if (!formulario.campoAppId || !formulario.titulo.trim() || !formulario.descripcion.trim()) {
      notificar?.({ tipo: 'error', titulo: 'Datos incompletos', mensaje: 'Selecciona campo, titulo y descripcion.' });
      return;
    }

    if ((latitud !== undefined && !Number.isFinite(latitud)) || (longitud !== undefined && !Number.isFinite(longitud))) {
      notificar?.({ tipo: 'error', titulo: 'Coordenadas invalidas', mensaje: 'Latitud y longitud deben ser numericas.' });
      return;
    }

    setGuardando(true);
    try {
      const adjuntoSubido = archivoAdjunto
        ? await crearUrlSubidaAdjuntoObservacion({
          nombreArchivo: archivoAdjunto.name,
          mimeType: archivoAdjunto.type,
          tamanioBytes: archivoAdjunto.size,
        }, sesion.token)
        : null;

      if (archivoAdjunto && adjuntoSubido) {
        await subirArchivoAFirmaSupabase(adjuntoSubido.signedUploadUrl, archivoAdjunto);
      }

      const respuesta = await crearObservacion({
        campoAppId: formulario.campoAppId,
        loteAppId: formulario.loteAppId || undefined,
        recorridaId: formulario.recorridaId || undefined,
        titulo: formulario.titulo,
        descripcion: formulario.descripcion,
        severidad: formulario.severidad,
        latitud,
        longitud,
        fechaEvento: new Date(formulario.fechaEvento).toISOString(),
        origen: 'web',
        adjuntos: archivoAdjunto && adjuntoSubido
          ? [{
            storageBucket: adjuntoSubido.storageBucket,
            storagePath: adjuntoSubido.storagePath,
            nombreArchivo: archivoAdjunto.name,
            mimeType: archivoAdjunto.type,
            tamanioBytes: archivoAdjunto.size,
            estado: 'disponible',
          }]
          : undefined,
      }, sesion.token);

      setObservaciones((actual) => [respuesta.observacion, ...actual]);
      if (formulario.recorridaId) {
        setRecorridas((actual) => actual.map((recorrida) => (
          recorrida.id === formulario.recorridaId
            ? {
              ...recorrida,
              cantidadObservaciones: recorrida.cantidadObservaciones + 1,
              severidadMaxima: obtenerSeveridadMaximaObservacion(recorrida.severidadMaxima, respuesta.observacion.severidad),
              updatedAt: respuesta.observacion.updatedAt,
            }
            : recorrida
        )));
      }
      setFormulario(crearFormularioObservacionInicial(formulario.campoAppId));
      setArchivoAdjunto(null);
      notificar?.({ tipo: 'success', titulo: 'Observacion registrada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la observacion.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  async function abrirAdjunto(adjuntoId: string) {
    try {
      const respuesta = await crearUrlLecturaAdjuntoObservacion(adjuntoId, sesion.token);
      window.open(respuesta.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo abrir el adjunto.';
      notificar?.({ tipo: 'error', titulo: 'No se abrio el adjunto', mensaje });
    }
  }

  async function verFichaLote(loteAppId: string | undefined) {
    if (!loteAppId) {
      notificar?.({ tipo: 'info', titulo: 'Sin lote especifico', mensaje: 'La observacion corresponde al campo completo.' });
      return;
    }

    setCargandoFicha(true);
    try {
      setFichaLote(await obtenerFichaLoteOperativo(loteAppId, sesion.token));
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cargar la ficha del lote.';
      notificar?.({ tipo: 'error', titulo: 'No se cargo la ficha', mensaje });
    } finally {
      setCargandoFicha(false);
    }
  }

  function cambiarFiltroCampo(campoId: string) {
    setFiltroCampoId(campoId);
    setFiltroLoteId('');
  }

  return {
    observaciones,
    observacionesFiltradas,
    observacionesAltas,
    recorridasAbiertasCompatibles,
    campos,
    lotesDelCampo,
    lotesFiltro,
    camposPorId,
    lotesPorId,
    recorridasPorId,
    estado,
    guardando,
    formulario,
    puedeCrear,
    archivoAdjunto,
    fichaLote,
    cargandoFicha,
    filtroCampoId,
    filtroLoteId,
    filtroSeveridad,
    filtroTexto,
    actualizarFormulario,
    guardar,
    abrirAdjunto,
    verFichaLote,
    setArchivoAdjunto,
    setFichaLote,
    cambiarFiltroCampo,
    setFiltroLoteId,
    setFiltroSeveridad,
    setFiltroTexto,
  };
}
