type SesionConCliente = { clienteId?: string } | undefined;

export function obtenerClienteSesion(usuario: SesionConCliente) {
  if (!usuario?.clienteId) throw Object.assign(new Error('Sesion sin cliente asociado.'), { statusCode: 401 });
  return usuario.clienteId;
}

export function validarClienteSesion(clienteId: string, usuario: SesionConCliente) {
  if (obtenerClienteSesion(usuario) !== clienteId) {
    throw Object.assign(new Error('No tienes permisos para acceder a datos de otro cliente.'), { statusCode: 403 });
  }
}
