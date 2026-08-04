import { Campo } from './campo';
import { Cultivo } from './cultivo';

export interface Lote {
  id: string;
  nombre: string;
  area: number;
  campo: Campo;
  tipoSemilla: string;
  cultivo: Cultivo;
}
