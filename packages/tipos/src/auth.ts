import { Usuario } from './models/usuario';

export type RolUsuario = 'admin' | 'planificador' | 'operador_campo';

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
  | 'precipitaciones:leer'
  | 'observaciones:crear'
  | 'observaciones:leer'
  | 'auditoria:leer';

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
    'observaciones:crear',
    'observaciones:leer',
    'auditoria:leer',
  ],
  planificador: [
    'erp:leer',
    'campos:leer',
    'lotes:leer',
    'actividades:leer',
    'planificacion:leer',
    'planificacion:editar',
    'planificacion:aprobar',
    'planificacion:cerrar',
    'planificacion:configurar',
    'padrones-base:gestionar',
    'precipitaciones:leer',
    'observaciones:leer',
  ],
  operador_campo: [
    'erp:leer',
    'campos:leer',
    'lotes:leer',
    'actividades:leer',
    'planificacion:leer',
    'registros:crear',
    'registros:sincronizar',
    'precipitaciones:crear',
    'precipitaciones:leer',
    'observaciones:crear',
    'observaciones:leer',
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
  if (rol === 'admin' || rol === 'planificador' || rol === 'operador_campo') {
    return permisosPorRol[rol];
  }

  return permisosPorRol.operador_campo;
}

export function tienePermiso(rol: string | undefined, permiso: Permiso) {
  return obtenerPermisosRol(rol).includes(permiso);
}
