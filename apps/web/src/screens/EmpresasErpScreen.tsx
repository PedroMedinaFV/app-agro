import { ErpEmpresa } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface EmpresasErpScreenProps {
  puedeConfigurarErp: boolean;
  guardandoEmpresas: boolean;
  empresasDisponibles: ErpEmpresa[];
  empresasSeleccionadas: string[];
  empresasSeleccionadasSet: Set<string>;
  // Handlers
  guardarSeleccionEmpresas: () => void;
  alternarEmpresa: (erpId: string) => void;
}

export function EmpresasErpScreen({
  puedeConfigurarErp,
  guardandoEmpresas,
  empresasDisponibles,
  empresasSeleccionadas,
  empresasSeleccionadasSet,
  guardarSeleccionEmpresas,
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
        <button className="primary" onClick={guardarSeleccionEmpresas} disabled={guardandoEmpresas}>
          <span className="button-content">
            {guardandoEmpresas && <LoadingSpinner label="Guardando empresas" />}
            {guardandoEmpresas ? 'Guardando...' : 'Guardar seleccion'}
          </span>
        </button>
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
