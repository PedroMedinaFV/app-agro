import { useEffect, useMemo, useState } from 'react';
import type {
  CampoApp,
  FichaLoteOperativoResponse,
  LoteApp,
  ObservacionCampo,
  PrecipitacionCampo,
  SesionUsuario,
  SeveridadObservacion,
} from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  crearUrlLecturaAdjuntoObservacion,
  obtenerFichaLoteOperativo,
  obtenerObservaciones,
  obtenerPlanificacionSnapshot,
  obtenerPrecipitaciones,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type SeguimientoOperativoScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

function formatearFecha(valor: string | undefined) {
  if (!valor) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function dentroDelRango(fechaIso: string, desde: string, hasta: string) {
  const fecha = new Date(fechaIso).getTime();
  const minimo = desde ? new Date(`${desde}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const maximo = hasta ? new Date(`${hasta}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return fecha >= minimo && fecha <= maximo;
}

export function SeguimientoOperativoScreen({ sesion, notificar }: SeguimientoOperativoScreenProps) {
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [observaciones, setObservaciones] = useState<ObservacionCampo[]>([]);
  const [precipitaciones, setPrecipitaciones] = useState<PrecipitacionCampo[]>([]);
  const [fichaLote, setFichaLote] = useState<FichaLoteOperativoResponse | null>(null);
  const [estado, setEstado] = useState('Cargando seguimiento operativo.');
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<SeveridadObservacion | 'todas'>('todas');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');

  async function cargarDatos() {
    try {
      const [snapshot, respuestaObservaciones, respuestaPrecipitaciones] = await Promise.all([
        obtenerPlanificacionSnapshot(sesion.token),
        obtenerObservaciones(sesion.token),
        obtenerPrecipitaciones(sesion.token),
      ]);

      setCampos(snapshot.camposApp);
      setLotes(snapshot.lotesApp);
      setObservaciones(respuestaObservaciones.observaciones);
      setPrecipitaciones(respuestaPrecipitaciones.precipitaciones);
      const loteInicial = filtroLoteId || snapshot.lotesApp[0]?.id || '';
      setFiltroLoteId(loteInicial);
      setEstado('Seguimiento cargado desde backend.');

      if (loteInicial) {
        setFichaLote(await obtenerFichaLoteOperativo(loteInicial, sesion.token));
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cargar el seguimiento operativo.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargo seguimiento', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const lotesDisponibles = filtroCampoId ? lotes.filter((lote) => lote.campoAppId === filtroCampoId) : lotes;
  const texto = filtroTexto.trim().toLocaleLowerCase('es');
  const observacionesFiltradas = observaciones.filter((observacion) => {
    const campo = camposPorId.get(observacion.campoAppId);
    const lote = observacion.loteAppId ? lotesPorId.get(observacion.loteAppId) : undefined;
    const coincideCampo = !filtroCampoId || observacion.campoAppId === filtroCampoId;
    const coincideLote = !filtroLoteId || observacion.loteAppId === filtroLoteId;
    const coincideSeveridad = filtroSeveridad === 'todas' || observacion.severidad === filtroSeveridad;
    const coincideFecha = dentroDelRango(observacion.fechaEvento, filtroDesde, filtroHasta);
    const coincideTexto = !texto
      || observacion.titulo.toLocaleLowerCase('es').includes(texto)
      || observacion.descripcion.toLocaleLowerCase('es').includes(texto)
      || campo?.nombre.toLocaleLowerCase('es').includes(texto)
      || lote?.nombre.toLocaleLowerCase('es').includes(texto);

    return coincideCampo && coincideLote && coincideSeveridad && coincideFecha && coincideTexto;
  });
  const precipitacionesFiltradas = precipitaciones.filter((precipitacion) => {
    const campo = camposPorId.get(precipitacion.campoAppId);
    const lote = precipitacion.loteAppId ? lotesPorId.get(precipitacion.loteAppId) : undefined;
    const coincideCampo = !filtroCampoId || precipitacion.campoAppId === filtroCampoId;
    const coincideLote = !filtroLoteId || precipitacion.loteAppId === filtroLoteId;
    const coincideFecha = dentroDelRango(precipitacion.fechaEvento, filtroDesde, filtroHasta);
    const coincideTexto = !texto
      || precipitacion.observaciones?.toLocaleLowerCase('es').includes(texto)
      || campo?.nombre.toLocaleLowerCase('es').includes(texto)
      || lote?.nombre.toLocaleLowerCase('es').includes(texto);

    return coincideCampo && coincideLote && coincideFecha && coincideTexto;
  });
  const totalMm = precipitacionesFiltradas.reduce((total, precipitacion) => total + precipitacion.milimetros, 0);
  const adjuntos = observacionesFiltradas.reduce((total, observacion) => total + (observacion.adjuntos?.length || 0), 0);

  async function seleccionarLote(loteAppId: string) {
    setFiltroLoteId(loteAppId);
    if (!loteAppId) {
      setFichaLote(null);
      return;
    }

    try {
      setFichaLote(await obtenerFichaLoteOperativo(loteAppId, sesion.token));
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cargar la ficha del lote.';
      notificar?.({ tipo: 'error', titulo: 'No se cargo la ficha', mensaje });
    }
  }

  async function abrirAdjunto(adjuntoId: string) {
    try {
      const respuesta = await crearUrlLecturaAdjuntoObservacion(adjuntoId, sesion.token);
      window.open(respuesta.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo abrir el adjunto.';
      notificar?.({ tipo: 'error', titulo: 'No se abrio el adjunto', mensaje });
    }
  }

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Seguimiento operativo"
        title="Campo y lote"
        description={estado}
        aside={<div className="status-pill">{observacionesFiltradas.length} obs.</div>}
      />

      <Panel>
        <div className="reference-modal-grid">
          <label>
            Campo
            <select
              value={filtroCampoId}
              onChange={(event) => {
                setFiltroCampoId(event.target.value);
                seleccionarLote('');
              }}
            >
              <option value="">Todos</option>
              {campos.map((campo) => (
                <option key={campo.id} value={campo.id}>{campo.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Lote
            <select value={filtroLoteId} onChange={(event) => seleccionarLote(event.target.value)}>
              <option value="">Todos</option>
              {lotesDisponibles.map((lote) => (
                <option key={lote.id} value={lote.id}>{lote.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Severidad
            <select value={filtroSeveridad} onChange={(event) => setFiltroSeveridad(event.target.value as SeveridadObservacion | 'todas')}>
              <option value="todas">Todas</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>

          <label>
            Desde
            <input type="date" value={filtroDesde} onChange={(event) => setFiltroDesde(event.target.value)} />
          </label>

          <label>
            Hasta
            <input type="date" value={filtroHasta} onChange={(event) => setFiltroHasta(event.target.value)} />
          </label>

          <label className="reference-wide">
            Buscar
            <input value={filtroTexto} onChange={(event) => setFiltroTexto(event.target.value)} placeholder="Campo, lote, titulo u observaciones" />
          </label>
        </div>
      </Panel>

      <section className="metrics operative-metrics">
        <article><span>Observaciones</span><strong>{observacionesFiltradas.length}</strong></article>
        <article><span>Adjuntos</span><strong>{adjuntos}</strong></article>
        <article><span>Precipitaciones</span><strong>{precipitacionesFiltradas.length}</strong></article>
        <article><span>Milimetros</span><strong>{totalMm.toFixed(1)}</strong></article>
      </section>

      {fichaLote && (
        <Panel className="operative-detail-panel" title="Ficha del lote" description={`${fichaLote.campo.nombre} / ${fichaLote.lote.nombre}`}>
          <div className="operative-detail-grid">
            <article>
              <h3>Base</h3>
              <p><strong>Zona:</strong> {fichaLote.zona?.nombre || 'Sin zona'}</p>
              <p><strong>Total:</strong> {fichaLote.lote.superficieTotal.toFixed(1)} ha</p>
              <p><strong>Productiva:</strong> {fichaLote.lote.superficieProductiva.toFixed(1)} ha</p>
            </article>

            <article>
              <h3>Cultivos ERP</h3>
              {fichaLote.cultivos.length ? fichaLote.cultivos.slice(0, 4).map((cultivo) => (
                <p key={cultivo.id}>{cultivo.nombre} - {cultivo.campaniaNombre || 'Sin campania'} - {cultivo.hectareas.toFixed(1)} ha</p>
              )) : <p>Sin cultivos asociados.</p>}
            </article>

            <article>
              <h3>Planificacion</h3>
              {fichaLote.planificaciones.length ? fichaLote.planificaciones.slice(0, 4).map((linea) => (
                <p key={linea.id}>{linea.planificacionNombre} - {linea.actividadNombre || 'Sin actividad'} - MB USD {linea.margenBrutoEstimado.toFixed(0)}</p>
              )) : <p>Sin planificacion asociada.</p>}
            </article>

            <article>
              <h3>Actividad reciente</h3>
              <p><strong>Lluvias 30 dias:</strong> {fichaLote.precipitaciones.milimetrosUltimos30Dias.toFixed(1)} mm</p>
              <p><strong>Ultima lluvia:</strong> {formatearFecha(fichaLote.precipitaciones.ultimoEvento)}</p>
              <p><strong>Observaciones altas:</strong> {fichaLote.observaciones.cantidadAlta}</p>
            </article>
          </div>
        </Panel>
      )}

      <Panel title="Observaciones" description="Registros operativos generados desde web y mobile.">
        <DataTable
          rows={observacionesFiltradas}
          getRowKey={(observacion) => observacion.id}
          emptyMessage="No hay observaciones para los filtros seleccionados."
          columns={[
            { key: 'fecha', label: 'Fecha', width: 'minmax(130px, 0.8fr)', render: (observacion) => formatearFecha(observacion.fechaEvento) },
            { key: 'campo', label: 'Campo', width: 'minmax(160px, 1fr)', render: (observacion) => <strong>{camposPorId.get(observacion.campoAppId)?.nombre || observacion.campoAppId}</strong> },
            { key: 'lote', label: 'Lote', width: 'minmax(130px, 0.8fr)', render: (observacion) => observacion.loteAppId ? lotesPorId.get(observacion.loteAppId)?.nombre || observacion.loteAppId : 'Campo completo' },
            { key: 'titulo', label: 'Titulo', width: 'minmax(190px, 1.4fr)', render: (observacion) => <><strong>{observacion.titulo}</strong><span>{observacion.descripcion}</span></> },
            { key: 'severidad', label: 'Sev.', width: 'minmax(72px, 0.4fr)', render: (observacion) => observacion.severidad },
            {
              key: 'adjuntos',
              label: 'Adjuntos',
              width: 'minmax(110px, 0.7fr)',
              render: (observacion) => observacion.adjuntos?.length
                ? observacion.adjuntos.map((adjunto) => (
                  <button className="link-button" key={adjunto.id} type="button" onClick={() => abrirAdjunto(adjunto.id)}>
                    {adjunto.nombreArchivo}
                  </button>
                ))
                : 'Sin adjuntos',
            },
          ]}
        />
      </Panel>

      <Panel title="Precipitaciones" description="Lluvias registradas para el mismo alcance operativo.">
        <DataTable
          rows={precipitacionesFiltradas}
          getRowKey={(precipitacion) => precipitacion.id}
          emptyMessage="No hay precipitaciones para los filtros seleccionados."
          columns={[
            { key: 'fecha', label: 'Fecha', width: 'minmax(130px, 0.8fr)', render: (precipitacion) => formatearFecha(precipitacion.fechaEvento) },
            { key: 'campo', label: 'Campo', width: 'minmax(160px, 1fr)', render: (precipitacion) => <strong>{camposPorId.get(precipitacion.campoAppId)?.nombre || precipitacion.campoAppId}</strong> },
            { key: 'lote', label: 'Lote', width: 'minmax(130px, 0.8fr)', render: (precipitacion) => precipitacion.loteAppId ? lotesPorId.get(precipitacion.loteAppId)?.nombre || precipitacion.loteAppId : 'Campo completo' },
            { key: 'mm', label: 'Mm', width: 'minmax(70px, 0.4fr)', render: (precipitacion) => `${precipitacion.milimetros.toFixed(1)} mm` },
            { key: 'observaciones', label: 'Observaciones', width: 'minmax(190px, 1.4fr)', render: (precipitacion) => precipitacion.observaciones || 'Sin observaciones' },
          ]}
        />
      </Panel>
    </section>
  );
}
