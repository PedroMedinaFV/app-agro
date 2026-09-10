import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, FichaLoteOperativoResponse, LoteApp, ObservacionCampo, SesionUsuario, SeveridadObservacion } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import {
  crearObservacion,
  crearUrlLecturaAdjuntoObservacion,
  crearUrlSubidaAdjuntoObservacion,
  obtenerFichaLoteOperativo,
  obtenerObservaciones,
  obtenerPlanificacionSnapshot,
  subirArchivoAFirmaSupabase,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type ObservacionesScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

type FormularioObservacion = {
  campoAppId: string;
  loteAppId: string;
  titulo: string;
  descripcion: string;
  severidad: SeveridadObservacion;
  latitud: string;
  longitud: string;
  fechaEvento: string;
};

function fechaActualInput() {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());

  return ahora.toISOString().slice(0, 16);
}

function formatearFecha(valor: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

function crearFormularioInicial(campoAppId = ''): FormularioObservacion {
  return {
    campoAppId,
    loteAppId: '',
    titulo: '',
    descripcion: '',
    severidad: 'media',
    latitud: '',
    longitud: '',
    fechaEvento: fechaActualInput(),
  };
}

function describirCoordenadas(observacion: ObservacionCampo) {
  if (observacion.latitud === undefined || observacion.longitud === undefined) {
    return 'Sin ubicacion';
  }

  return `${observacion.latitud.toFixed(5)}, ${observacion.longitud.toFixed(5)}`;
}

export function ObservacionesScreen({ sesion, notificar }: ObservacionesScreenProps) {
  const [observaciones, setObservaciones] = useState<ObservacionCampo[]>([]);
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando observaciones.');
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState<FormularioObservacion>(crearFormularioInicial());
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<SeveridadObservacion | 'todas'>('todas');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [fichaLote, setFichaLote] = useState<FichaLoteOperativoResponse | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  async function cargarDatos() {
    try {
      const [respuestaObservaciones, respuestaPlanificacion] = await Promise.all([
        obtenerObservaciones(sesion.token),
        obtenerPlanificacionSnapshot(sesion.token),
      ]);

      setObservaciones(respuestaObservaciones.observaciones);
      setCampos(respuestaPlanificacion.camposApp);
      setLotes(respuestaPlanificacion.lotesApp);
      setFormulario((actual) => (
        actual.campoAppId
          ? actual
          : crearFormularioInicial(respuestaPlanificacion.camposApp[0]?.id || '')
      ));
      setEstado('Observaciones cargadas desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las observaciones.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron observaciones', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const lotesDelCampo = lotes.filter((lote) => lote.campoAppId === formulario.campoAppId);
  const lotesFiltro = filtroCampoId ? lotes.filter((lote) => lote.campoAppId === filtroCampoId) : lotes;
  const puedeCrear = sesion.permisos.includes('observaciones:crear');
  const observacionesAltas = observaciones.filter((observacion) => observacion.severidad === 'alta').length;
  const observacionesFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLocaleLowerCase('es');

    return observaciones.filter((observacion) => {
      const campo = camposPorId.get(observacion.campoAppId);
      const lote = observacion.loteAppId ? lotesPorId.get(observacion.loteAppId) : undefined;
      const coincideCampo = !filtroCampoId || observacion.campoAppId === filtroCampoId;
      const coincideLote = !filtroLoteId || observacion.loteAppId === filtroLoteId;
      const coincideSeveridad = filtroSeveridad === 'todas' || observacion.severidad === filtroSeveridad;
      const coincideTexto = !texto
        || observacion.titulo.toLocaleLowerCase('es').includes(texto)
        || observacion.descripcion.toLocaleLowerCase('es').includes(texto)
        || campo?.nombre.toLocaleLowerCase('es').includes(texto)
        || lote?.nombre.toLocaleLowerCase('es').includes(texto);

      return coincideCampo && coincideLote && coincideSeveridad && coincideTexto;
    });
  }, [camposPorId, filtroCampoId, filtroLoteId, filtroSeveridad, filtroTexto, lotesPorId, observaciones]);

  function actualizarFormulario(cambios: Partial<FormularioObservacion>) {
    setFormulario((actual) => ({
      ...actual,
      ...cambios,
      loteAppId: Object.prototype.hasOwnProperty.call(cambios, 'campoAppId') ? '' : cambios.loteAppId ?? actual.loteAppId,
    }));
  }

  async function guardar() {
    const latitud = formulario.latitud.trim() ? Number(formulario.latitud) : undefined;
    const longitud = formulario.longitud.trim() ? Number(formulario.longitud) : undefined;

    if (!formulario.campoAppId || !formulario.titulo.trim() || !formulario.descripcion.trim()) {
      notificar?.({ tipo: 'error', titulo: 'Datos incompletos', mensaje: 'Selecciona campo, titulo y descripcion.' });
      return;
    }

    if ((latitud !== undefined && !Number.isFinite(latitud)) || (longitud !== undefined && !Number.isFinite(longitud))) {
      notificar?.({ tipo: 'error', titulo: 'Coordenadas invalidas', mensaje: 'Latitud y longitud deben ser numericas.' });
      return;
    }

    setGuardando(true);
    try {
      const adjuntoSubido = archivoAdjunto
        ? await crearUrlSubidaAdjuntoObservacion({
          nombreArchivo: archivoAdjunto.name,
          mimeType: archivoAdjunto.type,
          tamanioBytes: archivoAdjunto.size,
        }, sesion.token)
        : null;

      if (archivoAdjunto && adjuntoSubido) {
        await subirArchivoAFirmaSupabase(adjuntoSubido.signedUploadUrl, archivoAdjunto);
      }

      const respuesta = await crearObservacion({
        campoAppId: formulario.campoAppId,
        loteAppId: formulario.loteAppId || undefined,
        titulo: formulario.titulo,
        descripcion: formulario.descripcion,
        severidad: formulario.severidad,
        latitud,
        longitud,
        fechaEvento: new Date(formulario.fechaEvento).toISOString(),
        origen: 'web',
        adjuntos: archivoAdjunto && adjuntoSubido
          ? [{
            storageBucket: adjuntoSubido.storageBucket,
            storagePath: adjuntoSubido.storagePath,
            nombreArchivo: archivoAdjunto.name,
            mimeType: archivoAdjunto.type,
            tamanioBytes: archivoAdjunto.size,
            estado: 'disponible',
          }]
          : undefined,
      }, sesion.token);

      setObservaciones((actual) => [respuesta.observacion, ...actual]);
      setFormulario(crearFormularioInicial(formulario.campoAppId));
      setArchivoAdjunto(null);
      notificar?.({ tipo: 'success', titulo: 'Observacion registrada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la observacion.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo', mensaje });
    } finally {
      setGuardando(false);
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

  async function verFichaLote(loteAppId: string | undefined) {
    if (!loteAppId) {
      notificar?.({ tipo: 'info', titulo: 'Sin lote especifico', mensaje: 'La observacion corresponde al campo completo.' });
      return;
    }

    setCargandoFicha(true);
    try {
      setFichaLote(await obtenerFichaLoteOperativo(loteAppId, sesion.token));
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cargar la ficha del lote.';
      notificar?.({ tipo: 'error', titulo: 'No se cargo la ficha', mensaje });
    } finally {
      setCargandoFicha(false);
    }
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Operacion de campo</p>
          <h2>Observaciones</h2>
          <p className="hint">Carga y consulta de observaciones operativas por campo y lote, con severidad y ubicacion opcional.</p>
        </div>
        <div className="status-pill">{observacionesAltas} alta(s)</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Nueva observacion</h2>
            <p className="hint">{estado}</p>
          </div>
        </div>

        <div className="reference-modal-grid">
          <label>
            Campo
            <select
              value={formulario.campoAppId}
              disabled={!puedeCrear || guardando}
              onChange={(event) => actualizarFormulario({ campoAppId: event.target.value })}
            >
              <option value="">Seleccionar campo</option>
              {campos.map((campo) => (
                <option key={campo.id} value={campo.id}>{campo.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Lote
            <select
              value={formulario.loteAppId}
              disabled={!puedeCrear || guardando || !formulario.campoAppId}
              onChange={(event) => actualizarFormulario({ loteAppId: event.target.value })}
            >
              <option value="">Sin lote especifico</option>
              {lotesDelCampo.map((lote) => (
                <option key={lote.id} value={lote.id}>{lote.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Severidad
            <select
              value={formulario.severidad}
              disabled={!puedeCrear || guardando}
              onChange={(event) => actualizarFormulario({ severidad: event.target.value as SeveridadObservacion })}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>

          <label>
            Fecha y hora
            <input
              type="datetime-local"
              value={formulario.fechaEvento}
              disabled={!puedeCrear || guardando}
              onChange={(event) => actualizarFormulario({ fechaEvento: event.target.value })}
            />
          </label>

          <label className="reference-wide">
            Titulo
            <input
              value={formulario.titulo}
              disabled={!puedeCrear || guardando}
              placeholder="Ej. Mancha foliar detectada"
              onChange={(event) => actualizarFormulario({ titulo: event.target.value })}
            />
          </label>

          <label className="reference-wide">
            Descripcion
            <textarea
              value={formulario.descripcion}
              disabled={!puedeCrear || guardando}
              placeholder="Detalle de lo observado"
              onChange={(event) => actualizarFormulario({ descripcion: event.target.value })}
            />
          </label>

          <label>
            Latitud
            <input
              type="number"
              step="0.000001"
              value={formulario.latitud}
              disabled={!puedeCrear || guardando}
              placeholder="-37.12345"
              onChange={(event) => actualizarFormulario({ latitud: event.target.value })}
            />
          </label>

          <label>
            Longitud
            <input
              type="number"
              step="0.000001"
              value={formulario.longitud}
              disabled={!puedeCrear || guardando}
              placeholder="-58.12345"
              onChange={(event) => actualizarFormulario({ longitud: event.target.value })}
            />
          </label>

          <label className="reference-wide">
            Foto adjunta
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={!puedeCrear || guardando}
              onChange={(event) => setArchivoAdjunto(event.target.files?.[0] || null)}
            />
            {archivoAdjunto && <span>{archivoAdjunto.name} - {Math.round(archivoAdjunto.size / 1024)} KB</span>}
          </label>
        </div>

        <div className="modal-actions">
          <button className="primary" type="button" disabled={!puedeCrear || guardando} onClick={guardar}>
            {guardando ? 'Guardando...' : 'Guardar observacion'}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Registros</h2>
            <p className="hint">Ultimas observaciones registradas dentro del alcance de la sesion. Mostrando {observacionesFiltradas.length} de {observaciones.length}.</p>
          </div>
        </div>

        <div className="reference-modal-grid">
          <label>
            Campo
            <select
              value={filtroCampoId}
              onChange={(event) => {
                setFiltroCampoId(event.target.value);
                setFiltroLoteId('');
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
            <select value={filtroLoteId} onChange={(event) => setFiltroLoteId(event.target.value)}>
              <option value="">Todos</option>
              {lotesFiltro.map((lote) => (
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

          <label className="reference-wide">
            Buscar
            <input value={filtroTexto} onChange={(event) => setFiltroTexto(event.target.value)} placeholder="Titulo, descripcion, campo o lote" />
          </label>
        </div>

        <DataTable
          rows={observacionesFiltradas}
          getRowKey={(observacion) => observacion.id}
          emptyMessage="Todavia no hay observaciones registradas."
          columns={[
            {
              key: 'fecha',
              label: 'Fecha',
              width: 'minmax(130px, 0.8fr)',
              render: (observacion) => formatearFecha(observacion.fechaEvento),
            },
            {
              key: 'campo',
              label: 'Campo',
              width: 'minmax(170px, 1.1fr)',
              render: (observacion) => <strong>{camposPorId.get(observacion.campoAppId)?.nombre || observacion.campoAppId}</strong>,
            },
            {
              key: 'lote',
              label: 'Lote',
              width: 'minmax(130px, 0.8fr)',
              render: (observacion) => observacion.loteAppId ? lotesPorId.get(observacion.loteAppId)?.nombre || observacion.loteAppId : 'Campo completo',
            },
            {
              key: 'severidad',
              label: 'Severidad',
              width: 'minmax(92px, 0.6fr)',
              render: (observacion) => <em>{observacion.severidad}</em>,
            },
            {
              key: 'titulo',
              label: 'Titulo',
              width: 'minmax(170px, 1.1fr)',
              render: (observacion) => <><strong>{observacion.titulo}</strong><span>{observacion.descripcion}</span></>,
            },
            {
              key: 'ubicacion',
              label: 'Ubicacion',
              width: 'minmax(140px, 0.9fr)',
              render: describirCoordenadas,
            },
            {
              key: 'adjuntos',
              label: 'Adjuntos',
              width: 'minmax(110px, 0.7fr)',
              render: (observacion) => {
                const adjuntos = observacion.adjuntos || [];

                return adjuntos.length
                  ? (
                    <>
                      <strong>{adjuntos.length}</strong>
                      {adjuntos.map((adjunto) => (
                        <button className="link-button" key={adjunto.id} type="button" onClick={() => abrirAdjunto(adjunto.id)}>
                          {adjunto.nombreArchivo}
                        </button>
                      ))}
                    </>
                  )
                  : 'Sin adjuntos';
              },
            },
            {
              key: 'acciones',
              label: '',
              width: 'minmax(54px, 0.35fr)',
              render: (observacion) => (
                <button
                  className="icon-button"
                  type="button"
                  title="Ver ficha del lote"
                  disabled={!observacion.loteAppId || cargandoFicha}
                  onClick={() => verFichaLote(observacion.loteAppId)}
                >
                  FI
                </button>
              ),
            },
          ]}
        />
      </section>

      {fichaLote && (
        <section className="panel operative-detail-panel">
          <div className="panel-header">
            <div>
              <h2>Ficha del lote</h2>
              <p className="hint">{fichaLote.campo.nombre} / {fichaLote.lote.nombre}</p>
            </div>
            <button className="ghost" type="button" onClick={() => setFichaLote(null)}>Cerrar</button>
          </div>

          <section className="metrics operative-metrics">
            <article><span>Superficie total</span><strong>{fichaLote.lote.superficieTotal.toFixed(1)} ha</strong></article>
            <article><span>Productiva</span><strong>{fichaLote.lote.superficieProductiva.toFixed(1)} ha</strong></article>
            <article><span>Lluvias 30 dias</span><strong>{fichaLote.precipitaciones.milimetrosUltimos30Dias.toFixed(1)} mm</strong></article>
            <article><span>Observaciones altas</span><strong>{fichaLote.observaciones.cantidadAlta}</strong></article>
          </section>

          <div className="operative-detail-grid">
            <article>
              <h3>Ubicacion operativa</h3>
              <p><strong>Zona:</strong> {fichaLote.zona?.nombre || 'Sin zona'}</p>
              <p><strong>Estado lote:</strong> {fichaLote.lote.estadoVinculacion}</p>
              <p><strong>Codigo:</strong> {fichaLote.lote.codigoInterno || 'Sin codigo'}</p>
            </article>

            <article>
              <h3>Cultivos ERP</h3>
              {fichaLote.cultivos.length ? fichaLote.cultivos.slice(0, 4).map((cultivo) => (
                <p key={cultivo.id}>{cultivo.nombre} - {cultivo.campaniaNombre || 'Sin campania'} - {cultivo.hectareas.toFixed(1)} ha</p>
              )) : <p>Sin cultivos ERP asociados.</p>}
            </article>

            <article>
              <h3>Planificacion</h3>
              {fichaLote.planificaciones.length ? fichaLote.planificaciones.slice(0, 4).map((linea) => (
                <p key={linea.id}>{linea.planificacionNombre} - {linea.actividadNombre || 'Sin actividad'} - MB USD {linea.margenBrutoEstimado.toFixed(0)}</p>
              )) : <p>Sin lineas de planificacion asociadas.</p>}
            </article>

            <article>
              <h3>Ultimas observaciones</h3>
              {fichaLote.observaciones.ultimas.length ? fichaLote.observaciones.ultimas.map((observacion) => (
                <p key={observacion.id}>{formatearFecha(observacion.fechaEvento)} - {observacion.severidad} - {observacion.titulo} - {observacion.cantidadAdjuntos} adj.</p>
              )) : <p>Sin observaciones registradas.</p>}
            </article>
          </div>
        </section>
      )}
    </section>
  );
}
