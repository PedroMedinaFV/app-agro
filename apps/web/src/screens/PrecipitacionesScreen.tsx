import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, LoteApp, PrecipitacionCampo, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import {
  crearPrecipitacion,
  obtenerPlanificacionSnapshot,
  obtenerPrecipitaciones,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type PrecipitacionesScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

type FormularioPrecipitacion = {
  campoAppId: string;
  loteAppId: string;
  milimetros: string;
  fechaEvento: string;
  observaciones: string;
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

function crearFormularioInicial(campoAppId = ''): FormularioPrecipitacion {
  return {
    campoAppId,
    loteAppId: '',
    milimetros: '',
    fechaEvento: fechaActualInput(),
    observaciones: '',
  };
}

export function PrecipitacionesScreen({ sesion, notificar }: PrecipitacionesScreenProps) {
  const [precipitaciones, setPrecipitaciones] = useState<PrecipitacionCampo[]>([]);
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando precipitaciones.');
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState<FormularioPrecipitacion>(crearFormularioInicial());
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');

  async function cargarDatos() {
    try {
      const [respuestaPrecipitaciones, respuestaPlanificacion] = await Promise.all([
        obtenerPrecipitaciones(sesion.token),
        obtenerPlanificacionSnapshot(sesion.token),
      ]);

      setPrecipitaciones(respuestaPrecipitaciones.precipitaciones);
      setCampos(respuestaPlanificacion.camposApp);
      setLotes(respuestaPlanificacion.lotesApp);
      setFormulario((actual) => (
        actual.campoAppId
          ? actual
          : crearFormularioInicial(respuestaPlanificacion.camposApp[0]?.id || '')
      ));
      setEstado('Precipitaciones cargadas desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las precipitaciones.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron precipitaciones', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const lotesDelCampo = lotes.filter((lote) => lote.campoAppId === formulario.campoAppId);
  const lotesFiltro = filtroCampoId ? lotes.filter((lote) => lote.campoAppId === filtroCampoId) : lotes;
  const precipitacionesFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLocaleLowerCase('es');

    return precipitaciones.filter((precipitacion) => {
      const campo = camposPorId.get(precipitacion.campoAppId);
      const lote = precipitacion.loteAppId ? lotesPorId.get(precipitacion.loteAppId) : undefined;
      const coincideCampo = !filtroCampoId || precipitacion.campoAppId === filtroCampoId;
      const coincideLote = !filtroLoteId || precipitacion.loteAppId === filtroLoteId;
      const coincideTexto = !texto
        || precipitacion.observaciones?.toLocaleLowerCase('es').includes(texto)
        || campo?.nombre.toLocaleLowerCase('es').includes(texto)
        || lote?.nombre.toLocaleLowerCase('es').includes(texto);

      return coincideCampo && coincideLote && coincideTexto;
    });
  }, [camposPorId, filtroCampoId, filtroLoteId, filtroTexto, lotesPorId, precipitaciones]);
  const totalPeriodo = precipitacionesFiltradas.reduce((total, item) => total + item.milimetros, 0);
  const puedeCrear = sesion.permisos.includes('precipitaciones:crear');

  function actualizarFormulario(cambios: Partial<FormularioPrecipitacion>) {
    setFormulario((actual) => ({
      ...actual,
      ...cambios,
      loteAppId: Object.prototype.hasOwnProperty.call(cambios, 'campoAppId') ? '' : cambios.loteAppId ?? actual.loteAppId,
    }));
  }

  async function guardar() {
    const milimetros = Number(formulario.milimetros);

    if (!formulario.campoAppId || !Number.isFinite(milimetros) || milimetros <= 0) {
      notificar?.({ tipo: 'error', titulo: 'Datos incompletos', mensaje: 'Selecciona campo e informa milimetros mayores a cero.' });
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await crearPrecipitacion({
        campoAppId: formulario.campoAppId,
        loteAppId: formulario.loteAppId || undefined,
        milimetros,
        fechaEvento: new Date(formulario.fechaEvento).toISOString(),
        observaciones: formulario.observaciones || undefined,
        origen: 'web',
      }, sesion.token);

      setPrecipitaciones((actual) => [respuesta.precipitacion, ...actual]);
      setFormulario(crearFormularioInicial(formulario.campoAppId));
      notificar?.({ tipo: 'success', titulo: 'Precipitacion registrada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la precipitacion.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Operacion de campo</p>
          <h2>Precipitaciones</h2>
          <p className="hint">Carga y consulta de lluvias por campo asignado, con lote opcional para mejorar el analisis posterior.</p>
        </div>
        <div className="status-pill">{totalPeriodo.toFixed(1)} mm</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Nueva precipitacion</h2>
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
            Milimetros
            <input
              min="0"
              step="0.1"
              type="number"
              value={formulario.milimetros}
              disabled={!puedeCrear || guardando}
              placeholder="Ej. 24.5"
              onChange={(event) => actualizarFormulario({ milimetros: event.target.value })}
            />
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
            Observaciones
            <input
              value={formulario.observaciones}
              disabled={!puedeCrear || guardando}
              placeholder="Comentario opcional"
              onChange={(event) => actualizarFormulario({ observaciones: event.target.value })}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="primary" type="button" disabled={!puedeCrear || guardando} onClick={guardar}>
            {guardando ? 'Guardando...' : 'Guardar precipitacion'}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Registros</h2>
            <p className="hint">Ultimas precipitaciones registradas dentro del alcance de la sesion. Mostrando {precipitacionesFiltradas.length} de {precipitaciones.length}.</p>
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

          <label className="reference-wide">
            Buscar
            <input value={filtroTexto} onChange={(event) => setFiltroTexto(event.target.value)} placeholder="Campo, lote u observaciones" />
          </label>
        </div>

        <DataTable
          rows={precipitacionesFiltradas}
          getRowKey={(precipitacion) => precipitacion.id}
          emptyMessage="Todavia no hay precipitaciones registradas."
          columns={[
            {
              key: 'fecha',
              label: 'Fecha',
              width: 'minmax(130px, 0.8fr)',
              render: (precipitacion) => formatearFecha(precipitacion.fechaEvento),
            },
            {
              key: 'campo',
              label: 'Campo',
              width: 'minmax(170px, 1.2fr)',
              render: (precipitacion) => <strong>{camposPorId.get(precipitacion.campoAppId)?.nombre || precipitacion.campoAppId}</strong>,
            },
            {
              key: 'lote',
              label: 'Lote',
              width: 'minmax(130px, 0.8fr)',
              render: (precipitacion) => precipitacion.loteAppId ? lotesPorId.get(precipitacion.loteAppId)?.nombre || precipitacion.loteAppId : 'Campo completo',
            },
            {
              key: 'mm',
              label: 'Milimetros',
              width: 'minmax(100px, 0.6fr)',
              render: (precipitacion) => `${precipitacion.milimetros.toFixed(1)} mm`,
            },
            {
              key: 'observaciones',
              label: 'Observaciones',
              width: 'minmax(190px, 1.4fr)',
              render: (precipitacion) => precipitacion.observaciones || 'Sin observaciones',
            },
          ]}
        />
      </section>
    </section>
  );
}
