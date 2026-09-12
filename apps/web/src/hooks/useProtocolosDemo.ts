import { useCallback, useEffect, useState } from 'react';
import {
  ErpSnapshot,
  PlanificacionAgricola,
  PlanificacionSnapshot,
  ProtocoloEtapa,
  ProtocoloProductivoDetalle,
  ProtocolosSnapshot,
  SesionUsuario,
} from '@agro/tipos';
import { guardarProtocolo, obtenerProtocolosSnapshot } from '../services/api';
import { calcularCostoInsumoProtocolo, calcularCostoLaborProtocolo, calcularCostoProtocoloWeb } from '../utils/formatters';

const protocolosVacios: ProtocolosSnapshot = {
  protocolos: [],
  sincronizadoEn: new Date(0).toISOString(),
};

interface UseProtocolosDemoParams {
  sesion: SesionUsuario | null;
  snapshot: ErpSnapshot;
  planificacion: PlanificacionSnapshot;
  planificacionActiva: PlanificacionAgricola | undefined;
  notificar?: (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;
  onProtocolosPersistidos?: () => Promise<void> | void;
  cargarAutomaticamente?: boolean;
}

export function useProtocolosDemo({ sesion, snapshot, planificacion, planificacionActiva, notificar, onProtocolosPersistidos, cargarAutomaticamente = true }: UseProtocolosDemoParams) {
  const [protocolos, setProtocolos] = useState<ProtocolosSnapshot>(protocolosVacios);
  const [protocoloSeleccionadoId, setProtocoloSeleccionadoId] = useState('');
  const [protocolosEstado, setProtocolosEstado] = useState('Protocolos sin cargar');
  const [protocolosCargados, setProtocolosCargados] = useState(false);
  const [cargandoProtocolos, setCargandoProtocolos] = useState(false);
  const [guardandoProtocolo, setGuardandoProtocolo] = useState(false);

  const cargarProtocolos = useCallback(async () => {
    if (!sesion) {
      return;
    }

    setCargandoProtocolos(true);

    try {
      const datos = await obtenerProtocolosSnapshot(sesion.token);
      setProtocolos(datos);
      setProtocolosCargados(true);
      setProtocoloSeleccionadoId((actual) => actual || datos.protocolos[0]?.id || '');
      setProtocolosEstado('Protocolos cargados desde API.');
    } catch (error) {
      setProtocolos(protocolosVacios);
      setProtocolosCargados(true);
      setProtocoloSeleccionadoId('');
      setProtocolosEstado('API de protocolos no disponible.');
    } finally {
      setCargandoProtocolos(false);
    }
  }, [sesion]);

  useEffect(() => {
    if (!sesion) {
      setProtocolos(protocolosVacios);
      setProtocolosCargados(false);
      setProtocolosEstado('Protocolos sin sesion');
      return;
    }

    if (!cargarAutomaticamente || protocolosCargados || cargandoProtocolos) {
      return;
    }

    void cargarProtocolos();
  }, [cargarAutomaticamente, cargarProtocolos, cargandoProtocolos, protocolosCargados, sesion]);

  const asegurarProtocolos = useCallback(async () => {
    if (!protocolosCargados && !cargandoProtocolos) {
      await cargarProtocolos();
    }
  }, [cargarProtocolos, cargandoProtocolos, protocolosCargados]);

  const protocoloSeleccionado = protocolos.protocolos.find((protocolo) => protocolo.id === protocoloSeleccionadoId) || protocolos.protocolos[0];

  function actualizarProtocolos(mutador: (protocolo: ProtocoloProductivoDetalle) => ProtocoloProductivoDetalle) {
    if (!protocoloSeleccionado) {
      return;
    }

    setProtocolos((actual) => ({
      ...actual,
      protocolos: actual.protocolos.map((protocolo) => {
        if (protocolo.id !== protocoloSeleccionado.id) {
          return protocolo;
        }

        const actualizado = mutador(protocolo);
        return { ...actualizado, costoEstimadoPorHa: calcularCostoProtocoloWeb(actualizado) };
      }),
    }));
  }

  function actualizarEtapa(etapaId: string, cambios: Partial<ProtocoloEtapa>) {
    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: protocolo.etapas.map((etapa) => (etapa.id === etapaId ? { ...etapa, ...cambios } : etapa)),
    }));
  }

  function agregarEtapaProtocolo() {
    if (!protocoloSeleccionado) {
      return;
    }

    const estadiosCompatibles = planificacion.estadiosReferencia
      .filter((estadio) => estadio.activo && (!estadio.actividadErpId || estadio.actividadErpId === protocoloSeleccionado.actividadErpId))
      .sort((a, b) => a.ordenCronologico - b.ordenCronologico || a.nombre.localeCompare(b.nombre, 'es'));
    const estadiosUsados = new Set(protocoloSeleccionado.etapas.map((etapa) => etapa.estadioReferenciaId).filter(Boolean));
    const estadio = estadiosCompatibles.find((item) => !estadiosUsados.has(item.id)) || estadiosCompatibles[0];

    if (!estadio) {
      notificar?.({
        tipo: 'error',
        titulo: 'No hay estadios disponibles',
        mensaje: 'Primero debe existir un maestro de estadios para agregar etapas al protocolo.',
      });
      return;
    }

    const etapaId = `etapa-${Date.now()}`;
    const etapaRelativa = protocoloSeleccionado.tipoFecha === 'relativa_siembra';
    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: [
        ...protocolo.etapas,
        {
          id: etapaId,
          protocoloId: protocolo.id,
          estadioReferenciaId: estadio.id,
          estadioCodigo: estadio.codigo,
          orden: estadio.ordenCronologico,
          nombre: estadio.nombre,
          diasDesdeSiembra: etapaRelativa ? 0 : undefined,
          labores: [],
          insumos: [],
        },
      ],
    }));
  }

  function agregarLabor(etapaId: string, servicioAppId?: string) {
    const ServicioApp = planificacion.serviciosApp.find((labor) => labor.id === servicioAppId)
      || planificacion.serviciosApp.find((labor) => labor.activo);

    if (!ServicioApp) {
      notificar?.({
        tipo: 'error',
        titulo: 'No hay labores disponibles',
        mensaje: 'Primero crea o sincroniza una labor desde Padrones > Labores.',
      });
      return;
    }

    const cantidadPorHa = 1;
    const costoUnitario = ServicioApp.costoUnitarioSugerido || 0;
    const indiceAplicacion = 1;

    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: protocolo.etapas.map((etapa) => etapa.id === etapaId ? {
        ...etapa,
        labores: [
          ...etapa.labores,
          {
            id: `labor-${Date.now()}`,
            etapaId,
            indiceAplicacion,
            servicioAppId: ServicioApp.id,
            nombre: ServicioApp.nombre,
            descripcion: ServicioApp.descripcionAbreviada,
            unidad: ServicioApp.unidadSugerida,
            cantidadPorHa,
            costoUnitario,
            costoPorHa: calcularCostoLaborProtocolo({ cantidadPorHa, costoUnitario, indiceAplicacion } as Parameters<typeof calcularCostoLaborProtocolo>[0]),
          },
        ],
      } : etapa),
    }));
  }

  function agregarInsumo(etapaId: string, insumoAppId?: string) {
    const insumosDisponibles = planificacion.insumosApp || [];
    const insumoApp = insumosDisponibles.find((insumo) => insumo.id === insumoAppId)
      || insumosDisponibles[0];

    if (!insumoApp) {
      notificar?.({
        tipo: 'error',
        titulo: 'No hay insumos disponibles',
        mensaje: 'Primero crea o sincroniza insumos para poder agregarlos al protocolo.',
      });
      return;
    }

    const dosisPorHa = 1;
    const precioUnitarioEstimado = insumoApp.precioUnitarioEstimado || 0;
    const indiceAplicacion = 1;

    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: protocolo.etapas.map((etapa) => etapa.id === etapaId ? {
        ...etapa,
        insumos: [
          ...etapa.insumos,
          {
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
          },
        ],
      } : etapa),
    }));
  }

  function crearProtocoloVacio() {
    if (!sesion) {
      return;
    }

    const ahora = new Date().toISOString();
    const id = `protocolo-nuevo-${Date.now()}`;
    const actividadBase = planificacion.actividadesApp?.[0];
    const protocoloNuevo: ProtocoloProductivoDetalle = {
      id,
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      nombre: 'Nuevo protocolo',
      descripcion: 'Protocolo en borrador',
      campaniaErpId: planificacionActiva?.campaniaErpId || snapshot.campanias[0]?.erpId || 'campania-pendiente',
      actividadAppId: actividadBase?.id || 'actividad-pendiente',
      actividadErpId: actividadBase?.actividadErpId,
      tipoFecha: 'relativa_siembra',
      fechaSiembra: '',
      costoEstimadoPorHa: 0,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
      etapas: [],
    };

    setProtocolos((actual) => ({
      ...actual,
      protocolos: [protocoloNuevo, ...actual.protocolos],
    }));
    setProtocoloSeleccionadoId(id);
    setProtocolosEstado('Protocolo nuevo creado en memoria demo. Guardalo para persistir el borrador.');
    notificar?.({
      tipo: 'info',
      titulo: 'Protocolo creado',
      mensaje: 'Se creo un borrador local. Guardalo para persistirlo.',
    });
  }

  function copiarProtocoloSeleccionado(protocoloOrigen = protocoloSeleccionado) {
    if (!protocoloOrigen) {
      return;
    }

    const ahora = new Date().toISOString();
    const id = `protocolo-copia-${Date.now()}`;
    const protocoloCopiado: ProtocoloProductivoDetalle = {
      ...protocoloOrigen,
      id,
      nombre: `${protocoloOrigen.nombre} - copia`,
      protocoloOrigenId: protocoloOrigen.id,
      createdAt: ahora,
      updatedAt: ahora,
      etapas: protocoloOrigen.etapas.map((etapa, etapaIndice) => {
        const etapaId = `${id}-etapa-${etapaIndice + 1}`;

        return {
          ...etapa,
          id: etapaId,
          protocoloId: id,
          labores: etapa.labores.map((labor, laborIndice) => ({
            ...labor,
            id: `${etapaId}-labor-${laborIndice + 1}`,
            etapaId,
          })),
          insumos: etapa.insumos.map((insumo, insumoIndice) => ({
            ...insumo,
            id: `${etapaId}-insumo-${insumoIndice + 1}`,
            etapaId,
          })),
        };
      }),
    };

    setProtocolos((actual) => ({
      ...actual,
      protocolos: [protocoloCopiado, ...actual.protocolos],
    }));
    setProtocoloSeleccionadoId(id);
    setProtocolosEstado('Copia creada en memoria demo. Editala y guardala como protocolo independiente.');
    notificar?.({
      tipo: 'success',
      titulo: 'Protocolo copiado',
      mensaje: 'La copia quedo lista para editar y guardar como registro independiente.',
    });
  }

  async function guardarProtocoloSeleccionado(protocoloEditado = protocoloSeleccionado) {
    if (!sesion || !protocoloEditado) {
      return;
    }

    setGuardandoProtocolo(true);

    try {
      const protocoloParaGuardar: ProtocoloProductivoDetalle = {
        ...protocoloEditado,
        etapas: protocoloEditado.etapas.map((etapa) => ({
          ...etapa,
          diasDesdeSiembra: protocoloEditado.tipoFecha === 'relativa_siembra'
            ? Math.trunc(Number.isFinite(etapa.diasDesdeSiembra) ? etapa.diasDesdeSiembra as number : 0)
            : undefined,
          fechaObjetivo: protocoloEditado.tipoFecha === 'absoluta' ? etapa.fechaObjetivo : undefined,
        })),
      };
      const respuesta = await guardarProtocolo(protocoloEditado.id, {
        protocolo: protocoloParaGuardar,
        origen: 'web',
        motivo: 'Guardado de protocolo desde demo web',
      }, sesion.token);
      const protocolosPersistidos = await obtenerProtocolosSnapshot(sesion.token, { forzar: true });

      setProtocolos((actual) => ({
        ...protocolosPersistidos,
        protocolos: protocolosPersistidos.protocolos.length
          ? protocolosPersistidos.protocolos
          : actual.protocolos.map((protocolo) => protocolo.id === respuesta.protocolo.id ? respuesta.protocolo : protocolo),
      }));
      setProtocoloSeleccionadoId(respuesta.protocolo.id);
      setProtocolosEstado(respuesta.mensaje);
      await onProtocolosPersistidos?.();
      notificar?.({
        tipo: 'success',
        titulo: 'Protocolo guardado',
        mensaje: respuesta.auditado ? 'Los cambios fueron persistidos con auditoria.' : respuesta.mensaje,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Protocolo guardado localmente. API/DB no disponible para persistir.';
      setProtocolosEstado(mensaje);
      notificar?.({
        tipo: 'error',
        titulo: 'No se pudo guardar',
        mensaje,
      });
    } finally {
      setGuardandoProtocolo(false);
    }
  }

  return {
    protocolos,
    protocolosEstado,
    protocolosCargados,
    cargandoProtocolos,
    guardandoProtocolo,
    protocoloSeleccionadoId,
    protocoloSeleccionado,
    setProtocoloSeleccionadoId,
    actualizarProtocolos,
    actualizarEtapa,
    agregarEtapaProtocolo,
    agregarLabor,
    agregarInsumo,
    crearProtocoloVacio,
    copiarProtocoloSeleccionado,
    guardarProtocoloSeleccionado,
    asegurarProtocolos,
  };
}
