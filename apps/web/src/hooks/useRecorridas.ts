import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, LoteApp, RecorridaCampo, SesionUsuario } from '@agro/tipos';
import {
  cerrarRecorridaCampo,
  crearRecorridaCampo,
  obtenerPlanificacionSnapshot,
  obtenerRecorridasCampo,
} from '../services/api';
import {
  crearFormularioRecorridaInicial,
  FormularioRecorrida,
} from '../utils/recorridas/helpersRecorridas';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

export type FiltroEstadoRecorrida = 'todas' | RecorridaCampo['estado'];

export function useRecorridas(sesion: SesionUsuario, notificar?: Notificar) {
  const [recorridas, setRecorridas] = useState<RecorridaCampo[]>([]);
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [formulario, setFormulario] = useState<FormularioRecorrida>(crearFormularioRecorridaInicial());
  const [estado, setEstado] = useState('Cargando recorridas.');
  const [guardando, setGuardando] = useState(false);
  const [cerrandoId, setCerrandoId] = useState<string | null>(null);
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoRecorrida>('todas');
  const [filtroTexto, setFiltroTexto] = useState('');

  async function cargarDatos() {
    try {
      const [respuestaRecorridas, respuestaPlanificacion] = await Promise.all([
        obtenerRecorridasCampo(sesion.token),
        obtenerPlanificacionSnapshot(sesion.token),
      ]);

      setRecorridas(respuestaRecorridas.recorridas);
      setCampos(respuestaPlanificacion.camposApp);
      setLotes(respuestaPlanificacion.lotesApp);
      setFormulario((actual) => (
        actual.campoAppId
          ? actual
          : crearFormularioRecorridaInicial(respuestaPlanificacion.camposApp[0]?.id || '')
      ));
      setEstado('Recorridas cargadas desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las recorridas.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron recorridas', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const puedeCrear = sesion.permisos.includes('recorridas:crear');
  const puedeCerrar = sesion.permisos.includes('recorridas:cerrar');
  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const lotesDelCampo = useMemo(
    () => lotes.filter((lote) => lote.campoAppId === formulario.campoAppId),
    [formulario.campoAppId, lotes],
  );
  const recorridasAbiertas = recorridas.filter((recorrida) => recorrida.estado === 'en_curso' || recorrida.estado === 'borrador').length;
  const recorridasFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLocaleLowerCase('es');

    return recorridas.filter((recorrida) => {
      const campo = camposPorId.get(recorrida.campoAppId);
      const lote = recorrida.loteAppId ? lotesPorId.get(recorrida.loteAppId) : undefined;
      const coincideCampo = !filtroCampoId || recorrida.campoAppId === filtroCampoId;
      const coincideEstado = filtroEstado === 'todas' || recorrida.estado === filtroEstado;
      const coincideTexto = !texto
        || recorrida.titulo.toLocaleLowerCase('es').includes(texto)
        || recorrida.observaciones?.toLocaleLowerCase('es').includes(texto)
        || campo?.nombre.toLocaleLowerCase('es').includes(texto)
        || lote?.nombre.toLocaleLowerCase('es').includes(texto);

      return coincideCampo && coincideEstado && coincideTexto;
    });
  }, [camposPorId, filtroCampoId, filtroEstado, filtroTexto, lotesPorId, recorridas]);

  function actualizarFormulario(cambios: Partial<FormularioRecorrida>) {
    setFormulario((actual) => ({
      ...actual,
      ...cambios,
      loteAppId: Object.prototype.hasOwnProperty.call(cambios, 'campoAppId') ? '' : cambios.loteAppId ?? actual.loteAppId,
    }));
  }

  async function guardarRecorrida() {
    const fechaInicio = formulario.fechaInicio ? `${formulario.fechaInicio}T12:00:00` : '';
    const fechaValida = new Date(fechaInicio);

    if (!formulario.campoAppId || !formulario.titulo.trim()) {
      notificar?.({ tipo: 'error', titulo: 'Datos incompletos', mensaje: 'Selecciona campo e informa un titulo.' });
      return;
    }

    if (Number.isNaN(fechaValida.getTime())) {
      notificar?.({ tipo: 'error', titulo: 'Fecha invalida', mensaje: 'Ingresa una fecha valida.' });
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await crearRecorridaCampo({
        campoAppId: formulario.campoAppId,
        loteAppId: formulario.loteAppId || undefined,
        titulo: formulario.titulo.trim(),
        objetivo: formulario.objetivo,
        estado: 'en_curso',
        fechaInicio: fechaValida.toISOString(),
        observaciones: formulario.observaciones.trim() || undefined,
        origen: 'web',
      }, sesion.token);

      setRecorridas((actual) => [respuesta.recorrida, ...actual]);
      setFormulario(crearFormularioRecorridaInicial(formulario.campoAppId));
      notificar?.({ tipo: 'success', titulo: 'Recorrida creada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la recorrida.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarRecorrida(recorrida: RecorridaCampo) {
    setCerrandoId(recorrida.id);
    try {
      const respuesta = await cerrarRecorridaCampo(recorrida.id, {
        fechaCierre: new Date().toISOString(),
        origen: 'web',
      }, sesion.token);

      setRecorridas((actual) => actual.map((item) => (item.id === recorrida.id ? respuesta.recorrida : item)));
      notificar?.({ tipo: 'success', titulo: 'Recorrida cerrada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cerrar la recorrida.';
      notificar?.({ tipo: 'error', titulo: 'No se cerro', mensaje });
    } finally {
      setCerrandoId(null);
    }
  }

  return {
    recorridas,
    recorridasFiltradas,
    recorridasAbiertas,
    campos,
    lotesDelCampo,
    camposPorId,
    lotesPorId,
    formulario,
    estado,
    guardando,
    cerrandoId,
    filtroCampoId,
    filtroEstado,
    filtroTexto,
    puedeCrear,
    puedeCerrar,
    actualizarFormulario,
    guardarRecorrida,
    cerrarRecorrida,
    setFiltroCampoId,
    setFiltroEstado,
    setFiltroTexto,
  };
}
