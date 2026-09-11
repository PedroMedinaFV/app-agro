import { useMemo, useState } from 'react';
import { PadronErpSincronizable, SincronizacionErpHistorialItem } from '@agro/tipos';
import type { SincronizacionErpResultado } from '../services/api';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { Panel } from '../components/Panel';

type SincronizacionItem = {
  id: PadronErpSincronizable;
  label: string;
  descripcion: string;
};

interface SincronizacionErpScreenProps {
  puedeConfigurarErp: boolean;
  sincronizandoPadrones: boolean;
  ultimoResultadoSync: SincronizacionErpResultado['resultado'] | null;
  historialSincronizaciones: SincronizacionErpHistorialItem[];
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
  { id: 'monedas', label: 'Monedas', descripcion: 'Padron contable global para precios y costos.' },
  { id: 'puertos', label: 'Puertos', descripcion: 'Puertos/destinos comerciales del ERP.' },
];
const padronesErpSincronizables = itemsDisponibles.map((item) => item.id);

function formatearFecha(fecha?: string) {
  return fecha ? new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
}

export function SincronizacionErpScreen({
  puedeConfigurarErp,
  sincronizandoPadrones,
  ultimoResultadoSync,
  historialSincronizaciones,
  empresasSeleccionadas,
  sincronizarPadrones,
}: SincronizacionErpScreenProps) {
  const [seleccionados, setSeleccionados] = useState<PadronErpSincronizable[]>(padronesErpSincronizables.filter((item) => item !== 'empresas'));
  const [syncSeleccionadaId, setSyncSeleccionadaId] = useState<string | null>(null);
  const todosSeleccionados = seleccionados.length === padronesErpSincronizables.length;
  const soloEmpresas = seleccionados.length === 1 && seleccionados[0] === 'empresas';
  const puedeSincronizar = puedeConfigurarErp && !sincronizandoPadrones && seleccionados.length > 0 && (soloEmpresas || empresasSeleccionadas.length > 0);
  const syncSeleccionada = historialSincronizaciones.find((sync) => sync.id === syncSeleccionadaId) || historialSincronizaciones[0];
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
    ['Monedas', ultimoResultadoSync.monedas],
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
      <Panel
        title="Sincronizacion ERP"
        description="Selecciona que informacion queres traer desde ALBOR. El backend agregara dependencias necesarias para mantener relaciones consistentes."
        actions={(
          <ActionBar align="end">
            <Button variant="secondary" onClick={alternarTodos}>
              {todosSeleccionados ? 'Quitar todo' : 'Seleccionar todo'}
            </Button>
            <Button variant="primary" disabled={!puedeSincronizar} onClick={() => sincronizarPadrones(seleccionados)}>
              {sincronizandoPadrones ? 'Sincronizando...' : 'Sincronizar seleccion'}
            </Button>
          </ActionBar>
        )}
      >
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
      </Panel>

      {ultimoResultadoSync && (
        <Panel title="Ultimo resultado" description={`Sincronizado: ${formatearFecha(ultimoResultadoSync.sincronizadoEn)}`}>
          <div className="company-summary">
            {resumen.map(([label, valor]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{valor}</strong>
              </article>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Historial de sincronizaciones" description="Ultimas corridas persistidas, con estado y detalle por empresa/padron.">
        <DataTable
          rows={historialSincronizaciones}
          getRowKey={(sync) => sync.id}
          emptyMessage="Todavia no hay corridas registradas."
          initialPageSize={5}
          columns={[
            {
              key: 'inicio',
              label: 'Inicio',
              width: 'minmax(112px, 0.9fr)',
              render: (sync) => formatearFecha(sync.iniciadoEn),
            },
            {
              key: 'estado',
              label: 'Estado',
              width: 'minmax(96px, 0.7fr)',
              render: (sync) => <span className={sync.estado === 'error' ? 'badge-danger' : sync.estado === 'en_proceso' ? 'badge-warning' : 'badge-success'}>{sync.estado}</span>,
            },
            {
              key: 'items',
              label: 'Padrones',
              width: 'minmax(180px, 1.5fr)',
              render: (sync) => sync.itemsEjecutados.join(', '),
            },
            {
              key: 'resultado',
              label: 'Resultado',
              width: 'minmax(150px, 1fr)',
              render: (sync) => sync.error || `${sync.detalles.reduce((total, detalle) => total + detalle.registros, 0)} registros`,
            },
            {
              key: 'acciones',
              label: '',
              width: '56px',
              render: (sync) => (
                <div className="table-icon-actions">
                  <IconButton icon="edit" label="Ver detalle" onClick={() => setSyncSeleccionadaId(sync.id)} />
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {syncSeleccionada && (
        <Panel title="Detalle por empresa y padron" description={`Corrida iniciada: ${formatearFecha(syncSeleccionada.iniciadoEn)}`}>
          <DataTable
            rows={syncSeleccionada.detalles}
            getRowKey={(detalle) => detalle.id}
            emptyMessage="Esta corrida todavia no tiene detalle registrado."
            initialPageSize={10}
            columns={[
              {
                key: 'empresa',
                label: 'Empresa',
                width: 'minmax(110px, 0.9fr)',
                render: (detalle) => detalle.empresaErpId,
              },
              {
                key: 'padron',
                label: 'Padron',
                width: 'minmax(130px, 1fr)',
                render: (detalle) => detalle.padron,
              },
              {
                key: 'registros',
                label: 'Registros',
                width: '96px',
                render: (detalle) => detalle.registros,
              },
              {
                key: 'omitidos',
                label: 'Omitidos',
                width: '88px',
                render: (detalle) => detalle.omitidos,
              },
              {
                key: 'estado',
                label: 'Estado',
                width: 'minmax(96px, 0.7fr)',
                render: (detalle) => <span className={detalle.estado === 'error' ? 'badge-danger' : 'badge-success'}>{detalle.estado}</span>,
              },
            ]}
          />
        </Panel>
      )}
    </section>
  );
}
