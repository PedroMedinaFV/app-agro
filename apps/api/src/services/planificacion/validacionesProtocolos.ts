import {
  calcularCostoInsumoProtocolo,
  calcularCostoLaborProtocolo,
} from '@agro/tipos';
import type {
  ProtocoloProductivoDetalle,
} from '@agro/tipos';

type ServicioCostoProtocolo = {
  id: string;
  nombre: string;
  descripcionAbreviada?: string | null;
  unidadSugerida: string;
  costoUnitarioSugerido?: number | null;
};

type InsumoCostoProtocolo = {
  id: string;
  insumoErpId?: string | null;
  nombre: string;
  tipo?: string | null;
  unidad: string;
  precioUnitarioEstimado?: number | null;
};

export function crearErrorValidacion(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;

  return error;
}

export function validarFechasProtocolo(protocolo: ProtocoloProductivoDetalle) {
  const etapasSiembra = protocolo.etapas.filter((etapa) => ['siembra', 'siembra directa'].includes(etapa.nombre.trim().toLowerCase()));

  if (protocolo.tipoFecha === 'relativa_siembra') {
    for (const etapa of protocolo.etapas) {
      if (!Number.isInteger(etapa.diasDesdeSiembra)) {
        throw crearErrorValidacion('Las etapas relativas a siembra deben tener diasDesdeSiembra entero. Puede ser negativo.');
      }
    }

    if (etapasSiembra.length && !protocolo.fechaSiembra) {
      throw crearErrorValidacion('La fecha de siembra es obligatoria si el protocolo relativo tiene etapa Siembra o Siembra directa.');
    }

    for (const etapa of etapasSiembra) {
      if (etapa.diasDesdeSiembra !== 0) {
        throw crearErrorValidacion('La etapa Siembra o Siembra directa debe tener diasDesdeSiembra igual a 0.');
      }
    }
  }

  if (protocolo.tipoFecha === 'absoluta') {
    for (const etapa of protocolo.etapas) {
      if (!etapa.fechaObjetivo) {
        throw crearErrorValidacion('Las etapas absolutas deben tener fechaObjetivo.');
      }
    }
  }
}

export function validarItemsProtocolo(protocolo: ProtocoloProductivoDetalle) {
  for (const etapa of protocolo.etapas) {
    if (!etapa.estadioReferenciaId) {
      throw crearErrorValidacion('Cada etapa del protocolo debe tener un estadio.');
    }

    for (const labor of etapa.labores) {
      if (!Number.isFinite(labor.indiceAplicacion) || labor.indiceAplicacion < 0 || labor.indiceAplicacion > 1) {
        throw crearErrorValidacion('El indice de aplicacion de labores debe estar entre 0 y 1.');
      }
    }

    for (const insumo of etapa.insumos) {
      if (!Number.isFinite(insumo.indiceAplicacion) || insumo.indiceAplicacion < 0 || insumo.indiceAplicacion > 1) {
        throw crearErrorValidacion('El indice de aplicacion de insumos debe estar entre 0 y 1.');
      }
    }
  }
}

export function validarProtocolo(protocolo: ProtocoloProductivoDetalle) {
  if (!protocolo.clienteId) {
    throw crearErrorValidacion('El protocolo debe tener clienteId.');
  }

  if (!protocolo.campaniaErpId) {
    throw crearErrorValidacion('El protocolo debe tener campaniaErpId.');
  }

  if (!protocolo.actividadAppId) {
    throw crearErrorValidacion('El protocolo debe tener actividadAppId.');
  }

  validarFechasProtocolo(protocolo);
  validarItemsProtocolo(protocolo);
}

export function aplicarCostosDesdePadrones(
  protocolo: ProtocoloProductivoDetalle,
  serviciosPorId: Map<string, ServicioCostoProtocolo>,
  insumosPorId: Map<string, InsumoCostoProtocolo>,
): ProtocoloProductivoDetalle {
  return {
    ...protocolo,
    etapas: protocolo.etapas.map((etapa) => ({
      ...etapa,
      labores: etapa.labores.map((labor) => {
        const servicio = labor.servicioAppId ? serviciosPorId.get(labor.servicioAppId) : undefined;

        if (!servicio) {
          return { ...labor, costoPorHa: calcularCostoLaborProtocolo(labor) };
        }

        const actualizado = {
          ...labor,
          nombre: servicio.nombre,
          descripcion: servicio.descripcionAbreviada || undefined,
          unidad: servicio.unidadSugerida,
          costoUnitario: servicio.costoUnitarioSugerido ?? 0,
        };

        return { ...actualizado, costoPorHa: calcularCostoLaborProtocolo(actualizado) };
      }),
      insumos: etapa.insumos.map((insumo) => {
        const insumoApp = insumosPorId.get(insumo.insumoAppId);

        if (!insumoApp) {
          return { ...insumo, costoPorHa: calcularCostoInsumoProtocolo(insumo) };
        }

        const actualizado = {
          ...insumo,
          insumoErpId: insumoApp.insumoErpId || undefined,
          nombre: insumoApp.nombre,
          tipo: insumoApp.tipo || undefined,
          unidad: insumoApp.unidad,
          precioUnitarioEstimado: insumoApp.precioUnitarioEstimado ?? 0,
        };

        return { ...actualizado, costoPorHa: calcularCostoInsumoProtocolo(actualizado) };
      }),
    })),
  };
}
