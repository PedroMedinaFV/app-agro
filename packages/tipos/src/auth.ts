import { Usuario } from './models/usuario';

export type RolUsuario = 'admin' | 'usuario';

export type Permiso =
  | 'erp:configurar'
  | 'erp:sincronizar'
  | 'erp:leer'
  | 'usuarios:gestionar'
  | 'usuarios:asignar-campos'
  | 'campos:leer'
  | 'lotes:leer'
  | 'actividades:leer'
  | 'registros:crear'
  | 'registros:sincronizar';

export const permisosPorRol: Record<RolUsuario, Permiso[]> = {
  admin: [
    'erp:configurar',
    'erp:sincronizar',
    'erp:leer',
    'usuarios:gestionar',
    'usuarios:asignar-campos',
    'campos:leer',
    'lotes:leer',
    'actividades:leer',
    'registros:crear',
    'registros:sincronizar',
  ],
  usuario: [
    'erp:leer',
    'campos:leer',
    'lotes:leer',
    'actividades:leer',
    'registros:crear',
    'registros:sincronizar',
  ],
};

export type SesionUsuario = {
  token: string;
  usuario: Usuario & { rol: RolUsuario; clienteId?: string };
  origen: 'demo' | 'email' | 'microsoft';
  permisos: Permiso[];
};

export type LoginDemoRequest = {
  email?: string;
  nombre?: string;
  rol?: RolUsuario;
  clienteId?: string;
};

export function obtenerPermisosRol(rol: string | undefined): Permiso[] {
  return permisosPorRol[rol === 'admin' ? 'admin' : 'usuario'];
}

export function tienePermiso(rol: string | undefined, permiso: Permiso) {
  return obtenerPermisosRol(rol).includes(permiso);
}
