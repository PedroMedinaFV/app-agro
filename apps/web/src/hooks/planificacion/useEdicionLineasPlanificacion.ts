import type {
  CampoApp,
  GastosComercialesReferencia,
  LoteApp,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PlanificacionSnapshot,
  ProtocoloProductivoResumen,
} from '@agro/tipos';
import {
  calcularGastosComercialesLinea,
  obtenerSuperficieInicialLote,
  recalcularLineaPlanificacion,
} from '../../utils/planificacion/ayudantesPlanificacion';

type ActualizarPlanificacionActiva = (mutador: (actual: PlanificacionAgricola) => PlanificacionAgricola) => void;

type UseEdicionLineasPlanificacionParams = {
  planificacion: PlanificacionSnapshot;
  planificacionActiva: PlanificacionAgricola | undefined;
  lineasPlanificacion: PlanificacionAgricolaLinea[];
  camposAppPorId: Map<string, CampoApp>;
  lotesAppPorId: Map<string, LoteApp>;
  protocolosPorId: Map<string, ProtocoloProductivoResumen>;
  gastosComercialesReferenciaPorId: Map<string, GastosComercialesReferencia>;
  puedeEditarPlanificacion: boolean;
  actualizarPlanificacionActiva: ActualizarPlanificacionActiva;
};

export function useEdicionLineasPlanificacion({
  planificacion,
  planificacionActiva,
  lineasPlanificacion,
  camposAppPorId,
  lotesAppPorId,
  protocolosPorId,
  gastosComercialesReferenciaPorId,
  puedeEditarPlanificacion,
  actualizarPlanificacionActiva,
}: UseEdicionLineasPlanificacionParams) {
  function recalcularLinea(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
    return recalcularLineaPlanificacion(linea, { protocolosPorId, gastosComercialesReferenciaPorId });
  }

  function calcularGastosComerciales(linea: PlanificacionAgricolaLinea, referenciaId?: string) {
    return calcularGastosComercialesLinea(linea, referenciaId ? gastosComercialesReferenciaPorId.get(referenciaId) : undefined);
  }

  function buscarDestinoSugerido(linea: Pick<PlanificacionAgricolaLinea, 'campoAppId' | 'campoErpId'>) {
    return planificacion.destinosReferencia
      .filter((item) => item.activo)
      .sort((a, b) => {
        const pesoA = (a.campoAppId === linea.campoAppId ? 3 : 0) + (a.campoErpId === linea.campoErpId ? 2 : 0);
        const pesoB = (b.campoAppId === linea.campoAppId ? 3 : 0) + (b.campoErpId === linea.campoErpId ? 2 : 0);

        return pesoB - pesoA || a.destinoVenta.localeCompare(b.destinoVenta);
      })[0];
  }

  function buscarPrecioSugerido(actividadAppId: string, destinoVenta: string) {
    if (!destinoVenta) {
      return undefined;
    }

    const actividad = planificacion.actividadesApp?.find((item) => item.id === actividadAppId);

    return planificacion.preciosReferencia.find((item) => (
      item.activo
      && item.destinoVenta === destinoVenta
      && (
        (actividad?.especieAppId && item.especieAppId === actividad.especieAppId)
        || (actividad?.especieErpId && item.especieErpId === actividad.especieErpId)
        || item.actividadAppId === actividadAppId
      )
    ));
  }

  function buscarGastosSugeridos(
    linea: Pick<PlanificacionAgricolaLinea, 'campoAppId' | 'campoErpId' | 'actividadAppId' | 'destinoVenta'>,
    campaniaErpId = planificacionActiva?.campaniaErpId,
  ) {
    const campo = camposAppPorId.get(linea.campoAppId);

    return planificacion.gastosComercialesReferencia
      .filter((item) => (
        item.activo
        && item.campaniaErpId === campaniaErpId
        && item.actividadAppId === linea.actividadAppId
        && Boolean(linea.destinoVenta)
        && item.destinoVenta === linea.destinoVenta
        && (!item.zonaAppId || item.zonaAppId === campo?.zonaAppId)
        && (!item.zonaErpId || item.zonaErpId === campo?.zonaErpId)
      ))
      .sort((a, b) => {
        const pesoA = (
          (a.campoAppId === linea.campoAppId ? 6 : 0)
          + (a.campoErpId === linea.campoErpId ? 4 : 0)
          + (a.zonaAppId === campo?.zonaAppId ? 3 : 0)
          + (a.zonaErpId === campo?.zonaErpId ? 2 : 0)
        );
        const pesoB = (
          (b.campoAppId === linea.campoAppId ? 6 : 0)
          + (b.campoErpId === linea.campoErpId ? 4 : 0)
          + (b.zonaAppId === campo?.zonaAppId ? 3 : 0)
          + (b.zonaErpId === campo?.zonaErpId ? 2 : 0)
        );

        return pesoB - pesoA;
      })[0];
  }

  function obtenerProtocolosCompatibles(linea: Pick<PlanificacionAgricolaLinea, 'actividadAppId' | 'campoAppId' | 'campoErpId'>) {
    const campo = camposAppPorId.get(linea.campoAppId);

    return planificacion.protocolos
      .filter((protocolo) => {
        if (!protocolo.activo || protocolo.actividadAppId !== linea.actividadAppId) {
          return false;
        }

        const coincideCampo = !protocolo.campoAppId || protocolo.campoAppId === linea.campoAppId;
        const coincideZona = !protocolo.zonaAppId || protocolo.zonaAppId === campo?.zonaAppId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  function actualizarLinea(id: string, cambios: Partial<PlanificacionAgricolaLinea>) {
    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      lineas: actual.lineas.map((linea) => {
        if (linea.id !== id) {
          return linea;
        }

        const lineaActualizada = { ...linea, ...cambios };
        const debeRecalcularGastos = Boolean(
          lineaActualizada.gastosComercialesReferenciaId
          && (
            Object.prototype.hasOwnProperty.call(cambios, 'hectareasPlanificadas')
            || Object.prototype.hasOwnProperty.call(cambios, 'rindeEstimado')
          ),
        );

        return recalcularLinea({
          ...lineaActualizada,
          gastosComercialesEstimados: debeRecalcularGastos
            ? calcularGastosComerciales(lineaActualizada, lineaActualizada.gastosComercialesReferenciaId)
            : lineaActualizada.gastosComercialesEstimados,
        });
      }),
    }));
  }

  function actualizarLineas(
    lineaIds: string[],
    obtenerCambios: (linea: PlanificacionAgricolaLinea) => Partial<PlanificacionAgricolaLinea> | undefined,
  ) {
    if (lineaIds.length === 0) {
      return 0;
    }

    const ids = new Set(lineaIds);
    const ahora = new Date().toISOString();
    let aplicadas = 0;

    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      lineas: actual.lineas.map((linea) => {
        if (!ids.has(linea.id)) {
          return linea;
        }

        const cambios = obtenerCambios(linea);

        if (!cambios) {
          return linea;
        }

        aplicadas += 1;

        const lineaActualizada = { ...linea, ...cambios, updatedAt: ahora };
        const debeRecalcularGastos = Boolean(
          lineaActualizada.gastosComercialesReferenciaId
          && (
            Object.prototype.hasOwnProperty.call(cambios, 'hectareasPlanificadas')
            || Object.prototype.hasOwnProperty.call(cambios, 'rindeEstimado')
          ),
        );

        return recalcularLinea({
          ...lineaActualizada,
          gastosComercialesEstimados: debeRecalcularGastos
            ? calcularGastosComerciales(lineaActualizada, lineaActualizada.gastosComercialesReferenciaId)
            : lineaActualizada.gastosComercialesEstimados,
        });
      }),
      updatedAt: ahora,
    }));

    return aplicadas;
  }

  function obtenerActividadDesdeProtocolo(protocoloId?: string) {
    const protocolo = protocoloId ? protocolosPorId.get(protocoloId) : undefined;

    return protocolo
      ? planificacion.actividadesApp?.find((actividad) => actividad.id === protocolo.actividadAppId)
      : undefined;
  }

  function aplicarSugerenciasComerciales(linea: PlanificacionAgricolaLinea, destinoForzado?: string): Partial<PlanificacionAgricolaLinea> {
    const destino = destinoForzado
      ? planificacion.destinosReferencia.find((item) => (
        item.destinoVenta === destinoForzado
        && (!item.actividadAppId || item.actividadAppId === linea.actividadAppId)
      ))
      : buscarDestinoSugerido(linea);
    const destinoVenta = destinoForzado || destino?.destinoVenta || '';
    const precio = buscarPrecioSugerido(linea.actividadAppId, destinoVenta);
    const gastos = buscarGastosSugeridos({ ...linea, destinoVenta });

    return {
      destinoReferenciaId: destino?.id,
      destinoVenta,
      destinoVentaManual: Boolean(destinoForzado && destinoForzado !== destino?.destinoVenta),
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      precioVentaManual: false,
      gastosComercialesReferenciaId: gastos?.id,
      gastosComercialesEstimados: gastos ? calcularGastosComerciales({ ...linea, destinoVenta, precioVentaEstimado: precio?.valor || 0 }, gastos.id) : 0,
    };
  }

  function obtenerCambiosProtocolo(linea: PlanificacionAgricolaLinea, protocoloId?: string): Partial<PlanificacionAgricolaLinea> {
    if (!protocoloId) {
      return {
        protocoloId: undefined,
        precioReferenciaId: undefined,
        precioVentaEstimado: 0,
        precioVentaManual: false,
        gastosComercialesReferenciaId: undefined,
        gastosComercialesEstimados: 0,
        costoProduccionEstimado: 0,
        margenBrutoEstimado: 0,
        margenBrutoActualizado: 0,
      };
    }

    const actividad = obtenerActividadDesdeProtocolo(protocoloId);
    const base = {
      ...linea,
      protocoloId,
      actividadAppId: actividad?.id || linea.actividadAppId,
      actividadErpId: actividad?.actividadErpId || linea.actividadErpId,
    };

    return {
      ...base,
      ...aplicarSugerenciasComerciales(base, base.destinoVenta || undefined),
    };
  }

  function obtenerCambiosDestino(linea: PlanificacionAgricolaLinea, destinoVenta: string): Partial<PlanificacionAgricolaLinea> {
    if (!linea.protocoloId) {
      return {
        destinoReferenciaId: undefined,
        destinoVenta,
        destinoVentaManual: true,
        precioReferenciaId: undefined,
        precioVentaEstimado: 0,
        precioVentaManual: false,
        gastosComercialesReferenciaId: undefined,
        gastosComercialesEstimados: 0,
      };
    }

    return aplicarSugerenciasComerciales(linea, destinoVenta);
  }

  function crearLineaDesdeLote(
    lote: LoteApp,
    planificacionId: string,
    indice: number,
    campaniaErpId: string,
    snapshotBase = planificacion,
  ): PlanificacionAgricolaLinea | undefined {
    const camposBasePorId = snapshotBase === planificacion
      ? camposAppPorId
      : new Map(snapshotBase.camposApp.map((campo) => [campo.id, campo]));
    const campo = camposBasePorId.get(lote.campoAppId);
    const actividad = snapshotBase.actividadesApp?.[0];
    const ahora = new Date().toISOString();

    if (!campo || !actividad) {
      return undefined;
    }

    const base: PlanificacionAgricolaLinea = {
      id: `linea-planificacion-${planificacionId}-${indice}-${Date.now()}`,
      planificacionId,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      actividadAppId: actividad.id,
      actividadErpId: actividad.actividadErpId,
      destinoReferenciaId: undefined,
      destinoVenta: '',
      destinoVentaManual: false,
      precioReferenciaId: undefined,
      precioVentaEstimado: 0,
      precioVentaManual: false,
      hectareasPlanificadas: obtenerSuperficieInicialLote(lote),
      rindeEstimado: 0,
      gastosComercialesReferenciaId: undefined,
      gastosComercialesEstimados: 0,
      protocoloId: undefined,
      ingresoBrutoEstimado: 0,
      ingresoNetoEstimado: 0,
      costoProduccionEstimado: 0,
      margenBrutoEstimado: 0,
      margenBrutoActualizado: 0,
      estado: 'borrador',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const protocolosCompatibles = snapshotBase.protocolos
      .filter((item) => {
        if (!item.activo || item.actividadAppId !== base.actividadAppId) {
          return false;
        }

        const coincideCampo = !item.campoAppId || item.campoAppId === base.campoAppId;
        const coincideZona = !item.zonaAppId || item.zonaAppId === campo.zonaAppId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    const protocolo = protocolosCompatibles.find((item) => item.campaniaErpId === campaniaErpId) || protocolosCompatibles[0];
    const actividadProtocolo = protocolo
      ? snapshotBase.actividadesApp?.find((item) => item.id === protocolo.actividadAppId)
      : undefined;
    const lineaConProtocolo = {
      ...base,
      protocoloId: protocolo?.id,
      actividadAppId: actividadProtocolo?.id || base.actividadAppId,
      actividadErpId: actividadProtocolo?.actividadErpId || base.actividadErpId,
    };

    if (snapshotBase === planificacion) {
      return recalcularLinea({ ...lineaConProtocolo, ...aplicarSugerenciasComerciales(lineaConProtocolo) });
    }

    const destino = snapshotBase.destinosReferencia
      .filter((item) => item.activo)
      .sort((a, b) => {
        const pesoA = (a.campoAppId === lineaConProtocolo.campoAppId ? 3 : 0) + (a.campoErpId === lineaConProtocolo.campoErpId ? 2 : 0);
        const pesoB = (b.campoAppId === lineaConProtocolo.campoAppId ? 3 : 0) + (b.campoErpId === lineaConProtocolo.campoErpId ? 2 : 0);

        return pesoB - pesoA || a.destinoVenta.localeCompare(b.destinoVenta);
      })[0];
    const destinoVenta = destino?.destinoVenta || '';
    const precio = snapshotBase.preciosReferencia.find((item) => (
      item.activo
      && item.destinoVenta === destinoVenta
      && (
        (actividadProtocolo?.especieAppId && item.especieAppId === actividadProtocolo.especieAppId)
        || (actividadProtocolo?.especieErpId && item.especieErpId === actividadProtocolo.especieErpId)
        || item.actividadAppId === lineaConProtocolo.actividadAppId
      )
    ));
    const gastos = snapshotBase.gastosComercialesReferencia.find((item) => (
      item.activo
      && item.campaniaErpId === campaniaErpId
      && item.actividadAppId === lineaConProtocolo.actividadAppId
      && item.destinoVenta === destinoVenta
      && (!item.zonaAppId || item.zonaAppId === campo.zonaAppId)
      && (!item.zonaErpId || item.zonaErpId === campo.zonaErpId)
    ));
    const lineaConComercial = {
      ...lineaConProtocolo,
      destinoReferenciaId: destino?.id,
      destinoVenta,
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      gastosComercialesReferenciaId: gastos?.id,
      gastosComercialesEstimados: gastos
        ? gastos.items.reduce((total, item) => {
          const produccionEstimadaTn = lineaConProtocolo.hectareasPlanificadas * lineaConProtocolo.rindeEstimado;
          const baseCalculo = item.unidadCalculo === 'Ha' ? lineaConProtocolo.hectareasPlanificadas : produccionEstimadaTn;

          return total + item.valorPorTonelada * baseCalculo;
        }, 0)
        : 0,
    };

    return recalcularLinea(lineaConComercial);
  }

  function cambiarCampo(lineaId: string, campoAppId: string) {
    const campo = camposAppPorId.get(campoAppId);
    const lote = planificacion.lotesApp.find((item) => item.campoAppId === campoAppId);
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!campo || !lote || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: obtenerSuperficieInicialLote(lote),
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarLote(lineaId: string, loteAppId: string) {
    const lote = lotesAppPorId.get(loteAppId);
    const campo = lote ? camposAppPorId.get(lote.campoAppId) : undefined;
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!lote || !campo || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: obtenerSuperficieInicialLote(lote),
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarActividad(lineaId: string, actividadAppId: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);
    if (!linea) {
      return;
    }

    const actividad = planificacion.actividadesApp?.find((item) => item.id === actividadAppId);
    const base = { ...linea, actividadAppId, actividadErpId: actividad?.actividadErpId };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarProtocolo(lineaId: string, protocoloId?: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    actualizarLinea(lineaId, obtenerCambiosProtocolo(linea, protocoloId));
  }

  function cambiarDestino(lineaId: string, destinoVenta: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    actualizarLinea(lineaId, obtenerCambiosDestino(linea, destinoVenta));
  }

  function aplicarProtocoloALineas(lineaIds: string[], protocoloId: string) {
    if (!puedeEditarPlanificacion || !protocoloId) {
      return 0;
    }

    return actualizarLineas(lineaIds, (linea) => obtenerCambiosProtocolo(linea, protocoloId));
  }

  function aplicarDestinoALineas(lineaIds: string[], destinoVenta: string) {
    if (!puedeEditarPlanificacion || !destinoVenta) {
      return 0;
    }

    return actualizarLineas(lineaIds, (linea) => obtenerCambiosDestino(linea, destinoVenta));
  }

  function aplicarRindeALineas(lineaIds: string[], rindeEstimado: number) {
    if (!puedeEditarPlanificacion || !Number.isFinite(rindeEstimado) || rindeEstimado < 0) {
      return 0;
    }

    return actualizarLineas(lineaIds, () => ({ rindeEstimado }));
  }

  function eliminarLineaPlanificacion(lineaId: string) {
    if (!puedeEditarPlanificacion) {
      return;
    }

    actualizarPlanificacionActiva((actual) => ({ ...actual, lineas: actual.lineas.filter((linea) => linea.id !== lineaId) }));
  }

  function eliminarLineasPlanificacion(lineaIds: string[]) {
    if (!puedeEditarPlanificacion || lineaIds.length === 0) {
      return 0;
    }

    const ids = new Set(lineaIds);
    const eliminadas = lineasPlanificacion.filter((linea) => ids.has(linea.id)).length;

    actualizarPlanificacionActiva((actual) => {
      const lineas = actual.lineas.filter((linea) => !ids.has(linea.id));

      return { ...actual, lineas, updatedAt: new Date().toISOString() };
    });

    return eliminadas;
  }

  function agregarLotesAEscenario(loteAppIds: string[]) {
    if (!planificacionActiva || !puedeEditarPlanificacion || loteAppIds.length === 0) {
      return 0;
    }

    const idsSolicitados = new Set(loteAppIds);
    const lotesYaIncluidosActuales = new Set(planificacionActiva.lineas.map((linea) => linea.loteAppId));
    const lotesParaAgregar = planificacion.lotesApp.filter((lote) => idsSolicitados.has(lote.id) && !lotesYaIncluidosActuales.has(lote.id));

    actualizarPlanificacionActiva((actual) => {
      const lotesYaIncluidos = new Set(actual.lineas.map((linea) => linea.loteAppId));
      const nuevasLineas = lotesParaAgregar
        .filter((lote) => !lotesYaIncluidos.has(lote.id))
        .map((lote, indice) => crearLineaDesdeLote(lote, actual.id, actual.lineas.length + indice, actual.campaniaErpId))
        .filter((linea): linea is PlanificacionAgricolaLinea => Boolean(linea));

      if (!nuevasLineas.length) {
        return actual;
      }

      return {
        ...actual,
        lineas: [...actual.lineas, ...nuevasLineas],
        updatedAt: new Date().toISOString(),
      };
    });

    return lotesParaAgregar.length;
  }

  function copiarLineaPlanificacion(lineaId: string) {
    if (!puedeEditarPlanificacion) {
      return;
    }

    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    const ahora = new Date().toISOString();
    const copia = recalcularLinea({
      ...linea,
      id: `linea-planificacion-copia-${Date.now()}`,
      createdAt: ahora,
      updatedAt: ahora,
    });

    actualizarPlanificacionActiva((actual) => {
      const indice = actual.lineas.findIndex((item) => item.id === lineaId);
      const lineas = [...actual.lineas];
      lineas.splice(indice + 1, 0, copia);

      return { ...actual, lineas, updatedAt: ahora };
    });
  }

  return {
    actualizarLinea,
    cambiarCampo,
    cambiarLote,
    cambiarActividad,
    cambiarProtocolo,
    cambiarDestino,
    aplicarProtocoloALineas,
    aplicarDestinoALineas,
    aplicarRindeALineas,
    agregarLotesAEscenario,
    copiarLineaPlanificacion,
    eliminarLineaPlanificacion,
    eliminarLineasPlanificacion,
    obtenerProtocolosCompatibles,
    crearLineaDesdeLote,
  };
}
