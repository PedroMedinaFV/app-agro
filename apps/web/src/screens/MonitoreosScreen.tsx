import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, LoteApp, ObjetivoRecorridaCampo, RecorridaCampo, SesionUsuario } from '@agro/tipos';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { FechaInput } from '../components/FechaInput';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  cerrarRecorridaCampo,
  crearRecorridaCampo,
  obtenerPlanificacionSnapshot,
  obtenerRecorridasCampo,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type MonitoreosScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

type FormularioRecorrida = {
  campoAppId: string;
  loteAppId: string;
  titulo: string;
  objetivo: ObjetivoRecorridaCampo;
  fechaInicio: string;
  observaciones: string;
};

const objetivos: { valor: ObjetivoRecorridaCampo; etiqueta: string }[] = [
  { valor: 'monitoreo_general', etiqueta: 'Monitoreo general' },
  { valor: 'plagas', etiqueta: 'Plagas' },
  { valor: 'malezas', etiqueta: 'Malezas' },
  { valor: 'enfermedades', etiqueta: 'Enfermedades' },
  { valor: 'emergencia', etiqueta: 'Emergencia' },
  { valor: 'cosecha', etiqueta: 'Cosecha' },
  { valor: 'otro', etiqueta: 'Otro' },
];

function fechaActualIso() {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());

  return ahora.toISOString().slice(0, 10);
}

function crearFormularioInicial(campoAppId = ''): FormularioRecorrida {
  return {
    campoAppId,
    loteAppId: '',
    titulo: '',
    objetivo: 'monitoreo_general',
    fechaInicio: fechaActualIso(),
    observaciones: '',
  };
}

function formatearFecha(valor?: string) {
  if (!valor) return '-';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}

function obtenerEtiquetaObjetivo(objetivo: ObjetivoRecorridaCampo) {
  return objetivos.find((item) => item.valor === objetivo)?.etiqueta || objetivo;
}

export function MonitoreosScreen({ sesion, notificar }: MonitoreosScreenProps) {
  const [recorridas, setRecorridas] = useState<RecorridaCampo[]>([]);
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [formulario, setFormulario] = useState<FormularioRecorrida>(crearFormularioInicial());
  const [estado, setEstado] = useState('Cargando recorridas.');
  const [guardando, setGuardando] = useState(false);
  const [cerrandoId, setCerrandoId] = useState<string | null>(null);
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | RecorridaCampo['estado']>('todas');
  const [filtroTexto, setFiltroTexto] = useState('');

  async function cargarDatos() {
    try {
      const [respuestaRecorridas, respuestaPlanificacion] = await Promise.all([
        obtenerRecorridasCampo(sesion.token),
        obtenerPlanificacionSnapshot(sesion.token),
      ]);

      setRecorridas(respuestaRecorridas.recorridas);
      setCampos(respuestaPlanificacion.camposApp);
      setLotes(respuestaPlanificacion.lotesApp);
      setFormulario((actual) => (
        actual.campoAppId
          ? actual
          : crearFormularioInicial(respuestaPlanificacion.camposApp[0]?.id || '')
      ));
      setEstado('Recorridas cargadas desde backend.');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las recorridas.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargaron recorridas', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const puedeCrear = sesion.permisos.includes('recorridas:crear');
  const puedeCerrar = sesion.permisos.includes('recorridas:cerrar');
  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const lotesDelCampo = lotes.filter((lote) => lote.campoAppId === formulario.campoAppId);
  const recorridasAbiertas = recorridas.filter((recorrida) => recorrida.estado === 'en_curso' || recorrida.estado === 'borrador').length;
  const recorridasFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLocaleLowerCase('es');

    return recorridas.filter((recorrida) => {
      const campo = camposPorId.get(recorrida.campoAppId);
      const lote = recorrida.loteAppId ? lotesPorId.get(recorrida.loteAppId) : undefined;
      const coincideCampo = !filtroCampoId || recorrida.campoAppId === filtroCampoId;
      const coincideEstado = filtroEstado === 'todas' || recorrida.estado === filtroEstado;
      const coincideTexto = !texto
        || recorrida.titulo.toLocaleLowerCase('es').includes(texto)
        || recorrida.observaciones?.toLocaleLowerCase('es').includes(texto)
        || campo?.nombre.toLocaleLowerCase('es').includes(texto)
        || lote?.nombre.toLocaleLowerCase('es').includes(texto);

      return coincideCampo && coincideEstado && coincideTexto;
    });
  }, [camposPorId, filtroCampoId, filtroEstado, filtroTexto, lotesPorId, recorridas]);

  function actualizarFormulario(cambios: Partial<FormularioRecorrida>) {
    setFormulario((actual) => ({
      ...actual,
      ...cambios,
      loteAppId: Object.prototype.hasOwnProperty.call(cambios, 'campoAppId') ? '' : cambios.loteAppId ?? actual.loteAppId,
    }));
  }

  async function guardarRecorrida() {
    const fechaInicio = formulario.fechaInicio ? `${formulario.fechaInicio}T12:00:00` : '';
    const fechaValida = new Date(fechaInicio);

    if (!formulario.campoAppId || !formulario.titulo.trim()) {
      notificar?.({ tipo: 'error', titulo: 'Datos incompletos', mensaje: 'Selecciona campo e informa un titulo.' });
      return;
    }

    if (Number.isNaN(fechaValida.getTime())) {
      notificar?.({ tipo: 'error', titulo: 'Fecha invalida', mensaje: 'Ingresa una fecha valida.' });
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await crearRecorridaCampo({
        campoAppId: formulario.campoAppId,
        loteAppId: formulario.loteAppId || undefined,
        titulo: formulario.titulo.trim(),
        objetivo: formulario.objetivo,
        estado: 'en_curso',
        fechaInicio: fechaValida.toISOString(),
        observaciones: formulario.observaciones.trim() || undefined,
        origen: 'web',
      }, sesion.token);

      setRecorridas((actual) => [respuesta.recorrida, ...actual]);
      setFormulario(crearFormularioInicial(formulario.campoAppId));
      notificar?.({ tipo: 'success', titulo: 'Recorrida creada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la recorrida.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarRecorrida(recorrida: RecorridaCampo) {
    setCerrandoId(recorrida.id);
    try {
      const respuesta = await cerrarRecorridaCampo(recorrida.id, {
        fechaCierre: new Date().toISOString(),
        origen: 'web',
      }, sesion.token);

      setRecorridas((actual) => actual.map((item) => (item.id === recorrida.id ? respuesta.recorrida : item)));
      notificar?.({ tipo: 'success', titulo: 'Recorrida cerrada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cerrar la recorrida.';
      notificar?.({ tipo: 'error', titulo: 'No se cerro', mensaje });
    } finally {
      setCerrandoId(null);
    }
  }

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Operacion de campo"
        title="Monitoreos"
        description="Planificacion liviana de recorridas, vinculada a campos, lotes y observaciones operativas."
        aside={<div className="status-pill">{recorridasAbiertas} abierta(s)</div>}
      />

      <Panel title="Nueva recorrida" description={estado}>
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
              <option value="">Campo completo</option>
              {lotesDelCampo.map((lote) => (
                <option key={lote.id} value={lote.id}>{lote.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Objetivo
            <select
              value={formulario.objetivo}
              disabled={!puedeCrear || guardando}
              onChange={(event) => actualizarFormulario({ objetivo: event.target.value as ObjetivoRecorridaCampo })}
            >
              {objetivos.map((objetivo) => (
                <option key={objetivo.valor} value={objetivo.valor}>{objetivo.etiqueta}</option>
              ))}
            </select>
          </label>

          <label>
            Fecha
            <FechaInput
              value={formulario.fechaInicio}
              disabled={!puedeCrear || guardando}
              onChange={(fechaInicio) => actualizarFormulario({ fechaInicio })}
            />
          </label>

          <label className="reference-wide">
            Titulo
            <input
              value={formulario.titulo}
              disabled={!puedeCrear || guardando}
              placeholder="Ej. Recorrida malezas lote norte"
              onChange={(event) => actualizarFormulario({ titulo: event.target.value })}
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
          <Button variant="primary" disabled={!puedeCrear || guardando} onClick={guardarRecorrida}>
            {guardando ? 'Guardando...' : 'Crear recorrida'}
          </Button>
        </div>
      </Panel>

      <Panel title="Recorridas" description={`Mostrando ${recorridasFiltradas.length} de ${recorridas.length}.`}>
        <div className="reference-modal-grid">
          <label>
            Campo
            <select value={filtroCampoId} onChange={(event) => setFiltroCampoId(event.target.value)}>
              <option value="">Todos</option>
              {campos.map((campo) => (
                <option key={campo.id} value={campo.id}>{campo.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Estado
            <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value as typeof filtroEstado)}>
              <option value="todas">Todas</option>
              <option value="borrador">Borrador</option>
              <option value="en_curso">En curso</option>
              <option value="cerrada">Cerrada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>

          <label className="reference-wide">
            Buscar
            <input value={filtroTexto} onChange={(event) => setFiltroTexto(event.target.value)} placeholder="Titulo, campo, lote u observaciones" />
          </label>
        </div>

        <DataTable
          rows={recorridasFiltradas}
          getRowKey={(recorrida) => recorrida.id}
          emptyMessage="Todavia no hay recorridas registradas."
          columns={[
            {
              key: 'inicio',
              label: 'Inicio',
              width: 'minmax(110px, 0.7fr)',
              render: (recorrida) => formatearFecha(recorrida.fechaInicio),
            },
            {
              key: 'campo',
              label: 'Campo',
              width: 'minmax(170px, 1fr)',
              render: (recorrida) => <strong>{camposPorId.get(recorrida.campoAppId)?.nombre || recorrida.campoAppId}</strong>,
            },
            {
              key: 'lote',
              label: 'Lote',
              width: 'minmax(130px, 0.8fr)',
              render: (recorrida) => recorrida.loteAppId ? lotesPorId.get(recorrida.loteAppId)?.nombre || recorrida.loteAppId : 'Campo completo',
            },
            {
              key: 'detalle',
              label: 'Recorrida',
              width: 'minmax(220px, 1.2fr)',
              render: (recorrida) => (
                <>
                  <strong>{recorrida.titulo}</strong>
                  <span>{obtenerEtiquetaObjetivo(recorrida.objetivo)}</span>
                </>
              ),
            },
            {
              key: 'observaciones',
              label: 'Hallazgos',
              width: 'minmax(100px, 0.6fr)',
              render: (recorrida) => (
                <>
                  <strong>{recorrida.cantidadObservaciones}</strong>
                  <span>{recorrida.severidadMaxima ? `Max. ${recorrida.severidadMaxima}` : 'Sin severidad'}</span>
                </>
              ),
            },
            {
              key: 'estado',
              label: 'Estado',
              width: 'minmax(100px, 0.6fr)',
              render: (recorrida) => <em>{recorrida.estado.replace('_', ' ')}</em>,
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(82px, 0.45fr)',
              render: (recorrida) => (
                <div className="table-icon-actions">
                  <IconButton
                    icon="check"
                    label="Cerrar recorrida"
                    disabled={!puedeCerrar || cerrandoId === recorrida.id || recorrida.estado === 'cerrada' || recorrida.estado === 'cancelada'}
                    onClick={() => cerrarRecorrida(recorrida)}
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
