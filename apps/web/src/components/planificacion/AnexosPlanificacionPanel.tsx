import { useEffect, useState } from 'react';
import type { ConsolidadoPlanificacion } from '@agro/tipos';
import { crearAnexoPlanificacion, obtenerConsolidadoPlanificacion, obtenerLotesAnexo } from '../../services/api';
import type { LoteElegibleAnexo } from '../../services/api';
import { Button } from '../Button';
import { DataTable } from '../DataTable';

type Props = { originalId: string; token: string; puedeCrear: boolean; onCerrar: () => void; onAbrir: (id: string) => Promise<void> };

export function AnexosPlanificacionPanel({ originalId, token, puedeCrear, onCerrar, onAbrir }: Props) {
  const [consolidado, setConsolidado] = useState<ConsolidadoPlanificacion>();
  const [lotes, setLotes] = useState<LoteElegibleAnexo[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [creadoId, setCreadoId] = useState<string>();
  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerConsolidadoPlanificacion(originalId, token), puedeCrear ? obtenerLotesAnexo(originalId, token) : Promise.resolve({ lotes: [] })])
      .then(([datos, disponibles]) => { if (vigente) { setConsolidado(datos); setLotes(disponibles.lotes); } })
      .catch((e: unknown) => { if (vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar el consolidado.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [originalId, token, puedeCrear]);

  async function crear() {
    setGuardando(true); setError('');
    try {
      if (creadoId) { await onAbrir(creadoId); return; }
      const respuesta = await crearAnexoPlanificacion(originalId, { nombre, motivoIncorporacion: motivo, fechaIncorporacion: fecha, loteAppIds: seleccion }, token);
      setCreadoId(respuesta.planificacion.id);
      await onAbrir(respuesta.planificacion.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear el anexo.'); }
    finally { setGuardando(false); }
  }
  async function abrir(id: string) {
    setGuardando(true); setError('');
    try { await onAbrir(id); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el documento.'); }
    finally { setGuardando(false); }
  }
  function exportar() {
    if (!consolidado) return;
    // Escapar celdas y neutralizar formulas al abrir CSV en una planilla.
    const celda = (dato: string | number) => {
      const texto = typeof dato === 'number' ? String(dato) : dato.replace(/^\s*[=+@-]/, "'$&");
      return `"${texto.replace(/"/g, '""')}"`;
    };
    const documentos = new Map([consolidado.original, ...consolidado.anexos].map((p) => [p.id, p.nombre]));
    const filas = [['Documento', 'Lote', 'Actividad', 'Ha cultivo', 'Ingreso neto', 'Costo', 'Margen'], ...consolidado.lineas.map((l) => [
      documentos.get(l.planificacionId) ?? l.planificacionId, l.padronesSnapshot?.lote.nombre ?? l.loteAppId,
      l.padronesSnapshot?.actividad.nombre ?? l.actividadAppId, l.hectareasPlanificadas, l.ingresoNetoEstimado, l.costoProduccionEstimado, l.margenBrutoEstimado,
    ])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + filas.map((fila) => fila.map(celda).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'planificacion-consolidada.csv'; enlace.click(); URL.revokeObjectURL(url);
  }
  return <div className="modal-backdrop"><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="anexos-titulo">
    <div className="modal-header"><h2 id="anexos-titulo">Original, anexos y consolidado</h2><Button disabled={guardando} onClick={onCerrar}>Cerrar</Button></div>
    {cargando && <p>Cargando documentos y lotes...</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {consolidado && <>
      <p><strong>{consolidado.original.nombre}</strong></p>
      <p>Superficie fisica planificada: {consolidado.totales.superficieFisica} ha. Hectareas de cultivo: {consolidado.totales.hectareasCultivo} ha.</p>
      <p>Ingreso neto: USD {consolidado.totales.ingresoNeto.toFixed(2)}. Costo: USD {consolidado.totales.costo.toFixed(2)}. Margen: USD {consolidado.totales.margen.toFixed(2)}. Margen/ha de cultivo: USD {consolidado.totales.margenPorHa.toFixed(2)}.</p>
      <p>Solo incluye documentos cerrados. Los borradores se consultan en el listado de planificaciones.</p>
      <DataTable rows={consolidado.lineas} emptyMessage="No hay lineas cerradas visibles para tus campos." getRowKey={(l) => l.id} columns={[
        { key: 'documento', label: 'Documento', render: (l) => l.planificacionId === originalId ? 'Original' : `Anexo ${consolidado.anexos.find((a) => a.id === l.planificacionId)?.numeroAnexo ?? ''}` },
        { key: 'campo', label: 'Campo', render: (l) => l.padronesSnapshot?.campo.nombre ?? l.campoAppId },
        { key: 'lote', label: 'Lote', render: (l) => l.padronesSnapshot?.lote.nombre ?? l.loteAppId },
        { key: 'actividad', label: 'Actividad', render: (l) => l.padronesSnapshot?.actividad.nombre ?? l.actividadAppId },
        { key: 'ha', label: 'Ha cultivo', render: (l) => l.hectareasPlanificadas.toFixed(2) },
        { key: 'margen', label: 'Margen USD', render: (l) => l.margenBrutoEstimado.toFixed(2) },
      ]} />
      <div className="modal-actions"><Button disabled={guardando} onClick={() => void abrir(consolidado.original.id)}>Ver original</Button><Button disabled={guardando} onClick={exportar}>Exportar consolidado CSV</Button></div>
      {consolidado.anexos.map((p) => <p key={p.id}><Button disabled={guardando} onClick={() => void abrir(p.id)}>Ver Anexo {p.numeroAnexo}: {p.nombre}</Button><span> Incorporacion: {p.fechaIncorporacion}. {p.motivoIncorporacion}. Cerrado: {p.cerradaAt} por {p.cerradaPor}.</span></p>)}
    </>}
    {puedeCrear && !cargando && <>
      <h3>Crear anexo</h3>
      <div className="reference-modal-grid">
        <label>Nombre<input value={nombre} disabled={guardando} onChange={(e) => setNombre(e.target.value)} /></label>
        <label>Fecha de incorporacion<input type="date" value={fecha} disabled={guardando} onChange={(e) => setFecha(e.target.value)} /></label>
        <label className="reference-wide">Motivo<textarea value={motivo} disabled={guardando} onChange={(e) => setMotivo(e.target.value)} /></label>
        <label className="reference-wide">Lotes a incorporar<select multiple size={Math.min(8, Math.max(2, lotes.length))} disabled={guardando} value={seleccion} onChange={(e) => setSeleccion(Array.from(e.target.selectedOptions).map((o) => o.value))}>
          {lotes.map((l) => <option key={l.id} value={l.id}>{l.campoNombre} / {l.nombre} — {l.superficieProductiva} ha{l.enOtroBorrador ? ' (propuesto en otro borrador)' : ''}</option>)}
        </select></label>
      </div>
      {!lotes.length && <p>No hay lotes disponibles para incorporar.</p>}
      {seleccion.some((id) => lotes.find((l) => l.id === id)?.enOtroBorrador) && <p className="status-warning">Otro borrador propone alguno de estos lotes. Solo uno podra cerrarse con ellos.</p>}
      <Button variant="primary" disabled={guardando || !nombre.trim() || !motivo.trim() || !fecha || !seleccion.length || !consolidado} onClick={() => void crear()}>{guardando ? 'Abriendo...' : creadoId ? 'Abrir borrador creado' : 'Crear anexo y planificar'}</Button>
    </>}
  </section></div>;
}
