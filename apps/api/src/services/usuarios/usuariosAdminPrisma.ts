import type {
  GuardarUsuarioAdminRequest,
  GuardarUsuarioAdminResponse,
  RolUsuario,
  UsuarioAdminResumen,
  UsuariosAdminResponse,
} from '@agro/tipos';
import { prisma } from '../../prisma';
import { listarAsignacionesUsuario } from './asignacionCampos';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type UsuarioAdminRow = {
  id: string;
  email: string;
  nombre: string | null;
  rol: string;
  clienteId: string | null;
  microsoftId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarEmail(email: string) {
  return limpiarTextoVisible(email).toLowerCase();
}

function normalizarRol(rol: string): RolUsuario {
  if (rol === 'admin' || rol === 'planificador' || rol === 'operador_campo') {
    return rol;
  }

  return 'operador_campo';
}

async function mapearUsuario(usuario: UsuarioAdminRow): Promise<UsuarioAdminResumen> {
  const clienteId = usuario.clienteId || '';
  const asignaciones = clienteId ? await listarAsignacionesUsuario(clienteId, usuario.id) : [];

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre || undefined,
    rol: normalizarRol(usuario.rol),
    clienteId,
    microsoftId: usuario.microsoftId || undefined,
    camposAsignados: asignaciones.map((asignacion) => asignacion.campoErpId),
    createdAt: usuario.createdAt.toISOString(),
    updatedAt: usuario.updatedAt.toISOString(),
  };
}

function validarUsuarioRequest(request: GuardarUsuarioAdminRequest) {
  const email = normalizarEmail(request.email);

  if (!email || !email.includes('@')) {
    throw crearErrorValidacion('El usuario debe tener un email valido.');
  }

  return {
    email,
    nombre: request.nombre ? limpiarTextoVisible(request.nombre) : null,
    rol: normalizarRol(request.rol),
  };
}

export async function obtenerUsuariosAdmin(clienteId: string): Promise<UsuariosAdminResponse> {
  const usuarios = await prisma.$queryRaw<UsuarioAdminRow[]>`
    SELECT "id", "email", "nombre", "rol", "clienteId", "microsoftId", "createdAt", "updatedAt"
    FROM "Usuario"
    WHERE "clienteId" = ${clienteId}
    ORDER BY "nombre" ASC NULLS LAST, "email" ASC
  `;
  const usuariosMapeados = await Promise.all(usuarios.map(mapearUsuario));

  return { usuarios: usuariosMapeados };
}

export async function guardarUsuarioAdmin(
  id: string,
  request: GuardarUsuarioAdminRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarUsuarioAdminResponse> {
  const clienteId = usuario?.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const datos = validarUsuarioRequest(request);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.$queryRaw<UsuarioAdminRow[]>`
      SELECT "id", "email", "nombre", "rol", "clienteId", "microsoftId", "createdAt", "updatedAt"
      FROM "Usuario"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    if (existente[0] && existente[0].clienteId !== clienteId) {
      throw crearErrorValidacion('No se puede modificar un usuario de otro cliente.', 403);
    }

    const emailDuplicado = await tx.$queryRaw<UsuarioAdminRow[]>`
      SELECT "id", "email", "nombre", "rol", "clienteId", "microsoftId", "createdAt", "updatedAt"
      FROM "Usuario"
      WHERE "email" = ${datos.email} AND "id" <> ${id}
      LIMIT 1
    `;

    if (emailDuplicado[0]) {
      throw crearErrorValidacion('Ya existe un usuario con ese email.', 409);
    }

    const guardado = await tx.usuario.upsert({
      where: { id },
      update: {
        email: datos.email,
        nombre: datos.nombre,
        rol: datos.rol,
      },
      create: {
        id,
        email: datos.email,
        nombre: datos.nombre,
        rol: datos.rol,
        clienteId,
      },
    });
    const usuarioMapeado = await mapearUsuario(guardado);

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'Usuario',
      entidadId: id,
      accion: existente[0] ? 'actualizar' : 'crear',
      origen: 'web',
      motivo: 'Administracion de usuario y rol.',
      valoresAntes: existente[0] ? await mapearUsuario(existente[0]) : undefined,
      valoresDespues: usuarioMapeado,
      metadata: usuario?.email ? { email: usuario.email } : undefined,
    });

    return {
      usuario: usuarioMapeado,
      auditado: true,
      mensaje: existente[0] ? 'Usuario actualizado con auditoria.' : 'Usuario creado con auditoria.',
    };
  });
}
