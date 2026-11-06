import type { CrearAdjuntoObservacionInput } from '@agro/tipos';

export type PropietarioOffline = { clienteId: string; usuarioId: string };
export type AdjuntoLocalPendiente = {
  uri: string;
  nombreArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  subido?: CrearAdjuntoObservacionInput;
};
export type NuevoRegistroLocal = {
  id: string;
  tipo: string;
  payload: Record<string, unknown>;
  adjuntosLocales?: AdjuntoLocalPendiente[];
  creadoEn: string;
};
export type RegistroLocal = NuevoRegistroLocal & {
  propietario: PropietarioOffline;
  sincronizado: boolean;
};
export interface AlmacenamientoOffline {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
}
