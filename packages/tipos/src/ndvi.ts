export type EstadoMapaNdvi = 'pendiente_procesamiento' | 'procesado' | 'rechazado' | 'archivado';

export type OrigenMapaNdvi = 'manual' | 'proveedor_api' | 'importacion' | 'proceso_interno';

export type LoteMapaNdvi = {
  id: string;
  clienteId: string;
  loteAppId: string;
  loteErpId?: string;
  campoAppId: string;
  campoErpId?: string;
  campaniaErpId?: string;
  fechaImagen: string;
  fechaProcesamiento?: string;
  proveedor: string;
  origen: OrigenMapaNdvi;
  resolucionMetros?: number;
  nubosidadPorcentaje?: number;
  ndviPromedio?: number;
  ndviMinimo?: number;
  ndviMaximo?: number;
  ndviDesvio?: number;
  superficieAnalizadaHa?: number;
  storageBucket?: string;
  storagePathRaster?: string;
  storagePathPreview?: string;
  storagePathTiles?: string;
  bboxGeoJson?: unknown;
  metadata?: unknown;
  estado: EstadoMapaNdvi;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MapasNdviLoteResponse = {
  loteAppId: string;
  ultimo?: LoteMapaNdvi;
  historial: LoteMapaNdvi[];
};
