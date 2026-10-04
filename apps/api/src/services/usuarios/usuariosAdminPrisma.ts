import type {
  AsignacionCampoUsuario,
  GuardarUsuarioAdminRequest,
  GuardarUsuarioAdminResponse,
  RolUsuario,
  UsuarioAdminResumen,
  UsuariosAdminResponse,
} from '@agro/tipos';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma';
import { listarAsignacionesUsuario } from './asignacionCampos';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  normalizarRol,
  validarPasswordTemporal,
  validarUsuarioRequest,
} from './validacionesUsuarios';

export type UsuarioAdminRow = {
  id: string;
  email: string;
  nombre: string | null;
  rol: string;
  clienteId: string | null;
  microsoftId: string | null;
  tienePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MapearUsuarioAdminDeps = {
  listarAsignaciones: (clienteId: string, usuarioId: string) => Promise<AsignacionCampoUsuario[]>;
};

export type GuardarUsuarioAdminDeps = MapearUsuarioAdminDeps & {
  hashPassword: (password: string) => Promise<string>;
  registrarAuditoria: typeof registrarAuditoria;
};

const depsMapeoUsuarioAdmin: MapearUsuarioAdminDeps = {
  listarAsignaciones: listarAsignacionesUsuario,
};

const depsGuardarUsuarioAdmin: GuardarUsuarioAdminDeps = {
  listarAsignaciones: listarAsignacionesUsuario,
  hashPassword: (password) => bcrypt.hash(password, 10),
  registrarAuditoria,
};

export async function mapearUsuarioAdmin(
  usuario: UsuarioAdminRow,
  deps: MapearUsuarioAdminDeps = depsMapeoUsuarioAdmin,
): Promise<UsuarioAdminResumen> {
  const clienteId = usuario.clienteId || '';
  const asignaciones = clienteId ? await deps.listarAsignaciones(clienteId, usuario.id) : [];

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre || undefined,
    rol: normalizarRol(usuario.rol),
    clienteId,
    microsoftId: usuario.microsoftId || undefined,
    tienePassword: usuario.tienePassword,
    camposAsignados: asignaciones.map((asignacion) => asignacion.campoErpId),
    createdAt: usuario.createdAt.toISOString(),
    updatedAt: usuario.updatedAt.toISOString(),
  };
}

export async function obtenerUsuariosAdmin(clienteId: string): Promise<UsuariosAdminResponse> {
  const usuarios = await prisma.$queryRaw<UsuarioAdminRow[]>`
    SELECT "id", "email", "nombre", "rol", "clienteId", "microsoftId", ("password" IS NOT NULL) AS "tienePassword", "createdAt", "updatedAt"
    FROM "Usuario"
    WHERE "clienteId" = ${clienteId}
    ORDER BY "nombre" ASC NULLS LAST, "email" ASC
  `;
  const usuariosMapeados = await Promise.all(usuarios.map((usuario) => mapearUsuarioAdmin(usuario)));

  return { usuarios: usuariosMapeados };
}

export async function guardarUsuarioAdminEnTransaccion(
  tx: Prisma.TransactionClient,
  id: string,
  request: GuardarUsuarioAdminRequest,
  usuario?: UsuarioAuditoria,
  deps: GuardarUsuarioAdminDeps = depsGuardarUsuarioAdmin,
): Promise<GuardarUsuarioAdminResponse> {
  const clienteId = usuario?.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const datos = validarUsuarioRequest(request);

  const existente = await tx.$queryRaw<UsuarioAdminRow[]>`
      SELECT "id", "email", "nombre", "rol", "clienteId", "microsoftId", ("password" IS NOT NULL) AS "tienePassword", "createdAt", "updatedAt"
      FROM "Usuario"
      WHERE "id" = ${id}
      LIMIT 1
    `;

  if (existente[0] && existente[0].clienteId !== clienteId) {
    throw crearErrorValidacion('No se puede modificar un usuario de otro cliente.', 403);
  }

  const emailDuplicado = await tx.$queryRaw<UsuarioAdminRow[]>`
      SELECT "id", "email", "nombre", "rol", "clienteId", "microsoftId", ("password" IS NOT NULL) AS "tienePassword", "createdAt", "updatedAt"
      FROM "Usuario"
      WHERE "email" = ${datos.email} AND "id" <> ${id}
      LIMIT 1
    `;

  if (emailDuplicado[0]) {
    throw crearErrorValidacion('Ya existe un usuario con ese email.', 409);
  }

  const passwordTemporal = validarPasswordTemporal(datos.passwordTemporal);
  const passwordHash = passwordTemporal ? await deps.hashPassword(passwordTemporal) : undefined;
  const guardado = await tx.usuario.upsert({
    where: { id },
    update: {
      email: datos.email,
      nombre: datos.nombre,
      rol: datos.rol,
      ...(passwordHash ? { password: passwordHash } : {}),
    },
    create: {
      id,
      email: datos.email,
      nombre: datos.nombre,
      rol: datos.rol,
      clienteId,
      password: passwordHash,
    },
  });
  const usuarioMapeado = await mapearUsuarioAdmin(
    { ...guardado, tienePassword: Boolean(guardado.password) },
    { listarAsignaciones: deps.listarAsignaciones },
  );

  await deps.registrarAuditoria(tx, {
    clienteId,
    usuario,
    entidad: 'Usuario',
    entidadId: id,
    accion: existente[0] ? 'actualizar' : 'crear',
    origen: 'web',
    motivo: 'Administracion de usuario y rol.',
    valoresAntes: existente[0] ? await mapearUsuarioAdmin(existente[0], { listarAsignaciones: deps.listarAsignaciones }) : undefined,
    valoresDespues: usuarioMapeado,
    metadata: {
      ...(usuario?.email ? { email: usuario.email } : {}),
      passwordTemporalActualizada: Boolean(passwordHash),
    },
  });

  return {
    usuario: usuarioMapeado,
    auditado: true,
    mensaje: existente[0] ? 'Usuario actualizado con auditoria.' : 'Usuario creado con auditoria.',
  };
}

export async function guardarUsuarioAdmin(
  id: string,
  request: GuardarUsuarioAdminRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarUsuarioAdminResponse> {
  return prisma.$transaction((tx) => guardarUsuarioAdminEnTransaccion(tx, id, request, usuario));
}
