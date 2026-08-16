import { useEffect, useState } from 'react';
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
import { protocolosFallback } from '../data/demoData';
import { calcularCostoInsumoProtocolo, calcularCostoLaborProtocolo, calcularCostoProtocoloWeb } from '../utils/formatters';

interface UseProtocolosDemoParams {
  sesion: SesionUsuario | null;
  snapshot: ErpSnapshot;
  planificacion: PlanificacionSnapshot;
  planificacionActiva: PlanificacionAgricola | undefined;
  notificar?: (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;
}

export function useProtocolosDemo({ sesion, snapshot, planificacion, planificacionActiva, notificar }: UseProtocolosDemoParams) {
  const [protocolos, setProtocolos] = useState<ProtocolosSnapshot>(protocolosFallback);
  const [protocoloSeleccionadoId, setProtocoloSeleccionadoId] = useState(protocolosFallback.protocolos[0]?.id || '');
  const [protocolosEstado, setProtocolosEstado] = useState('Protocolos demo locales');
  const [guardandoProtocolo, setGuardandoProtocolo] = useState(false);

  useEffect(() => {
    async function cargarProtocolos() {
      if (!sesion) {
        return;
      }

      try {
        const datos = await obtenerProtocolosSnapshot(sesion.token);
        setProtocolos(datos);
        setProtocoloSeleccionadoId((actual) => actual || datos.protocolos[0]?.id || '');
        setProtocolosEstado('Protocolos desde API mock');
      } catch (error) {
        setProtocolos(protocolosFallback);
        setProtocoloSeleccionadoId((actual) => actual || protocolosFallback.protocolos[0]?.id || '');
        setProtocolosEstado('API de protocolos no disponible. Usando mock local.');
      }
    }

    cargarProtocolos();
  }, [sesion]);

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
          labores: [],
          insumos: [],
        },
      ],
    }));
  }

  function agregarLabor(etapaId: string, laborReferenciaId?: string) {
    const laborReferencia = planificacion.laboresReferencia.find((labor) => labor.id === laborReferenciaId)
      || planificacion.laboresReferencia.find((labor) => labor.activo);

    if (!laborReferencia) {
      notificar?.({
        tipo: 'error',
        titulo: 'No hay labores disponibles',
        mensaje: 'Primero crea o sincroniza una labor desde Padrones > Labores.',
      });
      return;
    }

    const cantidadPorHa = 1;
    const costoUnitario = laborReferencia.costoUnitarioSugerido || 0;
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
            laborReferenciaId: laborReferencia.id,
            nombre: laborReferencia.nombre,
            descripcion: laborReferencia.descripcionAbreviada,
            unidad: laborReferencia.unidadSugerida,
            cantidadPorHa,
            costoUnitario,
            costoPorHa: calcularCostoLaborProtocolo({ cantidadPorHa, costoUnitario, indiceAplicacion } as Parameters<typeof calcularCostoLaborProtocolo>[0]),
          },
        ],
      } : etapa),
    }));
  }

  function agregarInsumo(etapaId: string, insumoPlanificacionId?: string) {
    const insumosDisponibles = planificacion.insumosPlanificacion || [];
    const insumoPlanificacion = insumosDisponibles.find((insumo) => insumo.id === insumoPlanificacionId)
      || insumosDisponibles[0];

    if (!insumoPlanificacion) {
      notificar?.({
        tipo: 'error',
        titulo: 'No hay insumos disponibles',
        mensaje: 'Primero crea o sincroniza insumos para poder agregarlos al protocolo.',
      });
      return;
    }

    const dosisPorHa = 1;
    const precioUnitarioEstimado = insumoPlanificacion.precioUnitarioEstimado || 0;
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
            insumoPlanificacionId: insumoPlanificacion.id,
            insumoErpId: insumoPlanificacion.insumoErpId,
            nombre: insumoPlanificacion.nombre,
            tipo: insumoPlanificacion.tipo,
            unidad: insumoPlanificacion.unidad,
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
    const actividadBase = planificacion.actividadesPlanificacion?.[0];
    const protocoloNuevo: ProtocoloProductivoDetalle = {
      id,
      clienteId: 'cliente-demo',
      nombre: 'Nuevo protocolo',
      descripcion: 'Protocolo en borrador',
      campaniaErpId: planificacionActiva?.campaniaErpId || snapshot.campanias[0]?.erpId || 'campania-pendiente',
      actividadPlanificacionId: actividadBase?.id || 'actividad-pendiente',
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

  async function guardarProtocoloSeleccionado() {
    if (!sesion || !protocoloSeleccionado) {
      return;
    }

    setGuardandoProtocolo(true);

    try {
      const respuesta = await guardarProtocolo(protocoloSeleccionado.id, {
        protocolo: protocoloSeleccionado,
        origen: 'web',
        motivo: 'Guardado de protocolo desde demo web',
      }, sesion.token);

      setProtocolos((actual) => ({
        ...actual,
        protocolos: actual.protocolos.map((protocolo) => protocolo.id === respuesta.protocolo.id ? respuesta.protocolo : protocolo),
      }));
      setProtocolosEstado(respuesta.mensaje);
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
  };
}
