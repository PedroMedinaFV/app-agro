import { useEffect, useMemo, useState } from 'react';
import type { ErpCampo, ErpZona, RolUsuario, SesionUsuario, UsuarioAdminResumen } from '@agro/tipos';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  guardarCamposUsuarioAdmin,
  guardarUsuarioAdmin,
  obtenerCamposErpImportados,
  obtenerUsuariosAdmin,
  obtenerZonasErpImportadas,
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
    rol: 'operador_campo',
    camposAsignados: [],
  };
}

function obtenerEtiquetaRol(rol: RolUsuario) {
  return rol === 'admin'
    ? 'Admin'
    : rol === 'planificador'
      ? 'Planificador'
      : rol === 'responsable_compras'
        ? 'Responsable de compras'
        : 'Operador de campo';
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
  const [zonas, setZonas] = useState<ErpZona[]>([]);
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
  const zonasPorId = useMemo(() => {
    const mapa = new Map<number, ErpZona>();

    for (const zona of zonas) {
      if (!mapa.has(zona.idZona)) {
        mapa.set(zona.idZona, zona);
      }
    }

    return mapa;
  }, [zonas]);
  const camposPorZona = useMemo(() => {
    const grupos = new Map<string, { idZona?: number; nombre: string; campos: ErpCampo[] }>();

    for (const campo of camposAsignables) {
      const zona = typeof campo.idZona === 'number' ? zonasPorId.get(campo.idZona) : undefined;
      const clave = typeof campo.idZona === 'number' ? `zona:${campo.idZona}` : 'sin-zona';

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          idZona: campo.idZona,
          nombre: zona ? `${zona.codigo} - ${zona.nombre}` : 'Sin zona',
          campos: [],
        });
      }

      grupos.get(clave)?.campos.push(campo);
    }

    return Array.from(grupos.values())
      .map((grupo) => ({
        ...grupo,
        campos: grupo.campos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposAsignables, zonasPorId]);

  async function cargarDatos() {
    try {
      const [respuestaUsuarios, respuestaCampos, respuestaZonas] = await Promise.all([
        obtenerUsuariosAdmin(sesion.token),
        obtenerCamposErpImportados(sesion.token),
        obtenerZonasErpImportadas(sesion.token),
      ]);

      setUsuarios(respuestaUsuarios.usuarios);
      setCampos(respuestaCampos.campos);
      setZonas(respuestaZonas.zonas);
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

  function alternarZona(campoErpIds: string[]) {
    setUsuarioEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      const todosSeleccionados = campoErpIds.every((campoErpId) => actual.camposAsignados.includes(campoErpId));
      const seleccion = new Set(actual.camposAsignados);

      for (const campoErpId of campoErpIds) {
        if (todosSeleccionados) {
          seleccion.delete(campoErpId);
        } else {
          seleccion.add(campoErpId);
        }
      }

      return { ...actual, camposAsignados: Array.from(seleccion) };
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
      const camposAsignados = usuarioEnEdicion.rol === 'operador_campo' ? usuarioEnEdicion.camposAsignados : [];

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
      <PageHeader
        eyebrow="Administracion"
        title="Usuarios"
        description="Alta de usuarios, rol operativo y campos permitidos. El login Microsoft se enlaza por email."
        aside={<div className="status-pill">{usuarios.length}</div>}
      />

      <Panel
        title="Usuarios del cliente"
        description={estado}
        actions={(
          <Button variant="small" disabled={!puedeGestionarUsuarios} onClick={() => setUsuarioEnEdicion(crearUsuarioFormulario())}>
            Nuevo usuario
          </Button>
        )}
      >
        <DataTable
          rows={usuarios}
          getRowKey={(usuario) => usuario.id}
          emptyMessage="Todavia no hay usuarios administrables."
          columns={[
            { key: 'usuario', label: 'Usuario', width: 'minmax(180px, 1.2fr)', render: (usuario) => <strong>{usuario.nombre || usuario.email}</strong> },
            { key: 'email', label: 'Email', width: 'minmax(190px, 1.2fr)', render: (usuario) => usuario.email },
            { key: 'rol', label: 'Rol', width: 'minmax(120px, 0.7fr)', render: (usuario) => <em>{obtenerEtiquetaRol(usuario.rol)}</em> },
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
              render: (usuario) => usuario.rol === 'admin' ? 'Todos' : usuario.rol === 'operador_campo' ? usuario.camposAsignados.length : 'No aplica',
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(90px, 0.5fr)',
              render: (usuario) => (
                <div className="table-icon-actions">
                  <IconButton icon="edit" label={`Editar usuario ${usuario.email}`} disabled={!puedeGestionarUsuarios} onClick={() => setUsuarioEnEdicion(crearFormularioDesdeUsuario(usuario))} />
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {usuarioEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel modal-panel-wide" role="dialog" aria-modal="true" aria-labelledby="usuario-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Administracion</p>
                <h2 id="usuario-modal-title">Usuario</h2>
              </div>
              <Button variant="small" onClick={() => setUsuarioEnEdicion(null)}>Cerrar</Button>
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
                  <option value="admin">Admin</option>
                  <option value="planificador">Planificador</option>
                  <option value="responsable_compras">Responsable de compras</option>
                  <option value="operador_campo">Operador de campo</option>
                </select>
              </label>
            </div>

            {usuarioEnEdicion.rol === 'operador_campo' && (
              <section className="field-picker">
                <div>
                  <h3>Campos asignados</h3>
                  <p className="hint">Solo se muestran campos ERP sincronizados de empresas AGRO. Estos definen el alcance operativo y de seguridad del operador de campo.</p>
                </div>
                <div className="field-zone-list">
                  {camposPorZona.map((grupo) => {
                    const campoErpIds = grupo.campos.map((campo) => campo.erpId);
                    const cantidadSeleccionada = campoErpIds.filter((campoErpId) => usuarioEnEdicion.camposAsignados.includes(campoErpId)).length;
                    const todosSeleccionados = cantidadSeleccionada === campoErpIds.length && campoErpIds.length > 0;

                    return (
                      <section className="field-zone-group" key={grupo.idZona ?? 'sin-zona'}>
                        <label className="field-zone-header">
                          <input
                            type="checkbox"
                            checked={todosSeleccionados}
                            disabled={guardando || !puedeAsignarCampos || campoErpIds.length === 0}
                            onChange={() => alternarZona(campoErpIds)}
                          />
                          <span>
                            <strong>{grupo.nombre}</strong>
                            <small>{cantidadSeleccionada} de {campoErpIds.length} campos seleccionados</small>
                          </span>
                        </label>

                        <div className="field-picker-grid">
                          {grupo.campos.map((campo) => (
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
                    );
                  })}
                </div>
              </section>
            )}

            {usuarioEnEdicion.camposAsignados.length > 0 && (
              <p className="hint">
                Seleccionados: {usuarioEnEdicion.camposAsignados.map((campoErpId) => camposPorErpId.get(campoErpId) || campoErpId).join(', ')}
              </p>
            )}

            <div className="modal-actions">
              <Button variant="small" onClick={() => setUsuarioEnEdicion(null)}>Cancelar</Button>
              <Button variant="primary" disabled={guardando} onClick={guardar}>
                {guardando ? 'Guardando...' : 'Guardar usuario'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
