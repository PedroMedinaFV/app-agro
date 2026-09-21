import { useEffect, useMemo, useState } from 'react';
import type { ErpCampania, PlanificacionSnapshot, ProtocoloProductivoDetalle } from '@agro/tipos';
import { calcularCostoInsumoProtocolo, calcularCostoLaborProtocolo, calcularCostoProtocoloWeb } from '../../utils/formatters';

type UseEditorProtocoloParams = {
  protocoloInicial: ProtocoloProductivoDetalle;
  planificacion: PlanificacionSnapshot;
};

export function fechaParaInput(fecha?: string) {
  return fecha ? fecha.slice(0, 10) : '';
}

export function useEditorProtocolo({ protocoloInicial, planificacion }: UseEditorProtocoloParams) {
  const [protocolo, setProtocolo] = useState(protocoloInicial);
  const laboresDisponibles = useMemo(() => [...planificacion.serviciosApp]
    .filter((labor) => labor.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [planificacion.serviciosApp]);
  const insumosDisponibles = useMemo(() => [...(planificacion.insumosApp || [])]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [planificacion.insumosApp]);
  const actividadesPorId = useMemo(() => new Map((planificacion.actividadesApp || []).map((actividad) => [actividad.id, actividad])), [planificacion.actividadesApp]);
  const laboresPorId = useMemo(() => new Map(laboresDisponibles.map((labor) => [labor.id, labor])), [laboresDisponibles]);
  const insumosPorId = useMemo(() => new Map(insumosDisponibles.map((insumo) => [insumo.id, insumo])), [insumosDisponibles]);
  const estadiosCompatibles = useMemo(() => [...planificacion.estadiosReferencia]
    .filter((estadio) => estadio.activo && (!estadio.actividadErpId || estadio.actividadErpId === protocolo.actividadErpId))
    .sort((a, b) => a.ordenCronologico - b.ordenCronologico || a.nombre.localeCompare(b.nombre, 'es')), [planificacion.estadiosReferencia, protocolo.actividadErpId]);
  const zonasDisponibles = useMemo(() => [...(planificacion.zonasApp || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [planificacion.zonasApp]);

  useEffect(() => {
    setProtocolo(protocoloInicial);
  }, [protocoloInicial]);

  function actualizarProtocolo(updater: (actual: ProtocoloProductivoDetalle) => ProtocoloProductivoDetalle) {
    setProtocolo((actual) => {
      const actualizado = updater(actual);

      return { ...actualizado, costoEstimadoPorHa: calcularCostoProtocoloWeb(actualizado) };
    });
  }

  function actualizarEtapa(etapaId: string, updates: Partial<ProtocoloProductivoDetalle['etapas'][number]>) {
    actualizarProtocolo((actual) => ({
      ...actual,
      etapas: actual.etapas.map((etapa) => (etapa.id === etapaId ? { ...etapa, ...updates } : etapa)),
    }));
  }

  function agregarEtapaProtocolo() {
    const estadiosUsados = new Set(protocolo.etapas.map((etapa) => etapa.estadioReferenciaId).filter(Boolean));
    const estadio = estadiosCompatibles.find((item) => !estadiosUsados.has(item.id)) || estadiosCompatibles[0];

    if (!estadio) {
      return;
    }

    const etapaId = `etapa-${Date.now()}`;
    actualizarProtocolo((actual) => ({
      ...actual,
      etapas: [
        {
          id: etapaId,
          protocoloId: actual.id,
          estadioReferenciaId: estadio.id,
          estadioCodigo: estadio.codigo,
          orden: estadio.ordenCronologico,
          nombre: estadio.nombre,
          diasDesdeSiembra: actual.tipoFecha === 'relativa_siembra' ? 0 : undefined,
          labores: [],
          insumos: [],
        },
        ...actual.etapas,
      ],
    }));
  }

  function agregarLabor(etapaId: string, servicioAppId?: string) {
    const servicioApp = (servicioAppId ? laboresPorId.get(servicioAppId) : undefined) || laboresDisponibles[0];

    if (!servicioApp) {
      return;
    }

    const cantidadPorHa = 1;
    const costoUnitario = servicioApp.costoUnitarioSugerido || 0;
    const indiceAplicacion = 1;

    actualizarEtapa(etapaId, {
      labores: [
        {
          id: `labor-${Date.now()}`,
          etapaId,
          indiceAplicacion,
          servicioAppId: servicioApp.id,
          nombre: servicioApp.nombre,
          descripcion: servicioApp.descripcionAbreviada,
          unidad: servicioApp.unidadSugerida,
          cantidadPorHa,
          costoUnitario,
          costoPorHa: calcularCostoLaborProtocolo({ cantidadPorHa, costoUnitario, indiceAplicacion } as Parameters<typeof calcularCostoLaborProtocolo>[0]),
        },
        ...(protocolo.etapas.find((etapa) => etapa.id === etapaId)?.labores || []),
      ],
    });
  }

  function eliminarLabor(etapaId: string, laborId: string) {
    actualizarProtocolo((actual) => ({
      ...actual,
      etapas: actual.etapas.map((etapa) => (etapa.id === etapaId ? {
        ...etapa,
        labores: etapa.labores.filter((labor) => labor.id !== laborId),
      } : etapa)),
    }));
  }

  function agregarInsumo(etapaId: string, insumoAppId?: string) {
    const insumoApp = (insumoAppId ? insumosPorId.get(insumoAppId) : undefined) || insumosDisponibles[0];

    if (!insumoApp) {
      return;
    }

    const dosisPorHa = 1;
    const precioUnitarioEstimado = insumoApp.precioUnitarioEstimado || 0;
    const indiceAplicacion = 1;

    actualizarEtapa(etapaId, {
      insumos: [
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
        ...(protocolo.etapas.find((etapa) => etapa.id === etapaId)?.insumos || []),
      ],
    });
  }

  function eliminarInsumo(etapaId: string, insumoId: string) {
    actualizarProtocolo((actual) => ({
      ...actual,
      etapas: actual.etapas.map((etapa) => (etapa.id === etapaId ? {
        ...etapa,
        insumos: etapa.insumos.filter((insumo) => insumo.id !== insumoId),
      } : etapa)),
    }));
  }

  function cambiarCampania(campaniaErpId: ErpCampania['erpId']) {
    actualizarProtocolo((actual) => ({ ...actual, campaniaErpId }));
  }

  function cambiarActividad(actividadAppId: string) {
    const actividad = actividadesPorId.get(actividadAppId);
    actualizarProtocolo((actual) => ({ ...actual, actividadAppId, actividadErpId: actividad?.actividadErpId }));
  }

  function cambiarZona(zonaAppId: string) {
    actualizarProtocolo((actual) => ({ ...actual, zonaAppId: zonaAppId || undefined, campoAppId: undefined }));
  }

  function cambiarCampo(campoAppId: string) {
    actualizarProtocolo((actual) => ({ ...actual, campoAppId: campoAppId || undefined }));
  }

  return {
    protocolo,
    laboresDisponibles,
    insumosDisponibles,
    laboresPorId,
    insumosPorId,
    estadiosCompatibles,
    zonasDisponibles,
    actualizarProtocolo,
    actualizarEtapa,
    agregarEtapaProtocolo,
    agregarLabor,
    eliminarLabor,
    agregarInsumo,
    eliminarInsumo,
    cambiarCampania,
    cambiarActividad,
    cambiarZona,
    cambiarCampo,
  };
}
