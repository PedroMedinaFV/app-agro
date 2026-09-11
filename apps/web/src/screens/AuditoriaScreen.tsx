import { useEffect, useMemo, useState } from 'react';
import { AuditoriaEventoResumen, SesionUsuario } from '@agro/tipos';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { obtenerAuditoriaEventos } from '../services/api';

type AuditoriaScreenProps = {
  sesion: SesionUsuario;
  notificar?: (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje: string }) => void;
};

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatearJson(valor: unknown) {
  if (valor === undefined || valor === null) {
    return '-';
  }

  return JSON.stringify(valor, null, 2);
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function valorLegible(valor: unknown) {
  if (valor === undefined) return 'Sin valor';
  if (valor === null) return 'Null';
  if (typeof valor === 'string') return valor || 'Vacio';
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) return `${valor.length} item(s)`;
  if (typeof valor === 'object') return 'Objeto';

  return String(valor);
}

function resumirCambios(antes: unknown, despues: unknown, prefijo = ''): { campo: string; antes: string; despues: string }[] {
  if (!esObjetoPlano(antes) || !esObjetoPlano(despues)) {
    if (JSON.stringify(antes) === JSON.stringify(despues)) {
      return [];
    }

    return [{ campo: prefijo || 'registro', antes: valorLegible(antes), despues: valorLegible(despues) }];
  }

  const keys = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];

  return keys.flatMap((key) => {
    const campo = prefijo ? `${prefijo}.${key}` : key;
    const valorAntes = antes[key];
    const valorDespues = despues[key];

    if (JSON.stringify(valorAntes) === JSON.stringify(valorDespues)) {
      return [];
    }

    if (esObjetoPlano(valorAntes) && esObjetoPlano(valorDespues)) {
      return resumirCambios(valorAntes, valorDespues, campo);
    }

    return [{ campo, antes: valorLegible(valorAntes), despues: valorLegible(valorDespues) }];
  });
}

function describirCambio(evento: AuditoriaEventoResumen) {
  const [principal] = resumirCambios(evento.valoresAntes, evento.valoresDespues);

  if (evento.accion === 'actualizar' && principal) {
    return `Se actualizo ${principal.campo} de ${principal.antes} a ${principal.despues}`;
  }

  if (evento.accion === 'crear') {
    return 'Se creo el registro';
  }

  if (evento.accion === 'copiar') {
    return 'Se creo una copia';
  }

  if (evento.accion === 'cerrar') {
    return 'Se cerro el registro';
  }

  if (principal) {
    return `${evento.accion}: ${principal.campo} cambio de ${principal.antes} a ${principal.despues}`;
  }

  return evento.motivo || 'Sin detalle resumido';
}

export function AuditoriaScreen({ sesion, notificar }: AuditoriaScreenProps) {
  const [eventos, setEventos] = useState<AuditoriaEventoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [entidad, setEntidad] = useState('');
  const [accion, setAccion] = useState('');
  const [limite, setLimite] = useState(100);
  const [seleccionadoId, setSeleccionadoId] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const seleccionado = eventos.find((evento) => evento.id === seleccionadoId) || eventos[0];
  const cambiosSeleccionados = seleccionado ? resumirCambios(seleccionado.valoresAntes, seleccionado.valoresDespues).slice(0, 20) : [];
  const entidades = useMemo(() => [...new Set(eventos.map((evento) => evento.entidad))].sort(), [eventos]);
  const acciones = useMemo(() => [...new Set(eventos.map((evento) => evento.accion))].sort(), [eventos]);

  async function cargarAuditoria() {
    setCargando(true);

    try {
      const respuesta = await obtenerAuditoriaEventos(sesion.token, {
        entidad: entidad || undefined,
        accion: accion || undefined,
        limite,
      });
      setEventos(respuesta.eventos);
      setTotal(respuesta.total);
      setSeleccionadoId(respuesta.eventos[0]?.id);
    } catch (error) {
      notificar?.({
        tipo: 'error',
        titulo: 'No se pudo cargar auditoria',
        mensaje: error instanceof Error ? error.message : 'Revisa la API.',
      });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarAuditoria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Administracion"
        title="Auditoria"
        description="Consulta de cambios registrados por el backend. Los eventos son solo lectura."
        aside={<div className="status-pill">{total}</div>}
        actions={<Button variant="secondary" onClick={cargarAuditoria} disabled={cargando}>{cargando ? 'Cargando...' : 'Actualizar'}</Button>}
      />

      <Panel title="Filtros" description="Filtra sobre los eventos mas recientes del cliente activo.">
        <div className="planning-filters">
          <label>
            Entidad
            <select value={entidad} onChange={(event) => setEntidad(event.target.value)}>
              <option value="">Todas</option>
              {entidades.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Accion
            <select value={accion} onChange={(event) => setAccion(event.target.value)}>
              <option value="">Todas</option>
              {acciones.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Limite
            <select value={limite} onChange={(event) => setLimite(Number(event.target.value))}>
              {[50, 100, 200, 300].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Button variant="primary" onClick={cargarAuditoria} disabled={cargando}>Aplicar</Button>
        </div>
      </Panel>

      <section className="audit-layout">
        <Panel title="Eventos" description="Ultimos cambios auditados.">
          <DataTable
            rows={eventos}
            getRowKey={(evento) => evento.id}
            emptyMessage="Todavia no hay eventos de auditoria para mostrar."
            initialPageSize={10}
            selectedRowKey={seleccionado?.id}
            onRowClick={(evento) => setSeleccionadoId(evento.id)}
            columns={[
              {
                key: 'fecha',
                label: 'Fecha',
                width: 'minmax(116px, 0.75fr)',
                render: (evento) => formatearFecha(evento.createdAt),
              },
              {
                key: 'usuario',
                label: 'Usuario',
                width: 'minmax(150px, 1fr)',
                render: (evento) => (
                  <div className="stacked-cell">
                    <strong>{evento.usuarioNombre || evento.usuarioEmail || evento.usuarioId || '-'}</strong>
                    {evento.usuarioEmail && <span>{evento.usuarioEmail}</span>}
                  </div>
                ),
              },
              {
                key: 'entidad',
                label: 'Entidad',
                width: 'minmax(130px, 0.85fr)',
                render: (evento) => (
                  <div className="stacked-cell">
                    <strong>{evento.entidad}</strong>
                    <span>{evento.entidadId}</span>
                  </div>
                ),
              },
              {
                key: 'cambio',
                label: 'Cambio',
                width: 'minmax(220px, 1.35fr)',
                render: (evento) => (
                  <div className="audit-change-cell">
                    <span className="audit-action-pill">{evento.accion}</span>
                    <strong>{describirCambio(evento)}</strong>
                  </div>
                ),
              },
              {
                key: 'origen',
                label: 'Origen',
                width: 'minmax(96px, 0.6fr)',
                render: (evento) => evento.origen,
              },
            ]}
          />
        </Panel>

        <Panel title="Detalle" description="Resumen legible del cambio seleccionado.">
          {seleccionado ? (
            <div className="audit-detail">
              <article>
                <span>Evento</span>
                <strong>{seleccionado.accion} - {seleccionado.entidad}</strong>
                <p>{seleccionado.motivo || 'Sin motivo informado.'}</p>
              </article>
              <div className="audit-change-list">
                <h3>Que cambio</h3>
                {cambiosSeleccionados.length > 0 ? cambiosSeleccionados.map((cambio) => (
                  <article key={`${seleccionado.id}-${cambio.campo}`}>
                    <strong>{cambio.campo}</strong>
                    <span>Se actualizo de {cambio.antes} a {cambio.despues}</span>
                  </article>
                )) : (
                  <p className="hint">No hay diferencias simples para mostrar. Revisa el JSON tecnico.</p>
                )}
              </div>
              <label>
                Antes
                <pre>{formatearJson(seleccionado.valoresAntes)}</pre>
              </label>
              <label>
                Despues
                <pre>{formatearJson(seleccionado.valoresDespues)}</pre>
              </label>
              <label>
                Metadata
                <pre>{formatearJson(seleccionado.metadata)}</pre>
              </label>
            </div>
          ) : (
            <div className="empty-state">Selecciona un evento para ver el detalle.</div>
          )}
        </Panel>
      </section>
    </section>
  );
}
