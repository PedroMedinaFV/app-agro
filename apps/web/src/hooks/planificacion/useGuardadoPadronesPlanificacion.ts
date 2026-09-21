import { Dispatch, SetStateAction, useState } from 'react';
import type {
  ConceptoGastoComercial,
  DestinoApp,
  GastosComercialesReferencia,
  InsumoApp,
  PlanificacionSnapshot,
  PrecioReferencia,
  ServicioApp,
  SesionUsuario,
} from '@agro/tipos';
import {
  guardarConceptoGastoComercial,
  guardarDestinoVenta,
  guardarGastoComercialReferencia,
  guardarInsumoApp,
  guardarPrecioReferencia,
  guardarServicioApp,
} from '../../services/api';
import {
  anexarDestinoSiNoExiste,
  limpiarTextoVisible,
  normalizarTexto,
} from '../../utils/planificacion/ayudantesPlanificacion';
import type { NotificarPlanificacion } from './estadoPlanificacion';

type UseGuardadoPadronesPlanificacionParams = {
  sesion: SesionUsuario | null;
  puedeConfigurarPlanificacion: boolean;
  setPlanificacion: Dispatch<SetStateAction<PlanificacionSnapshot>>;
  setPlanificacionEstado: (estado: string) => void;
  notificar?: NotificarPlanificacion;
};

export function useGuardadoPadronesPlanificacion({
  sesion,
  puedeConfigurarPlanificacion,
  setPlanificacion,
  setPlanificacionEstado,
  notificar,
}: UseGuardadoPadronesPlanificacionParams) {
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [guardandoGastos, setGuardandoGastos] = useState(false);
  const [guardandoConceptosGastos, setGuardandoConceptosGastos] = useState(false);
  const [guardandoDestinos, setGuardandoDestinos] = useState(false);
  const [guardandoLabores, setGuardandoLabores] = useState(false);
  const [guardandoInsumos, setGuardandoInsumos] = useState(false);

  async function guardarPrecioReferenciaDesdeModal(precio: PrecioReferencia) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoPrecios(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar precios.');
      }

      const respuesta = await guardarPrecioReferencia(precio.id, {
        precio,
        origen: 'web',
        motivo: 'Alta o edicion de precio de referencia desde modal web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.preciosReferencia.some((item) => item.id === respuesta.precio.id);
        const siguiente = anexarDestinoSiNoExiste(actual, respuesta.precio);

        return {
          ...siguiente,
          preciosReferencia: existe
            ? siguiente.preciosReferencia.map((item) => (item.id === respuesta.precio.id ? respuesta.precio : item))
            : [respuesta.precio, ...siguiente.preciosReferencia],
        };
      });
      setPlanificacionEstado('Precio de referencia guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Precio guardado',
        mensaje: 'El cambio quedo guardado y auditado.',
      });

      return true;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el precio en la base.';
      setPlanificacionEstado(`No se pudo guardar el precio: ${mensaje}`);
      notificar?.({
        tipo: 'error',
        titulo: 'No se guardo el precio',
        mensaje,
      });

      return false;
    } finally {
      setGuardandoPrecios(false);
    }
  }

  async function guardarGastoComercialDesdeModal(gasto: GastosComercialesReferencia) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoGastos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar gastos comerciales.');
      }

      const respuesta = await guardarGastoComercialReferencia(gasto.id, {
        gasto,
        origen: 'web',
        motivo: 'Alta o edicion de gastos comerciales de referencia desde modal web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.gastosComercialesReferencia.some((item) => item.id === respuesta.gasto.id);

        return {
          ...actual,
          gastosComercialesReferencia: existe
            ? actual.gastosComercialesReferencia.map((item) => (item.id === respuesta.gasto.id ? respuesta.gasto : item))
            : [respuesta.gasto, ...actual.gastosComercialesReferencia],
        };
      });
      setPlanificacionEstado('Gastos comerciales guardados con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Gastos guardados',
        mensaje: 'El cambio quedo guardado y auditado.',
      });

      return true;
    } catch (error) {
      const gastoDemo = { ...gasto, updatedAt: new Date().toISOString() };

      setPlanificacion((actual) => {
        const existe = actual.gastosComercialesReferencia.some((item) => item.id === gastoDemo.id);

        return {
          ...actual,
          gastosComercialesReferencia: existe
            ? actual.gastosComercialesReferencia.map((item) => (item.id === gastoDemo.id ? gastoDemo : item))
            : [gastoDemo, ...actual.gastosComercialesReferencia],
        };
      });
      setPlanificacionEstado('API de gastos comerciales no disponible. Gasto guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Gastos guardados en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoGastos(false);
    }
  }

  async function guardarConceptoGastoComercialDesdeModal(concepto: ConceptoGastoComercial) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoConceptosGastos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar conceptos de gastos comerciales.');
      }

      const respuesta = await guardarConceptoGastoComercial(concepto.id, {
        concepto,
        origen: 'web',
        motivo: 'Alta o edicion de concepto de gasto comercial desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.conceptosGastosComerciales.some((item) => item.id === respuesta.concepto.id);

        return {
          ...actual,
          conceptosGastosComerciales: existe
            ? actual.conceptosGastosComerciales.map((item) => (item.id === respuesta.concepto.id ? respuesta.concepto : item))
            : [respuesta.concepto, ...actual.conceptosGastosComerciales],
        };
      });
      setPlanificacionEstado('Concepto de gasto comercial guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Concepto guardado',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const nombre = limpiarTextoVisible(concepto.nombre);
      const conceptoDemo: ConceptoGastoComercial = {
        ...concepto,
        codigo: normalizarTexto(concepto.codigo || nombre),
        nombre,
        nombreNormalizado: normalizarTexto(nombre),
        unidadCalculo: concepto.unidadCalculo || 'Tn',
        descripcion: concepto.descripcion ? limpiarTextoVisible(concepto.descripcion) : undefined,
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const existe = actual.conceptosGastosComerciales.some((item) => item.id === conceptoDemo.id);

        return {
          ...actual,
          conceptosGastosComerciales: existe
            ? actual.conceptosGastosComerciales.map((item) => (item.id === conceptoDemo.id ? conceptoDemo : item))
            : [conceptoDemo, ...actual.conceptosGastosComerciales],
        };
      });
      setPlanificacionEstado('API de conceptos no disponible. Concepto guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Concepto guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoConceptosGastos(false);
    }
  }

  async function guardarDestinoVentaDesdeModal(destino: DestinoApp) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoDestinos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar destinos de venta.');
      }

      const respuesta = await guardarDestinoVenta(destino.id, {
        destino,
        origen: 'web',
        motivo: 'Alta o edicion de destino de venta desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.destinosReferencia.some((item) => item.id === respuesta.destino.id);

        return {
          ...actual,
          destinosReferencia: existe
            ? actual.destinosReferencia.map((item) => (item.id === respuesta.destino.id ? respuesta.destino : item))
            : [respuesta.destino, ...actual.destinosReferencia],
        };
      });
      setPlanificacionEstado('Destino de venta guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Destino guardado',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const destinoVenta = limpiarTextoVisible(destino.destinoVenta);
      const destinoDemo: DestinoApp = {
        ...destino,
        destinoVenta,
        destinoVentaNormalizado: normalizarTexto(destinoVenta),
        descripcion: destino.descripcion ? limpiarTextoVisible(destino.descripcion) : undefined,
        origen: 'app',
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const existe = actual.destinosReferencia.some((item) => item.id === destinoDemo.id);

        return {
          ...actual,
          destinosReferencia: existe
            ? actual.destinosReferencia.map((item) => (item.id === destinoDemo.id ? destinoDemo : item))
            : [destinoDemo, ...actual.destinosReferencia],
        };
      });
      setPlanificacionEstado('API de destinos no disponible. Destino guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Destino guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoDestinos(false);
    }
  }

  async function guardarServicioAppDesdeModal(labor: ServicioApp) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoLabores(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar labores.');
      }

      const respuesta = await guardarServicioApp(labor.id, {
        servicio: labor,
        origen: 'web',
        motivo: 'Alta o edicion de labor desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.serviciosApp.some((item) => item.id === respuesta.servicio.id);

        return {
          ...actual,
          serviciosApp: existe
            ? actual.serviciosApp.map((item) => (item.id === respuesta.servicio.id ? respuesta.servicio : item))
            : [respuesta.servicio, ...actual.serviciosApp],
        };
      });
      setPlanificacionEstado('Labor guardada con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Labor guardada',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const nombre = limpiarTextoVisible(labor.nombre);
      const laborDemo: ServicioApp = {
        ...labor,
        codigo: normalizarTexto(labor.codigo || nombre),
        nombre,
        descripcionAbreviada: labor.descripcionAbreviada ? limpiarTextoVisible(labor.descripcionAbreviada) : undefined,
        unidadSugerida: limpiarTextoVisible(labor.unidadSugerida || 'Ha'),
        estadoVinculacion: labor.estadoVinculacion || 'provisorio',
        origen: labor.origen || 'provisorio',
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const existe = actual.serviciosApp.some((item) => item.id === laborDemo.id);

        return {
          ...actual,
          serviciosApp: existe
            ? actual.serviciosApp.map((item) => (item.id === laborDemo.id ? laborDemo : item))
            : [laborDemo, ...actual.serviciosApp],
        };
      });
      setPlanificacionEstado('API de labores no disponible. Labor guardada en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Labor guardada en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoLabores(false);
    }
  }

  async function guardarInsumoAppDesdeModal(insumo: InsumoApp) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoInsumos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar insumos.');
      }

      const respuesta = await guardarInsumoApp(insumo.id, {
        insumo,
        origen: 'web',
        motivo: 'Alta o edicion de insumo desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const insumosActuales = actual.insumosApp || [];
        const existe = insumosActuales.some((item) => item.id === respuesta.insumo.id);

        return {
          ...actual,
          insumosApp: existe
            ? insumosActuales.map((item) => (item.id === respuesta.insumo.id ? respuesta.insumo : item))
            : [respuesta.insumo, ...insumosActuales],
        };
      });
      setPlanificacionEstado('Insumo guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Insumo guardado',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const nombre = limpiarTextoVisible(insumo.nombre);
      const insumoDemo: InsumoApp = {
        ...insumo,
        nombre,
        codigoInterno: normalizarTexto(insumo.codigoInterno || nombre),
        tipo: insumo.tipo ? limpiarTextoVisible(insumo.tipo) : undefined,
        unidad: limpiarTextoVisible(insumo.unidad || 'Unid'),
        moneda: limpiarTextoVisible(insumo.moneda || 'USD').toUpperCase(),
        estadoVinculacion: insumo.estadoVinculacion || 'provisorio',
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const insumosActuales = actual.insumosApp || [];
        const existe = insumosActuales.some((item) => item.id === insumoDemo.id);

        return {
          ...actual,
          insumosApp: existe
            ? insumosActuales.map((item) => (item.id === insumoDemo.id ? insumoDemo : item))
            : [insumoDemo, ...insumosActuales],
        };
      });
      setPlanificacionEstado('API de insumos no disponible. Insumo guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Insumo guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoInsumos(false);
    }
  }

  return {
    guardandoPrecios,
    guardandoGastos,
    guardandoConceptosGastos,
    guardandoDestinos,
    guardandoLabores,
    guardandoInsumos,
    guardarPrecioReferenciaDesdeModal,
    guardarGastoComercialDesdeModal,
    guardarConceptoGastoComercialDesdeModal,
    guardarDestinoVentaDesdeModal,
    guardarServicioAppDesdeModal,
    guardarInsumoAppDesdeModal,
  };
}
