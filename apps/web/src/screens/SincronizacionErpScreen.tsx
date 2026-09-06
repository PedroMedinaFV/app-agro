import { useMemo, useState } from 'react';
import { PadronErpSincronizable, padronesErpSincronizables } from '@agro/tipos';
import type { SincronizacionErpResultado } from '../services/api';

type SincronizacionItem = {
  id: PadronErpSincronizable;
  label: string;
  descripcion: string;
};

interface SincronizacionErpScreenProps {
  puedeConfigurarErp: boolean;
  sincronizandoPadrones: boolean;
  ultimoResultadoSync: SincronizacionErpResultado['resultado'] | null;
  empresasSeleccionadas: string[];
  sincronizarPadrones: (items?: PadronErpSincronizable[]) => void;
}

const itemsDisponibles: SincronizacionItem[] = [
  { id: 'empresas', label: 'Empresas', descripcion: 'Catalogo de empresas disponibles en ALBOR.' },
  { id: 'zonas', label: 'Zonas', descripcion: 'Padron global de zonas usado por campos.' },
  { id: 'campos', label: 'Campos', descripcion: 'Campos por empresa AGRO seleccionada.' },
  { id: 'lotes', label: 'Lotes', descripcion: 'Lotes por campo y empresa.' },
  { id: 'actividades', label: 'Actividades', descripcion: 'Actividades agricolas globales.' },
  { id: 'especies', label: 'Especies', descripcion: 'Especies agricolas globales.' },
  { id: 'campanias', label: 'Campanias', descripcion: 'Campanias agricolas disponibles.' },
  { id: 'cultivos', label: 'Cultivos', descripcion: 'Cultivos operativos por lote/campania.' },
  { id: 'insumos', label: 'Insumos', descripcion: 'Padron de insumos para protocolos.' },
  { id: 'servicios', label: 'Servicios/Labores', descripcion: 'Servicios ERP usados como labores.' },
  { id: 'unidadesMedida', label: 'Unidades de medida', descripcion: 'Unidades para insumos y labores.' },
  { id: 'puertos', label: 'Puertos', descripcion: 'Puertos/destinos comerciales del ERP.' },
];

function formatearFecha(fecha?: string) {
  return fecha ? new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
}

export function SincronizacionErpScreen({
  puedeConfigurarErp,
  sincronizandoPadrones,
  ultimoResultadoSync,
  empresasSeleccionadas,
  sincronizarPadrones,
}: SincronizacionErpScreenProps) {
  const [seleccionados, setSeleccionados] = useState<PadronErpSincronizable[]>(padronesErpSincronizables.filter((item) => item !== 'empresas'));
  const todosSeleccionados = seleccionados.length === padronesErpSincronizables.length;
  const soloEmpresas = seleccionados.length === 1 && seleccionados[0] === 'empresas';
  const puedeSincronizar = puedeConfigurarErp && !sincronizandoPadrones && seleccionados.length > 0 && (soloEmpresas || empresasSeleccionadas.length > 0);
  const resumen = useMemo(() => ultimoResultadoSync ? [
    ['Empresas', ultimoResultadoSync.empresas],
    ['Zonas', ultimoResultadoSync.zonas],
    ['Campos', ultimoResultadoSync.campos],
    ['Lotes', ultimoResultadoSync.lotes],
    ['Actividades', ultimoResultadoSync.actividades],
    ['Especies', ultimoResultadoSync.especies],
    ['Campanias', ultimoResultadoSync.campanias],
    ['Cultivos', ultimoResultadoSync.cultivos],
    ['Insumos', ultimoResultadoSync.insumos],
    ['Servicios', ultimoResultadoSync.servicios],
    ['Unidades', ultimoResultadoSync.unidadesMedida],
    ['Puertos', ultimoResultadoSync.puertos],
    ['Sugerencias', ultimoResultadoSync.sugerenciasVinculacion?.creadas ?? 0],
  ] : [], [ultimoResultadoSync]);

  function alternarItem(item: PadronErpSincronizable) {
    setSeleccionados((actuales) =>
      actuales.includes(item)
        ? actuales.filter((actual) => actual !== item)
        : [...actuales, item],
    );
  }

  function alternarTodos() {
    setSeleccionados(todosSeleccionados ? [] : padronesErpSincronizables);
  }

  if (!puedeConfigurarErp) {
    return null;
  }

  return (
    <section className="planning-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Sincronizacion ERP</h2>
            <p className="hint">Selecciona que informacion queres traer desde ALBOR. El backend agregara dependencias necesarias para mantener relaciones consistentes.</p>
          </div>
          <div className="button-row">
            <button className="secondary" type="button" onClick={alternarTodos}>
              {todosSeleccionados ? 'Quitar todo' : 'Seleccionar todo'}
            </button>
            <button className="primary" type="button" disabled={!puedeSincronizar} onClick={() => sincronizarPadrones(seleccionados)}>
              {sincronizandoPadrones ? 'Sincronizando...' : 'Sincronizar seleccion'}
            </button>
          </div>
        </div>

        {empresasSeleccionadas.length === 0 && (
          <div className="status-error">Primero selecciona y guarda al menos una empresa AGRO en Empresas ERP.</div>
        )}

        <div className="sync-grid">
          {itemsDisponibles.map((item) => (
            <label className="sync-item" key={item.id}>
              <input
                type="checkbox"
                checked={seleccionados.includes(item.id)}
                onChange={() => alternarItem(item.id)}
                disabled={sincronizandoPadrones}
              />
              <span>
                <strong>{item.label}</strong>
                <small>{item.descripcion}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      {ultimoResultadoSync && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Ultimo resultado</h2>
              <p className="hint">Sincronizado: {formatearFecha(ultimoResultadoSync.sincronizadoEn)}</p>
            </div>
          </div>
          <div className="company-summary">
            {resumen.map(([label, valor]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{valor}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
