import { useEffect, useMemo, useState } from 'react';
import type { ErpCampo, RolUsuario, SesionUsuario, UsuarioAdminResumen } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import {
  guardarCamposUsuarioAdmin,
  guardarUsuarioAdmin,
  obtenerCamposErpImportados,
  obtenerUsuariosAdmin,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type UsuariosAdminScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

type UsuarioFormulario = {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  camposAsignados: string[];
};

function crearUsuarioFormulario(): UsuarioFormulario {
  return {
    id: `usuario-${Date.now()}`,
    email: '',
    nombre: '',
    rol: 'usuario',
    camposAsignados: [],
  };
}

function crearFormularioDesdeUsuario(usuario: UsuarioAdminResumen): UsuarioFormulario {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre || '',
    rol: usuario.rol,
    camposAsignados: usuario.camposAsignados,
  };
}

export function UsuariosAdminScreen({ sesion, notificar }: UsuariosAdminScreenProps) {
  const [usuarios, setUsuarios] = useState<UsuarioAdminResumen[]>([]);
  const [campos, setCampos] = useState<ErpCampo[]>([]);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<UsuarioFormulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState('Cargando usuarios.');
  const puedeGestionarUsuarios = sesion.permisos.includes('usuarios:gestionar');
  const puedeAsignarCampos = sesion.permisos.includes('usuarios:asignar-campos');
  const camposAsignables = useMemo(
    () => campos.filter((campo) => campo.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [campos],
  );
  const camposPorErpId = useMemo(
    () => new Map(camposAsignables.map((campo) => [campo.erpId, campo.nombre])),
    [camposAsignables],
  );

  async function cargarDatos() {
    try {
      const [respuestaUsuarios, respuestaCampos] = await Promise.all([
        obtenerUsuariosAdmin(sesion.token),
        obtenerCamposErpImportados(sesion.token),
      ]);

      setUsuarios(respuestaUsuarios.usuarios);
      setCampos(respuestaCampos.campos);
      setEstado('Usuarios cargados desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar usuarios.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron usuarios', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  function actualizarFormulario(cambios: Partial<UsuarioFormulario>) {
    setUsuarioEnEdicion((actual) => actual ? { ...actual, ...cambios } : actual);
  }

  function alternarCampo(campoErpId: string) {
    setUsuarioEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      const camposAsignados = actual.camposAsignados.includes(campoErpId)
        ? actual.camposAsignados.filter((id) => id !== campoErpId)
        : [...actual.camposAsignados, campoErpId];

      return { ...actual, camposAsignados };
    });
  }

  async function guardar() {
    if (!usuarioEnEdicion) {
      return;
    }

    if (!usuarioEnEdicion.email.trim()) {
      notificar?.({ tipo: 'error', titulo: 'Email requerido', mensaje: 'El usuario debe tener email para poder enlazarse con Microsoft.' });
      return;
    }

    setGuardando(true);
    try {
      const respuestaUsuario = await guardarUsuarioAdmin(usuarioEnEdicion.id, {
        email: usuarioEnEdicion.email,
        nombre: usuarioEnEdicion.nombre || undefined,
        rol: usuarioEnEdicion.rol,
      }, sesion.token);
      const camposAsignados = usuarioEnEdicion.rol === 'usuario' ? usuarioEnEdicion.camposAsignados : [];

      if (puedeAsignarCampos) {
        await guardarCamposUsuarioAdmin(respuestaUsuario.usuario.clienteId, respuestaUsuario.usuario.id, camposAsignados, sesion.token);
      }

      await cargarDatos();
      setUsuarioEnEdicion(null);
      notificar?.({ tipo: 'success', titulo: 'Usuario guardado', mensaje: 'El rol y los campos asignados quedaron actualizados.' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el usuario.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Usuarios</h2>
          <p className="hint">Alta de usuarios, rol operativo y campos permitidos. El login Microsoft se enlaza por email.</p>
        </div>
        <div className="status-pill">{usuarios.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Usuarios del cliente</h2>
            <p className="hint">{estado}</p>
          </div>
          <button className="small" type="button" disabled={!puedeGestionarUsuarios} onClick={() => setUsuarioEnEdicion(crearUsuarioFormulario())}>
            Nuevo usuario
          </button>
        </div>

        <DataTable
          rows={usuarios}
          getRowKey={(usuario) => usuario.id}
          emptyMessage="Todavia no hay usuarios administrables."
          columns={[
            { key: 'usuario', label: 'Usuario', width: 'minmax(180px, 1.2fr)', render: (usuario) => <strong>{usuario.nombre || usuario.email}</strong> },
            { key: 'email', label: 'Email', width: 'minmax(190px, 1.2fr)', render: (usuario) => usuario.email },
            { key: 'rol', label: 'Rol', width: 'minmax(90px, 0.5fr)', render: (usuario) => <em>{usuario.rol}</em> },
            {
              key: 'microsoft',
              label: 'Microsoft',
              width: 'minmax(100px, 0.6fr)',
              render: (usuario) => usuario.microsoftId ? 'Enlazado' : 'Pendiente',
            },
            {
              key: 'campos',
              label: 'Campos',
              width: 'minmax(110px, 0.6fr)',
              render: (usuario) => usuario.rol === 'admin' ? 'Todos' : usuario.camposAsignados.length,
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(90px, 0.5fr)',
              render: (usuario) => (
                <button className="small" type="button" disabled={!puedeGestionarUsuarios} onClick={() => setUsuarioEnEdicion(crearFormularioDesdeUsuario(usuario))}>
                  Editar
                </button>
              ),
            },
          ]}
        />
      </section>

      {usuarioEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel modal-panel-wide" role="dialog" aria-modal="true" aria-labelledby="usuario-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Administracion</p>
                <h2 id="usuario-modal-title">Usuario</h2>
              </div>
              <button className="small" type="button" onClick={() => setUsuarioEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Email
                <input
                  value={usuarioEnEdicion.email}
                  placeholder="usuario@empresa.com"
                  disabled={guardando}
                  onChange={(event) => actualizarFormulario({ email: event.target.value })}
                />
              </label>

              <label>
                Nombre
                <input
                  value={usuarioEnEdicion.nombre}
                  placeholder="Nombre visible"
                  disabled={guardando}
                  onChange={(event) => actualizarFormulario({ nombre: event.target.value })}
                />
              </label>

              <label>
                Rol
                <select
                  value={usuarioEnEdicion.rol}
                  disabled={guardando}
                  onChange={(event) => actualizarFormulario({ rol: event.target.value as RolUsuario })}
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>

            {usuarioEnEdicion.rol === 'usuario' && (
              <section className="field-picker">
                <div>
                  <h3>Campos asignados</h3>
                  <p className="hint">Solo se muestran campos ERP sincronizados de empresas AGRO. Estos definen el alcance operativo y de seguridad del usuario comun.</p>
                </div>
                <div className="field-picker-grid">
                  {camposAsignables.map((campo) => (
                    <label key={campo.erpId} className="field-picker-item">
                      <input
                        type="checkbox"
                        checked={usuarioEnEdicion.camposAsignados.includes(campo.erpId)}
                        disabled={guardando || !puedeAsignarCampos}
                        onChange={() => alternarCampo(campo.erpId)}
                      />
                      <span>
                        <strong>{campo.nombre}</strong>
                        <small>{campo.codigo || campo.erpId}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {usuarioEnEdicion.camposAsignados.length > 0 && (
              <p className="hint">
                Seleccionados: {usuarioEnEdicion.camposAsignados.map((campoErpId) => camposPorErpId.get(campoErpId) || campoErpId).join(', ')}
              </p>
            )}

            <div className="modal-actions">
              <button className="small" type="button" onClick={() => setUsuarioEnEdicion(null)}>Cancelar</button>
              <button className="primary" type="button" disabled={guardando} onClick={guardar}>
                {guardando ? 'Guardando...' : 'Guardar usuario'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
