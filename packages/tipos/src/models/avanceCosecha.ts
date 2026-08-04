export interface AvanceCosecha {
  id: string;
  loteId: string;
  fecha: string;
  tonelaje: number;
  humedad?: number;
  camion?: string;
  notas?: string;
}
