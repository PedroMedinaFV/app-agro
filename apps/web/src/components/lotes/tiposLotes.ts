export type CampoSeleccionable = {
  clave: string;
  campoAppId?: string;
  campoErpId?: string;
  empresaErpId: string;
  codigo?: string;
  nombre: string;
  origen: 'agro' | 'erp';
};
