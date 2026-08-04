import { Pais } from './pais';
import { Usuario } from './usuario';

export interface Campo {
  id: string;
  nombre: string;
  pais: Pais;
  usuario: Usuario;
}
