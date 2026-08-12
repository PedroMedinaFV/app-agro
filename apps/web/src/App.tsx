import { useEffect, useState } from 'react';
import { ErpSnapshot, obtenerPermisosRol, RolUsuario, SesionUsuario } from '@agro/tipos';
import { loginDemo, obtenerSnapshotErp } from './services/api';

const snapshotFallback: ErpSnapshot = {
  sincronizadoEn: new Date().toISOString(),
  zonas: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:zona:34', idZona: 34, codigo: '00001', nombre: 'ZONA LA PROVIDENCIA', activo: true },
  ],
  campos: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:campo:241', idCampo: 241, idZona: 34, idSubZona: 107, codigo: '00006', nombre: 'LA PROVIDENCIA', paisCodigo: 'AR', sociedad: 'Demo', activo: true, admiteGanaderia: true, codigoSima: 34942, actualizadoEn: new Date().toISOString() },
  ],
  lotes: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:lote:724', idLote: 724, idCampo: 241, campoErpId: 'empresa:mock:campo:241', codigo: 'CL1', nombre: 'CABALLO LOCO 1', areaHectareas: 60, hectareasProductivas: 60, admiteGanaderia: true, admiteLecheria: false, codigoSima: 78998, activo: true, actualizadoEn: new Date().toISOString() },
  ],
  actividades: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:actividad:48', idActividad: 48, codigo: '011', descripcion: 'GIRASOL', activo: true, habilitadoExportacionCrea: true, idEspecie: 33, idTipoActividad: 1, actualizadoEn: new Date().toISOString() },
  ],
  especies: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:especie:33', idEspecie: 33, codigo: '01', nombre: 'GIRASOL', activo: true, codigoAfip: 2, actualizadoEn: new Date().toISOString() },
  ],
  empresas: [
    { erpId: 'empresa:1', idEmpresa: 1, codigo: '001', nombre: 'SOLMAT', activo: true, cuit: '30-70796234-4', razonSocial: 'SOLMAT AGROPECUARIA S.A.', actualizadoEn: new Date().toISOString() },
  ],
};

export function App() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [email, setEmail] = useState('demo@agroapp.local');
  const [password, setPassword] = useState('demo1234');
  const [rol, setRol] = useState<RolUsuario>('admin');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [snapshot, setSnapshot] = useState<ErpSnapshot>(snapshotFallback);
  const [erpEstado, setErpEstado] = useState('Datos ERP locales');

  async function entrarModoDemo() {
    setCargando(true);
    setError('');

    try {
      setSesion(await loginDemo({ email, nombre: 'Usuario Demo', rol }));
    } catch (error) {
      // Fallback intencional: permite seguir validando UI cuando la API todavia no esta levantada.
      setError('API no disponible. Usando sesion demo local.');
      setSesion({
        token: 'demo-local-token',
        usuario: { id: 'demo-local', email, nombre: 'Usuario Demo', rol },
        origen: 'demo',
        permisos: obtenerPermisosRol(rol),
      });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    async function cargarDatosErp() {
      if (!sesion) {
        return;
      }

      try {
        setSnapshot(await obtenerSnapshotErp(sesion.token));
        setErpEstado('Datos ERP desde API mock');
      } catch (error) {
        setSnapshot(snapshotFallback);
        setErpEstado('API ERP no disponible. Usando mock local.');
      }
    }

    cargarDatosErp();
  }, [sesion]);

  const lotes = snapshot.lotes.map((lote) => ({
    ...lote,
    campo: snapshot.campos.find((campo) => campo.erpId === lote.campoErpId),
  }));
  const zonasPorEmpresaYId = new Map(snapshot.zonas.map((zona) => [`${zona.empresaErpId}:${zona.idZona}`, zona]));
  const puedeConfigurarErp = sesion?.permisos.includes('erp:configurar') || false;

  if (!sesion) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Agro App Web</p>
            <h1>Iniciar sesion</h1>
            <p className="intro">Validacion local del MVP para avanzar rapido con pantallas y flujo de datos.</p>
          </div>

          <label>
            Correo
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Contrasena
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          <label>
            Rol demo
            <select value={rol} onChange={(event) => setRol(event.target.value as RolUsuario)}>
              <option value="admin">Admin</option>
              <option value="usuario">Usuario</option>
            </select>
          </label>

          <button className="primary" onClick={entrarModoDemo} disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Entrar en modo demo'}
          </button>

          <button className="secondary" disabled>
            Continuar con Microsoft
          </button>

          {error && <p className="status-warning">{error}</p>}
          <p className="hint">Microsoft queda preparado para conectar cuando tengamos App Registration y backend con DB.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="brand">Agro App</p>
          <p className="user">{sesion.usuario.nombre}</p>
          <p className="user">{sesion.usuario.rol}</p>
        </div>
        <nav>
          <a className="active">Inicio</a>
          <a>Campos</a>
          <a>Lotes</a>
          <a>Siembra</a>
          <a>Cosecha</a>
          <a>Monitoreos</a>
          {puedeConfigurarErp && <a>Config. ERP</a>}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel operativo</p>
            <h1>Resumen de campo</h1>
            <p className="hint">{erpEstado}</p>
          </div>
          <button className="ghost" onClick={() => setSesion(null)}>Cerrar sesion</button>
        </header>

        <section className="metrics">
          <article>
            <span>Campos</span>
            <strong>{snapshot.campos.length}</strong>
          </article>
          <article>
            <span>Lotes activos</span>
            <strong>{snapshot.lotes.filter((lote) => lote.activo).length}</strong>
          </article>
          <article>
            <span>Hectareas</span>
            <strong>{snapshot.lotes.reduce((total, lote) => total + lote.areaHectareas, 0)}</strong>
          </article>
          <article>
            <span>Actividades ERP</span>
            <strong>{snapshot.actividades.length}</strong>
          </article>
          <article>
            <span>Especies</span>
            <strong>{snapshot.especies.length}</strong>
          </article>
          <article>
            <span>Empresas ERP</span>
            <strong>{snapshot.empresas.length}</strong>
          </article>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Lotes</h2>
              <button className="small">Nuevo</button>
            </div>
            <div className="table">
              {lotes.map((lote) => (
                <div className="row" key={lote.erpId}>
                  <div>
                    <strong>{lote.nombre}</strong>
                    <span>{lote.campo?.nombre || lote.campoErpId} - {lote.cultivoNombre || 'Sin cultivo'}</span>
                    {lote.campo?.idZona && <span>{zonasPorEmpresaYId.get(`${lote.empresaErpId}:${lote.campo.idZona}`)?.nombre || `Zona ${lote.campo.idZona}`}</span>}
                    {lote.campo && <span>Campo ERP {lote.campo.codigo} - Ganaderia: {lote.campo.admiteGanaderia ? 'si' : 'no'}</span>}
                  </div>
                  <span>{lote.areaHectareas} ha / prod. {lote.hectareasProductivas ?? lote.areaHectareas} ha</span>
                  <em>{lote.activo ? 'Activo' : 'Inactivo'}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Actividades ERP</h2>
            </div>
            <div className="activity-list">
              {snapshot.actividades.map((actividad) => (
                <article key={actividad.erpId}>
                  <span>{actividad.activo ? 'Activo' : 'Inactivo'}</span>
                  <strong>{actividad.codigo} - {actividad.descripcion}</strong>
                  <p>Tipo {actividad.idTipoActividad ?? '-'} / Especie {snapshot.especies.find((especie) => especie.empresaErpId === actividad.empresaErpId && especie.idEspecie === actividad.idEspecie)?.nombre || actividad.idEspecie || '-'}</p>
                </article>
              ))}
            </div>
          </div>

          {puedeConfigurarErp && (
            <div className="panel admin-panel">
              <div className="panel-header">
                <h2>Configuracion ERP</h2>
                <button className="small">Editar</button>
              </div>
              <div className="admin-grid">
                <span>Permiso</span>
                <strong>erp:configurar</strong>
                <span>Modo actual</span>
                <strong>Mock / fallback</strong>
                <span>Alcance</span>
                <strong>Solo administradores</strong>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
