import { ErpSnapshot, SesionUsuario } from '@agro/tipos';

interface HomeScreenProps {
  snapshot: ErpSnapshot;
  lotes: any[];
  esUsuarioComun: boolean;
  campaniaActual: any;
  empresasOperativas: Set<string>;
  puedeConfigurarErp: boolean;
  zonasPorEmpresaYId: Map<string, any>;
}

export function HomeScreen({
  snapshot,
  esUsuarioComun,
  puedeConfigurarErp,
  campaniaActual,
  lotes,
  zonasPorEmpresaYId,
  empresasOperativas,
}: HomeScreenProps) {
  return (
    <>
      <section className="metrics">
        <article>
          <span>{esUsuarioComun ? 'Mis campos' : 'Campos'}</span>
          <strong>{snapshot.campos.length}</strong>
        </article>
        <article>
          <span>{esUsuarioComun ? 'Mis lotes activos' : 'Lotes activos'}</span>
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
          <span>{esUsuarioComun ? 'Campania actual' : 'Campanias'}</span>
          <strong>{esUsuarioComun ? campaniaActual?.codigo || '-' : snapshot.campanias.length}</strong>
        </article>
        <article>
          <span>Cultivos</span>
          <strong>{snapshot.cultivos.length}</strong>
        </article>
        <article>
          <span>Insumos</span>
          <strong>{snapshot.insumos.length}</strong>
        </article>
        <article>
          <span>{esUsuarioComun ? 'Empresas asignadas' : 'Empresas ERP'}</span>
          <strong>{esUsuarioComun ? empresasOperativas.size : snapshot.empresas.length}</strong>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Lotes</h2>
            <button className="small">{esUsuarioComun ? 'Cargar dato' : 'Nuevo'}</button>
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
            <h2>{esUsuarioComun ? 'Acciones disponibles' : 'Actividades ERP'}</h2>
          </div>
          {esUsuarioComun ? (
            <div className="activity-list">
              <article>
                <span>Permitido</span>
                <strong>Cargar registros de campo</strong>
                <p>Los registros quedaran asociados a tus campos asignados.</p>
              </article>
              <article>
                <span>Proximo</span>
                <strong>Sincronizacion offline</strong>
                <p>Mobile guardara pendientes y backend validara permisos antes de persistir.</p>
              </article>
            </div>
          ) : (
            <div className="activity-list">
              {snapshot.actividades.map((actividad) => (
                <article key={actividad.erpId}>
                  <span>{actividad.activo ? 'Activo' : 'Inactivo'}</span>
                  <strong>{actividad.codigo} - {actividad.descripcion}</strong>
                  <p>
                    Tipo {actividad.idTipoActividad ?? '-'} / Especie{' '}
                    {snapshot.especies.find(
                      (especie) => especie.idEspecie === actividad.idEspecie
                    )?.nombre || actividad.idEspecie || '-'}
                  </p>
                </article>
              ))}
            </div>
          )}
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
    </>
  );
}
