import type {
  ErpInsumo,
  ErpMoneda,
  ErpServicio,
  ErpTipoInsumo,
  ErpTipoServicio,
  ErpUnidadMedida,
  InsumoApp,
  ServicioApp,
} from '@agro/tipos';
import { formatearMoneda } from '../formatters';

export type LaborTabla = {
  id: string;
  nombre: string;
  detalle: string;
  codigo: string;
  tipo: string;
  unidad: string;
  costo: string;
  origen: string;
  estado: string;
  accion: 'editar';
  laborPropia?: ServicioApp;
  servicioErp?: ErpServicio;
};

export type InsumoTabla = {
  id: string;
  nombre: string;
  detalle: string;
  codigo: string;
  tipo: string;
  unidad: string;
  precio: string;
  origen: string;
  accion: 'editar';
  insumoPropio?: InsumoApp;
  insumoErp?: ErpInsumo;
};

export function construirFilasLabores({
  laboresOrdenadas,
  serviciosErp,
  laboresPorServicioErpId,
  tipoServicioPorId,
  unidadesMedida,
  monedaPorId,
  monedaPorDefecto,
}: {
  laboresOrdenadas: ServicioApp[];
  serviciosErp: ErpServicio[];
  laboresPorServicioErpId: Map<string | undefined, ServicioApp>;
  tipoServicioPorId: Map<number, ErpTipoServicio>;
  unidadesMedida: ErpUnidadMedida[];
  monedaPorId: Map<number, ErpMoneda>;
  monedaPorDefecto?: ErpMoneda;
}): LaborTabla[] {
  return [
    ...laboresOrdenadas.filter((labor) => !labor.servicioErpId).map((labor) => ({
      id: labor.id,
      nombre: labor.nombre,
      detalle: labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : 'Provisoria',
      codigo: labor.codigo,
      tipo: labor.idTipoServicio ? tipoServicioPorId.get(labor.idTipoServicio)?.descripcion || `Tipo ${labor.idTipoServicio}` : '-',
      unidad: labor.unidadSugerida,
      costo: labor.costoUnitarioSugerido !== undefined
        ? formatearMoneda(labor.costoUnitarioSugerido, monedaPorId.get(labor.idMoneda || 0)?.codigo || monedaPorDefecto?.codigo || 'USD')
        : 'Sin costo',
      origen: 'Agro App',
      estado: labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : 'Provisoria',
      accion: 'editar' as const,
      laborPropia: labor,
    })),
    ...serviciosErp.map((servicio) => {
      const unidad = unidadesMedida.find((item) => item.idUnidadMedida === servicio.idUnidadMedida);
      const laborPropia = laboresPorServicioErpId.get(servicio.erpId);
      const costo = laborPropia?.costoUnitarioSugerido ?? servicio.precioUnitario;
      const moneda = monedaPorId.get(laborPropia?.idMoneda || servicio.idMoneda || 0)?.codigo || monedaPorDefecto?.codigo || 'USD';

      return {
        id: servicio.erpId,
        nombre: servicio.descripcion,
        detalle: `${laborPropia ? 'Con costo Agro App' : 'Disponible'} ERP`,
        codigo: servicio.codigo,
        tipo: servicio.idTipoServicio ? tipoServicioPorId.get(servicio.idTipoServicio)?.descripcion || `Tipo ${servicio.idTipoServicio}` : '-',
        unidad: unidad?.codigo || String(servicio.idUnidadMedida || '-'),
        costo: costo !== undefined ? formatearMoneda(costo, moneda) : 'Sin costo',
        origen: 'ERP',
        estado: servicio.activo ? 'Activo' : 'Inactivo',
        accion: 'editar' as const,
        laborPropia,
        servicioErp: servicio,
      };
    }),
  ];
}

export function construirFilasInsumos({
  insumosOrdenados,
  insumosErp,
  insumosPropiosPorErpId,
  tipoInsumoPorId,
  unidadesMedida,
  monedaPorId,
  monedaPorDefecto,
}: {
  insumosOrdenados: InsumoApp[];
  insumosErp: ErpInsumo[];
  insumosPropiosPorErpId: Map<string | undefined, InsumoApp>;
  tipoInsumoPorId: Map<number, ErpTipoInsumo>;
  unidadesMedida: ErpUnidadMedida[];
  monedaPorId: Map<number, ErpMoneda>;
  monedaPorDefecto: string;
}): InsumoTabla[] {
  return [
    ...insumosOrdenados.filter((insumo) => !insumo.insumoErpId).map((insumo) => ({
      id: insumo.id,
      nombre: insumo.nombre,
      detalle: insumo.estadoVinculacion === 'vinculado_erp' ? 'Vinculado ERP' : 'Provisorio',
      codigo: insumo.codigoInterno || '-',
      tipo: insumo.idTipoInsumo ? tipoInsumoPorId.get(insumo.idTipoInsumo)?.descripcion || insumo.tipo || `Tipo ${insumo.idTipoInsumo}` : insumo.tipo || '-',
      unidad: insumo.unidad,
      precio: insumo.precioUnitarioEstimado !== undefined ? formatearMoneda(insumo.precioUnitarioEstimado, insumo.moneda || monedaPorDefecto) : 'Sin precio',
      origen: 'Agro App',
      accion: 'editar' as const,
      insumoPropio: insumo,
    })),
    ...insumosErp.map((insumo) => {
      const unidad = unidadesMedida.find((item) => item.idUnidadMedida === insumo.idUnidadMedida);
      const insumoPropio = insumosPropiosPorErpId.get(insumo.erpId);
      const precio = insumoPropio?.precioUnitarioEstimado ?? insumo.precioUnitario;
      const moneda = insumoPropio?.moneda || monedaPorId.get(insumo.idMonedaPrecioUnitario || 0)?.codigo || monedaPorDefecto;

      return {
        id: insumo.erpId,
        nombre: insumo.nombre,
        detalle: `${insumoPropio ? 'Con precio Agro App' : 'Disponible'} ERP`,
        codigo: insumo.codigo,
        tipo: insumo.idTipoInsumo ? tipoInsumoPorId.get(insumo.idTipoInsumo)?.descripcion || `Tipo ${insumo.idTipoInsumo}` : '-',
        unidad: unidad?.codigo || String(insumo.idUnidadMedida || '-'),
        precio: precio !== undefined ? formatearMoneda(precio, moneda) : 'Sin precio',
        origen: 'ERP',
        accion: 'editar' as const,
        insumoPropio,
        insumoErp: insumo,
      };
    }),
  ];
}
