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
  | 'planificacion:leer'
  | 'planificacion:editar'
  | 'planificacion:aprobar'
  | 'planificacion:cerrar'
  | 'planificacion:configurar'
  | 'padrones-base:gestionar'
  | 'registros:crear'
  | 'registros:sincronizar'
  | 'precipitaciones:crear'
  | 'precipitaciones:leer';

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
    'planificacion:leer',
    'planificacion:editar',
    'planificacion:aprobar',
    'planificacion:cerrar',
    'planificacion:configurar',
    'padrones-base:gestionar',
    'registros:crear',
    'registros:sincronizar',
    'precipitaciones:crear',
    'precipitaciones:leer',
  ],
  usuario: [
    'erp:leer',
    'campos:leer',
    'lotes:leer',
    'actividades:leer',
    'planificacion:leer',
    'planificacion:editar',
    'registros:crear',
    'registros:sincronizar',
    'precipitaciones:crear',
    'precipitaciones:leer',
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

export type UsuarioAdminResumen = {
  id: string;
  email: string;
  nombre?: string;
  rol: RolUsuario;
  clienteId: string;
  microsoftId?: string;
  camposAsignados: string[];
  createdAt: string;
  updatedAt: string;
};

export type UsuariosAdminResponse = {
  usuarios: UsuarioAdminResumen[];
};

export type GuardarUsuarioAdminRequest = {
  email: string;
  nombre?: string;
  rol: RolUsuario;
};

export type GuardarUsuarioAdminResponse = {
  usuario: UsuarioAdminResumen;
  auditado: boolean;
  mensaje: string;
};

export function obtenerPermisosRol(rol: string | undefined): Permiso[] {
  return permisosPorRol[rol === 'admin' ? 'admin' : 'usuario'];
}

export function tienePermiso(rol: string | undefined, permiso: Permiso) {
  return obtenerPermisosRol(rol).includes(permiso);
}
