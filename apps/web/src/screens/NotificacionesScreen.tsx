import { useEffect, useMemo, useState } from 'react';
import type { NotificacionUsuarioResumen, SesionUsuario } from '@agro/tipos';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { Panel } from '../components/Panel';
import { generarSugerenciasVinculacion, obtenerNotificaciones, resolverNotificacionVinculacion } from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

interface NotificacionesScreenProps {
  sesion: SesionUsuario;
  notificar?: Notificar;
  onCantidadPendienteChange?: (cantidad: number) => void;
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

export function NotificacionesScreen({ sesion, notificar, onCantidadPendienteChange }: NotificacionesScreenProps) {
  const [notificaciones, setNotificaciones] = useState<NotificacionUsuarioResumen[]>([]);
  const [estado, setEstado] = useState('Cargando notificaciones.');
  const [generando, setGenerando] = useState(false);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);

  async function cargarNotificaciones() {
    try {
      const respuesta = await obtenerNotificaciones(sesion.token);
      setNotificaciones(respuesta.notificaciones);
      onCantidadPendienteChange?.(respuesta.notificaciones.length);
      setEstado('Notificaciones pendientes cargadas desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron notificaciones', mensaje });
    }
  }

  useEffect(() => {
    cargarNotificaciones();
  }, [sesion.token, notificar, onCantidadPendienteChange]);

  async function buscarSugerencias() {
    setGenerando(true);

    try {
      const resultado = await generarSugerenciasVinculacion(sesion.token);
      await cargarNotificaciones();
      notificar?.({
        tipo: resultado.creadas ? 'success' : 'info',
        titulo: resultado.creadas ? 'Sugerencias generadas' : 'Sin nuevas sugerencias',
        mensaje: `Detectadas: ${resultado.detectadas}. Nuevas: ${resultado.creadas}.`,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron buscar sugerencias.';
      notificar?.({ tipo: 'error', titulo: 'No se buscaron sugerencias', mensaje });
    } finally {
      setGenerando(false);
    }
  }

  async function resolverSugerencia(notificacion: NotificacionUsuarioResumen, decision: 'aceptar' | 'descartar') {
    if (!notificacion.vinculacionSugerida) {
      notificar?.({ tipo: 'info', titulo: 'Notificacion informativa', mensaje: 'Esta notificacion no tiene una sugerencia de vinculacion asociada.' });
      return;
    }

    setResolviendoId(notificacion.id);

    try {
      const respuesta = await resolverNotificacionVinculacion(notificacion.id, {
        decision,
        motivo: decision === 'aceptar' ? 'Aceptada por usuario desde notificaciones.' : 'Descartada por usuario desde notificaciones.',
      }, sesion.token);
      await cargarNotificaciones();
      notificar?.({
        tipo: 'success',
        titulo: decision === 'aceptar' ? 'Vinculacion aplicada' : 'Sugerencia descartada',
        mensaje: respuesta.mensaje,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo resolver la notificacion.';
      notificar?.({ tipo: 'error', titulo: 'No se resolvio la notificacion', mensaje });
    } finally {
      setResolviendoId(null);
    }
  }

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

      <Panel
        title="Notificaciones internas"
        description={estado}
        actions={(
          <Button variant="secondary" onClick={buscarSugerencias} disabled={generando}>
            {generando ? 'Buscando...' : 'Buscar sugerencias'}
          </Button>
        )}
      >
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
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(170px, 0.8fr)',
              render: (notificacion) => (
                <div className="table-icon-actions">
                  <IconButton
                    icon="check"
                    label={resolviendoId === notificacion.id ? 'Resolviendo' : 'Aceptar sugerencia'}
                    disabled={resolviendoId !== null || !notificacion.vinculacionSugerida}
                    onClick={() => resolverSugerencia(notificacion, 'aceptar')}
                  />
                  <IconButton
                    icon="close"
                    className="danger-icon"
                    label="Descartar sugerencia"
                    disabled={resolviendoId !== null || !notificacion.vinculacionSugerida}
                    onClick={() => resolverSugerencia(notificacion, 'descartar')}
                  />
                </div>
              ),
            },
          ]}
        />
      </Panel>
    </section>
  );
}
