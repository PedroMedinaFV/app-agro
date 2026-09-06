import { useEffect, useMemo, useState } from 'react';
import type { NotificacionUsuarioResumen, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { obtenerNotificaciones } from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

interface NotificacionesScreenProps {
  sesion: SesionUsuario;
  notificar?: Notificar;
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha));
}

function obtenerDetalleSugerencia(notificacion: NotificacionUsuarioResumen) {
  const sugerencia = notificacion.vinculacionSugerida;

  if (!sugerencia) {
    return '-';
  }

  return `${sugerencia.entidadTipo} / ERP ${sugerencia.entidadErpId} / ${Math.round(sugerencia.puntajeCoincidencia)}%`;
}

export function NotificacionesScreen({ sesion, notificar }: NotificacionesScreenProps) {
  const [notificaciones, setNotificaciones] = useState<NotificacionUsuarioResumen[]>([]);
  const [estado, setEstado] = useState('Cargando notificaciones.');

  useEffect(() => {
    async function cargarNotificaciones() {
      try {
        const respuesta = await obtenerNotificaciones(sesion.token);
        setNotificaciones(respuesta.notificaciones);
        setEstado('Notificaciones pendientes cargadas desde backend.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron notificaciones', mensaje });
      }
    }

    cargarNotificaciones();
  }, [sesion.token, notificar]);

  const pendientesVinculacion = useMemo(
    () => notificaciones.filter((notificacion) => notificacion.tipo === 'vinculacion_erp_sugerida'),
    [notificaciones],
  );

  return (
    <section className="planning-stack">
      <section className="metrics">
        <article>
          <span>Pendientes</span>
          <strong>{notificaciones.length}</strong>
        </article>
        <article>
          <span>Vinculaciones</span>
          <strong>{pendientesVinculacion.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Notificaciones internas</h2>
            <p className="hint">{estado}</p>
          </div>
        </div>

        <DataTable
          rows={notificaciones}
          getRowKey={(notificacion) => notificacion.id}
          emptyMessage="No hay notificaciones pendientes."
          initialPageSize={25}
          columns={[
            { key: 'titulo', label: 'Notificacion', width: 'minmax(220px, 1.3fr)', render: (notificacion) => <><strong>{notificacion.titulo}</strong><span>{notificacion.mensaje}</span></> },
            { key: 'prioridad', label: 'Prioridad', width: 'minmax(95px, 0.5fr)', render: (notificacion) => notificacion.prioridad },
            { key: 'detalle', label: 'Detalle', width: 'minmax(180px, 0.9fr)', render: obtenerDetalleSugerencia },
            { key: 'fecha', label: 'Fecha', width: 'minmax(130px, 0.7fr)', render: (notificacion) => formatearFecha(notificacion.createdAt) },
          ]}
        />
      </section>
    </section>
  );
}
