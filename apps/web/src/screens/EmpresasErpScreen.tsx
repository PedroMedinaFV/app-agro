import { ErpEmpresa } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { SincronizacionErpResultado } from '../services/api';

interface EmpresasErpScreenProps {
  puedeConfigurarErp: boolean;
  guardandoEmpresas: boolean;
  sincronizandoPadrones: boolean;
  ultimoResultadoSync: SincronizacionErpResultado['resultado'] | null;
  empresasDisponibles: ErpEmpresa[];
  empresasSeleccionadas: string[];
  empresasSeleccionadasSet: Set<string>;
  // Handlers
  guardarSeleccionEmpresas: () => void;
  sincronizarPadrones: () => void;
  alternarEmpresa: (erpId: string) => void;
}

export function EmpresasErpScreen({
  puedeConfigurarErp,
  guardandoEmpresas,
  sincronizandoPadrones,
  ultimoResultadoSync,
  empresasDisponibles,
  empresasSeleccionadas,
  empresasSeleccionadasSet,
  guardarSeleccionEmpresas,
  sincronizarPadrones,
  alternarEmpresa,
}: EmpresasErpScreenProps) {
  if (!puedeConfigurarErp) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Empresas asociadas a AGRO</h2>
          <p className="hint">La seleccion define con que valores de x-company se sincronizan los padrones.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={sincronizarPadrones} disabled={guardandoEmpresas || sincronizandoPadrones || empresasSeleccionadas.length === 0}>
            <span className="button-content">
              {sincronizandoPadrones && <LoadingSpinner label="Sincronizando padrones" />}
              {sincronizandoPadrones ? 'Sincronizando...' : 'Sincronizar padrones'}
            </span>
          </button>
          <button className="primary" onClick={guardarSeleccionEmpresas} disabled={guardandoEmpresas || sincronizandoPadrones}>
            <span className="button-content">
              {guardandoEmpresas && <LoadingSpinner label="Guardando empresas" />}
              {guardandoEmpresas ? 'Guardando...' : 'Guardar seleccion'}
            </span>
          </button>
        </div>
      </div>

      <div className="company-summary">
        <article>
          <span>Disponibles</span>
          <strong>{empresasDisponibles.length}</strong>
        </article>
        <article>
          <span>Seleccionadas</span>
          <strong>{empresasSeleccionadas.length}</strong>
        </article>
        {ultimoResultadoSync && (
          <>
            <article>
              <span>Campos sync</span>
              <strong>{ultimoResultadoSync.campos}</strong>
            </article>
            <article>
              <span>Lotes sync</span>
              <strong>{ultimoResultadoSync.lotes}</strong>
            </article>
            <article>
              <span>Cultivos sync</span>
              <strong>{ultimoResultadoSync.cultivos}</strong>
            </article>
            <article>
              <span>Ultimo sync</span>
              <strong>{new Date(ultimoResultadoSync.sincronizadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</strong>
            </article>
          </>
        )}
      </div>

      <div className="company-table">
        {empresasDisponibles.map((empresa) => (
          <label className="company-row" key={empresa.erpId}>
            <input
              type="checkbox"
              checked={empresasSeleccionadasSet.has(empresa.erpId)}
              onChange={() => alternarEmpresa(empresa.erpId)}
            />
            <div>
              <strong>{empresa.codigo} - {empresa.nombre}</strong>
              <span>{empresa.razonSocial || 'Sin razon social'} / CUIT {empresa.cuit || '-'}</span>
              <span>x-company: {empresa.idEmpresa}</span>
            </div>
            <em>{empresa.activo ? 'Activa' : 'Inactiva'}</em>
          </label>
        ))}
      </div>
    </section>
  );
}
