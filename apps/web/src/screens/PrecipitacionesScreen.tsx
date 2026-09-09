import { useEffect, useMemo, useState } from 'react';
import type { CampoPlanificacion, LotePlanificacion, PrecipitacionCampo, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import {
  crearPrecipitacion,
  obtenerCamposPlanificacion,
  obtenerLotesPlanificacion,
  obtenerPrecipitaciones,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type PrecipitacionesScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

type FormularioPrecipitacion = {
  campoPlanificacionId: string;
  lotePlanificacionId: string;
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

function crearFormularioInicial(campoPlanificacionId = ''): FormularioPrecipitacion {
  return {
    campoPlanificacionId,
    lotePlanificacionId: '',
    milimetros: '',
    fechaEvento: fechaActualInput(),
    observaciones: '',
  };
}

export function PrecipitacionesScreen({ sesion, notificar }: PrecipitacionesScreenProps) {
  const [precipitaciones, setPrecipitaciones] = useState<PrecipitacionCampo[]>([]);
  const [campos, setCampos] = useState<CampoPlanificacion[]>([]);
  const [lotes, setLotes] = useState<LotePlanificacion[]>([]);
  const [estado, setEstado] = useState('Cargando precipitaciones.');
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState<FormularioPrecipitacion>(crearFormularioInicial());

  async function cargarDatos() {
    try {
      const [respuestaPrecipitaciones, respuestaCampos, respuestaLotes] = await Promise.all([
        obtenerPrecipitaciones(sesion.token),
        obtenerCamposPlanificacion(sesion.token),
        obtenerLotesPlanificacion(sesion.token),
      ]);

      setPrecipitaciones(respuestaPrecipitaciones.precipitaciones);
      setCampos(respuestaCampos.campos);
      setLotes(respuestaLotes.lotes);
      setFormulario((actual) => (
        actual.campoPlanificacionId
          ? actual
          : crearFormularioInicial(respuestaCampos.campos[0]?.id || '')
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
  const lotesDelCampo = lotes.filter((lote) => lote.campoPlanificacionId === formulario.campoPlanificacionId);
  const totalPeriodo = precipitaciones.reduce((total, item) => total + item.milimetros, 0);
  const puedeCrear = sesion.permisos.includes('precipitaciones:crear');

  function actualizarFormulario(cambios: Partial<FormularioPrecipitacion>) {
    setFormulario((actual) => ({
      ...actual,
      ...cambios,
      lotePlanificacionId: Object.prototype.hasOwnProperty.call(cambios, 'campoPlanificacionId') ? '' : cambios.lotePlanificacionId ?? actual.lotePlanificacionId,
    }));
  }

  async function guardar() {
    const milimetros = Number(formulario.milimetros);

    if (!formulario.campoPlanificacionId || !Number.isFinite(milimetros) || milimetros <= 0) {
      notificar?.({ tipo: 'error', titulo: 'Datos incompletos', mensaje: 'Selecciona campo e informa milimetros mayores a cero.' });
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await crearPrecipitacion({
        campoPlanificacionId: formulario.campoPlanificacionId,
        lotePlanificacionId: formulario.lotePlanificacionId || undefined,
        milimetros,
        fechaEvento: new Date(formulario.fechaEvento).toISOString(),
        observaciones: formulario.observaciones || undefined,
        origen: 'web',
      }, sesion.token);

      setPrecipitaciones((actual) => [respuesta.precipitacion, ...actual]);
      setFormulario(crearFormularioInicial(formulario.campoPlanificacionId));
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
              value={formulario.campoPlanificacionId}
              disabled={!puedeCrear || guardando}
              onChange={(event) => actualizarFormulario({ campoPlanificacionId: event.target.value })}
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
              value={formulario.lotePlanificacionId}
              disabled={!puedeCrear || guardando || !formulario.campoPlanificacionId}
              onChange={(event) => actualizarFormulario({ lotePlanificacionId: event.target.value })}
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
            <p className="hint">Ultimas precipitaciones registradas dentro del alcance de la sesion.</p>
          </div>
        </div>

        <DataTable
          rows={precipitaciones}
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
              render: (precipitacion) => <strong>{camposPorId.get(precipitacion.campoPlanificacionId)?.nombre || precipitacion.campoPlanificacionId}</strong>,
            },
            {
              key: 'lote',
              label: 'Lote',
              width: 'minmax(130px, 0.8fr)',
              render: (precipitacion) => precipitacion.lotePlanificacionId ? lotesPorId.get(precipitacion.lotePlanificacionId)?.nombre || precipitacion.lotePlanificacionId : 'Campo completo',
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
