import { useEffect, useMemo, useState } from 'react';
import type {
  ActividadPlanificacion,
  CampoPlanificacion,
  ErpActividad,
  ErpCampo,
  ErpEspecie,
  ErpInsumo,
  ErpLote,
  ErpServicio,
  ErpZona,
  EspeciePlanificacion,
  InsumoPlanificacion,
  LaborReferencia,
  LotePlanificacion,
  SesionUsuario,
  ZonaPlanificacion,
} from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  guardarActividadPlanificacion,
  guardarCampoPlanificacion,
  guardarEspeciePlanificacion,
  guardarInsumoPlanificacion,
  guardarLaborReferencia,
  guardarLotePlanificacion,
  guardarZonaPlanificacion,
  obtenerActividadesErpImportadas,
  obtenerActividadesPlanificacion,
  obtenerCamposErpImportados,
  obtenerCamposPlanificacion,
  obtenerEspeciesErpImportadas,
  obtenerEspeciesPlanificacion,
  obtenerInsumosErpImportados,
  obtenerInsumosPlanificacion,
  obtenerLaboresReferencia,
  obtenerLotesErpImportados,
  obtenerLotesPlanificacion,
  obtenerServiciosErpImportados,
  obtenerZonasErpImportadas,
  obtenerZonasPlanificacion,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;
type TipoPadron = 'zonas' | 'campos' | 'lotes' | 'especies' | 'actividades' | 'insumos' | 'labores';

type VinculacionFila = {
  id: string;
  tipo: TipoPadron;
  padron: string;
  propio: string;
  erp: string;
  detalle: string;
  actualizado: string;
};

type VinculacionEnEdicion = {
  fila: VinculacionFila;
  destinoErpId: string;
};

type VinculacionesPadronesScreenProps = {
  sesion: SesionUsuario;
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
  onVinculacionesActualizadas?: () => Promise<void> | void;
};

function formatearFecha(fecha?: string) {
  return fecha ? new Intl.DateTimeFormat('es-AR').format(new Date(fecha)) : '-';
}

export function VinculacionesPadronesScreen({ sesion, puedeConfigurarPlanificacion, notificar, onVinculacionesActualizadas }: VinculacionesPadronesScreenProps) {
  const [zonas, setZonas] = useState<ZonaPlanificacion[]>([]);
  const [campos, setCampos] = useState<CampoPlanificacion[]>([]);
  const [lotes, setLotes] = useState<LotePlanificacion[]>([]);
  const [especies, setEspecies] = useState<EspeciePlanificacion[]>([]);
  const [actividades, setActividades] = useState<ActividadPlanificacion[]>([]);
  const [insumos, setInsumos] = useState<InsumoPlanificacion[]>([]);
  const [labores, setLabores] = useState<LaborReferencia[]>([]);
  const [zonasErp, setZonasErp] = useState<ErpZona[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [actividadesErp, setActividadesErp] = useState<ErpActividad[]>([]);
  const [insumosErp, setInsumosErp] = useState<ErpInsumo[]>([]);
  const [serviciosErp, setServiciosErp] = useState<ErpServicio[]>([]);
  const [estado, setEstado] = useState('Cargando vinculaciones.');
  const [guardando, setGuardando] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<TipoPadron | 'todos'>('todos');
  const [vinculacionEnEdicion, setVinculacionEnEdicion] = useState<VinculacionEnEdicion | null>(null);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [
          zonasPropias,
          camposPropios,
          lotesPropios,
          especiesPropias,
          actividadesPropias,
          insumosPropios,
          laboresPropias,
          zonasImportadas,
          camposImportados,
          lotesImportados,
          especiesImportadas,
          actividadesImportadas,
          insumosImportados,
          serviciosImportados,
        ] = await Promise.all([
          obtenerZonasPlanificacion(sesion.token),
          obtenerCamposPlanificacion(sesion.token),
          obtenerLotesPlanificacion(sesion.token),
          obtenerEspeciesPlanificacion(sesion.token),
          obtenerActividadesPlanificacion(sesion.token),
          obtenerInsumosPlanificacion(sesion.token),
          obtenerLaboresReferencia(sesion.token),
          obtenerZonasErpImportadas(sesion.token),
          obtenerCamposErpImportados(sesion.token),
          obtenerLotesErpImportados(sesion.token),
          obtenerEspeciesErpImportadas(sesion.token),
          obtenerActividadesErpImportadas(sesion.token),
          obtenerInsumosErpImportados(sesion.token),
          obtenerServiciosErpImportados(sesion.token),
        ]);

        setZonas(zonasPropias.zonas);
        setCampos(camposPropios.campos);
        setLotes(lotesPropios.lotes);
        setEspecies(especiesPropias.especies);
        setActividades(actividadesPropias.actividades);
        setInsumos(insumosPropios.insumos);
        setLabores(laboresPropias.labores);
        setZonasErp(zonasImportadas.zonas);
        setCamposErp(camposImportados.campos);
        setLotesErp(lotesImportados.lotes);
        setEspeciesErp(especiesImportadas.especies);
        setActividadesErp(actividadesImportadas.actividades);
        setInsumosErp(insumosImportados.insumos);
        setServiciosErp(serviciosImportados.servicios);
        setEstado('Vinculaciones cargadas desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las vinculaciones.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron vinculaciones', mensaje });
      }
    }

    cargarDatos();
  }, [sesion.token, notificar]);

  const zonasErpPorId = useMemo(() => new Map(zonasErp.map((zona) => [zona.erpId, zona])), [zonasErp]);
  const camposErpPorId = useMemo(() => new Map(camposErp.map((campo) => [campo.erpId, campo])), [camposErp]);
  const lotesErpPorId = useMemo(() => new Map(lotesErp.map((lote) => [lote.erpId, lote])), [lotesErp]);
  const especiesErpPorId = useMemo(() => new Map(especiesErp.map((especie) => [especie.erpId, especie])), [especiesErp]);
  const actividadesErpPorId = useMemo(() => new Map(actividadesErp.map((actividad) => [actividad.erpId, actividad])), [actividadesErp]);
  const insumosErpPorId = useMemo(() => new Map(insumosErp.map((insumo) => [insumo.erpId, insumo])), [insumosErp]);
  const serviciosErpPorId = useMemo(() => new Map(serviciosErp.map((servicio) => [servicio.erpId, servicio])), [serviciosErp]);
  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const especiesPorId = useMemo(() => new Map(especies.map((especie) => [especie.id, especie])), [especies]);

  const filas = useMemo<VinculacionFila[]>(() => {
    const resultado: VinculacionFila[] = [];

    for (const zona of zonas.filter((item) => item.zonaErpId)) {
      const zonaErp = zonasErpPorId.get(zona.zonaErpId || '');
      resultado.push(crearFila('zonas', zona.id, 'Zonas', zona.nombre, zonaErp ? `${zonaErp.codigo} - ${zonaErp.nombre}` : zona.zonaErpId || '-', 'Global', zona.updatedAt));
    }

    for (const campo of campos.filter((item) => item.campoErpId)) {
      const campoErp = camposErpPorId.get(campo.campoErpId || '');
      resultado.push(crearFila('campos', campo.id, 'Campos', campo.nombre, campoErp ? `${campoErp.codigo} - ${campoErp.nombre}` : campo.campoErpId || '-', campo.zonaErpId || 'Sin zona', campo.updatedAt));
    }

    for (const lote of lotes.filter((item) => item.loteErpId)) {
      const loteErp = lotesErpPorId.get(lote.loteErpId || '');
      const campo = camposPorId.get(lote.campoPlanificacionId);
      resultado.push(crearFila('lotes', lote.id, 'Lotes', lote.nombre, loteErp ? `${loteErp.codigo} - ${loteErp.nombre}` : lote.loteErpId || '-', campo?.nombre || 'Campo no disponible', lote.updatedAt));
    }

    for (const especie of especies.filter((item) => item.especieErpId)) {
      const especieErp = especiesErpPorId.get(especie.especieErpId || '');
      resultado.push(crearFila('especies', especie.id, 'Especies', especie.nombre, especieErp ? `${especieErp.codigo} - ${especieErp.nombre}` : especie.especieErpId || '-', 'Global', especie.updatedAt));
    }

    for (const actividad of actividades.filter((item) => item.actividadErpId)) {
      const actividadErp = actividadesErpPorId.get(actividad.actividadErpId || '');
      const especie = actividad.especiePlanificacionId ? especiesPorId.get(actividad.especiePlanificacionId)?.nombre : actividad.especieErpId;
      resultado.push(crearFila('actividades', actividad.id, 'Actividades', actividad.nombre, actividadErp ? `${actividadErp.codigo} - ${actividadErp.descripcion}` : actividad.actividadErpId || '-', especie || 'Sin especie', actividad.updatedAt));
    }

    for (const insumo of insumos.filter((item) => item.insumoErpId)) {
      const insumoErp = insumosErpPorId.get(insumo.insumoErpId || '');
      resultado.push(crearFila('insumos', insumo.id, 'Insumos', insumo.nombre, insumoErp ? `${insumoErp.codigo} - ${insumoErp.nombre}` : insumo.insumoErpId || '-', insumo.unidad, insumo.updatedAt));
    }

    for (const labor of labores.filter((item) => item.servicioErpId)) {
      const servicioErp = serviciosErpPorId.get(labor.servicioErpId || '');
      resultado.push(crearFila('labores', labor.id, 'Labores', labor.nombre, servicioErp ? `${servicioErp.codigo} - ${servicioErp.descripcion}` : labor.servicioErpId || '-', labor.unidadSugerida, labor.updatedAt));
    }

    return resultado.sort((a, b) => a.padron.localeCompare(b.padron, 'es') || a.propio.localeCompare(b.propio, 'es'));
  }, [actividades, actividadesErpPorId, campos, camposErpPorId, camposPorId, especies, especiesErpPorId, especiesPorId, insumos, insumosErpPorId, labores, lotes, lotesErpPorId, serviciosErpPorId, zonas, zonasErpPorId]);
  const filasFiltradas = tipoFiltro === 'todos' ? filas : filas.filter((fila) => fila.tipo === tipoFiltro);
  const opcionesEdicion = vinculacionEnEdicion ? obtenerOpcionesEdicion(vinculacionEnEdicion.fila) : [];

  function crearFila(tipo: TipoPadron, id: string, padron: string, propio: string, erp: string, detalle: string, actualizado?: string): VinculacionFila {
    return {
      id,
      tipo,
      padron,
      propio,
      erp,
      detalle,
      actualizado: formatearFecha(actualizado),
    };
  }

  function idsVinculados(tipo: TipoPadron, idActual: string) {
    if (tipo === 'zonas') {
      return new Set(zonas.filter((zona) => zona.id !== idActual).map((zona) => zona.zonaErpId).filter((id): id is string => Boolean(id)));
    }
    if (tipo === 'campos') {
      return new Set(campos.filter((campo) => campo.id !== idActual).map((campo) => campo.campoErpId).filter((id): id is string => Boolean(id)));
    }
    if (tipo === 'lotes') {
      return new Set(lotes.filter((lote) => lote.id !== idActual).map((lote) => lote.loteErpId).filter((id): id is string => Boolean(id)));
    }
    if (tipo === 'especies') {
      return new Set(especies.filter((especie) => especie.id !== idActual).map((especie) => especie.especieErpId).filter((id): id is string => Boolean(id)));
    }
    if (tipo === 'actividades') {
      return new Set(actividades.filter((actividad) => actividad.id !== idActual).map((actividad) => actividad.actividadErpId).filter((id): id is string => Boolean(id)));
    }
    if (tipo === 'insumos') {
      return new Set(insumos.filter((insumo) => insumo.id !== idActual).map((insumo) => insumo.insumoErpId).filter((id): id is string => Boolean(id)));
    }

    return new Set(labores.filter((labor) => labor.id !== idActual).map((labor) => labor.servicioErpId).filter((id): id is string => Boolean(id)));
  }

  function obtenerOpcionesEdicion(fila: VinculacionFila) {
    const usados = idsVinculados(fila.tipo, fila.id);

    if (fila.tipo === 'zonas') {
      return zonasErp.filter((zona) => !usados.has(zona.erpId)).map((zona) => ({ id: zona.erpId, label: `${zona.codigo} - ${zona.nombre}` }));
    }
    if (fila.tipo === 'campos') {
      return camposErp.filter((campo) => !usados.has(campo.erpId)).map((campo) => ({ id: campo.erpId, label: `${campo.codigo} - ${campo.nombre}` }));
    }
    if (fila.tipo === 'lotes') {
      return lotesErp.filter((lote) => !usados.has(lote.erpId)).map((lote) => ({ id: lote.erpId, label: `${lote.codigo} - ${lote.nombre}` }));
    }
    if (fila.tipo === 'especies') {
      return especiesErp.filter((especie) => !usados.has(especie.erpId)).map((especie) => ({ id: especie.erpId, label: `${especie.codigo} - ${especie.nombre}` }));
    }
    if (fila.tipo === 'actividades') {
      return actividadesErp.filter((actividad) => !usados.has(actividad.erpId)).map((actividad) => ({ id: actividad.erpId, label: `${actividad.codigo} - ${actividad.descripcion}` }));
    }
    if (fila.tipo === 'insumos') {
      return insumosErp.filter((insumo) => !usados.has(insumo.erpId)).map((insumo) => ({ id: insumo.erpId, label: `${insumo.codigo} - ${insumo.nombre}` }));
    }

    return serviciosErp.filter((servicio) => !usados.has(servicio.erpId)).map((servicio) => ({ id: servicio.erpId, label: `${servicio.codigo} - ${servicio.descripcion}` }));
  }

  function abrirEdicion(fila: VinculacionFila) {
    setVinculacionEnEdicion({ fila, destinoErpId: obtenerErpIdActual(fila) });
  }

  function obtenerErpIdActual(fila: VinculacionFila) {
    if (fila.tipo === 'zonas') return zonas.find((zona) => zona.id === fila.id)?.zonaErpId || '';
    if (fila.tipo === 'campos') return campos.find((campo) => campo.id === fila.id)?.campoErpId || '';
    if (fila.tipo === 'lotes') return lotes.find((lote) => lote.id === fila.id)?.loteErpId || '';
    if (fila.tipo === 'especies') return especies.find((especie) => especie.id === fila.id)?.especieErpId || '';
    if (fila.tipo === 'actividades') return actividades.find((actividad) => actividad.id === fila.id)?.actividadErpId || '';
    if (fila.tipo === 'insumos') return insumos.find((insumo) => insumo.id === fila.id)?.insumoErpId || '';
    return labores.find((labor) => labor.id === fila.id)?.servicioErpId || '';
  }

  async function guardarEdicion() {
    if (!vinculacionEnEdicion || !vinculacionEnEdicion.destinoErpId || !puedeConfigurarPlanificacion) {
      return;
    }

    await guardarVinculacion(vinculacionEnEdicion.fila, vinculacionEnEdicion.destinoErpId);
    setVinculacionEnEdicion(null);
  }

  async function desvincular(fila: VinculacionFila) {
    if (!puedeConfigurarPlanificacion) {
      return;
    }

    await guardarVinculacion(fila, undefined);
  }

  async function guardarVinculacion(fila: VinculacionFila, erpId?: string) {
    setGuardando(true);

    try {
      if (fila.tipo === 'zonas') {
        const zona = zonas.find((item) => item.id === fila.id);
        if (!zona) throw new Error('No se encontro la zona propia.');
        const respuesta = await guardarZonaPlanificacion(zona.id, { zona: { ...zona, zonaErpId: erpId, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con zona ERP ${erpId}` : 'Desvinculacion manual de zona ERP' }, sesion.token);
        setZonas((actuales) => actuales.map((item) => (item.id === respuesta.zona.id ? respuesta.zona : item)));
      } else if (fila.tipo === 'campos') {
        const campo = campos.find((item) => item.id === fila.id);
        const campoErp = erpId ? camposErpPorId.get(erpId) : undefined;
        if (!campo) throw new Error('No se encontro el campo propio.');
        const respuesta = await guardarCampoPlanificacion(campo.id, { campo: { ...campo, campoErpId: erpId, empresaErpId: campoErp?.empresaErpId || campo.empresaErpId, zonaErpId: erpId ? campoErp?.idZona ? `zona:${campoErp.idZona}` : campo.zonaErpId : campo.zonaErpId, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con campo ERP ${erpId}` : 'Desvinculacion manual de campo ERP' }, sesion.token);
        setCampos((actuales) => actuales.map((item) => (item.id === respuesta.campo.id ? respuesta.campo : item)));
      } else if (fila.tipo === 'lotes') {
        const lote = lotes.find((item) => item.id === fila.id);
        if (!lote) throw new Error('No se encontro el lote propio.');
        const respuesta = await guardarLotePlanificacion(lote.id, { lote: { ...lote, loteErpId: erpId, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con lote ERP ${erpId}` : 'Desvinculacion manual de lote ERP' }, sesion.token);
        setLotes((actuales) => actuales.map((item) => (item.id === respuesta.lote.id ? respuesta.lote : item)));
      } else if (fila.tipo === 'especies') {
        const especie = especies.find((item) => item.id === fila.id);
        if (!especie) throw new Error('No se encontro la especie propia.');
        const respuesta = await guardarEspeciePlanificacion(especie.id, { especie: { ...especie, especieErpId: erpId, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con especie ERP ${erpId}` : 'Desvinculacion manual de especie ERP' }, sesion.token);
        setEspecies((actuales) => actuales.map((item) => (item.id === respuesta.especie.id ? respuesta.especie : item)));
      } else if (fila.tipo === 'actividades') {
        const actividad = actividades.find((item) => item.id === fila.id);
        const actividadErp = erpId ? actividadesErpPorId.get(erpId) : undefined;
        if (!actividad) throw new Error('No se encontro la actividad propia.');
        const respuesta = await guardarActividadPlanificacion(actividad.id, { actividad: { ...actividad, actividadErpId: erpId, especieErpId: erpId ? actividadErp?.idEspecie ? `especie:${actividadErp.idEspecie}` : actividad.especieErpId : actividad.especieErpId, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con actividad ERP ${erpId}` : 'Desvinculacion manual de actividad ERP' }, sesion.token);
        setActividades((actuales) => actuales.map((item) => (item.id === respuesta.actividad.id ? respuesta.actividad : item)));
      } else if (fila.tipo === 'insumos') {
        const insumo = insumos.find((item) => item.id === fila.id);
        if (!insumo) throw new Error('No se encontro el insumo propio.');
        const respuesta = await guardarInsumoPlanificacion(insumo.id, { insumo: { ...insumo, insumoErpId: erpId, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con insumo ERP ${erpId}` : 'Desvinculacion manual de insumo ERP' }, sesion.token);
        setInsumos((actuales) => actuales.map((item) => (item.id === respuesta.insumo.id ? respuesta.insumo : item)));
      } else {
        const labor = labores.find((item) => item.id === fila.id);
        if (!labor) throw new Error('No se encontro la labor propia.');
        const respuesta = await guardarLaborReferencia(labor.id, { labor: { ...labor, servicioErpId: erpId, idServicio: erpId ? labor.idServicio : undefined, idTipoServicio: erpId ? labor.idTipoServicio : undefined, idUnidadMedida: erpId ? labor.idUnidadMedida : undefined, idMoneda: erpId ? labor.idMoneda : undefined, imputaDosis: erpId ? labor.imputaDosis : undefined, fechaUltimaActualizacionErp: erpId ? labor.fechaUltimaActualizacionErp : undefined, estadoVinculacion: erpId ? 'vinculado_erp' : 'provisorio', origen: erpId ? 'erp' : 'provisorio', updatedAt: new Date().toISOString() }, origen: 'web', motivo: erpId ? `Edicion de vinculacion con servicio ERP ${erpId}` : 'Desvinculacion manual de servicio ERP' }, sesion.token);
        setLabores((actuales) => actuales.map((item) => (item.id === respuesta.labor.id ? respuesta.labor : item)));
      }

      await onVinculacionesActualizadas?.();
      setEstado(erpId ? 'Vinculacion actualizada con auditoria.' : 'Vinculacion eliminada con auditoria.');
      notificar?.({ tipo: 'success', titulo: erpId ? 'Vinculacion actualizada' : 'Vinculacion eliminada', mensaje: 'El cambio quedo registrado en auditoria.' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo actualizar la vinculacion.';
      notificar?.({ tipo: 'error', titulo: 'No se actualizo la vinculacion', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="planning-stack">
      <section className="metrics">
        <article><span>Vinculaciones</span><strong>{filas.length}</strong></article>
        <article><span>Zonas</span><strong>{zonas.filter((item) => item.zonaErpId).length}</strong></article>
        <article><span>Campos</span><strong>{campos.filter((item) => item.campoErpId).length}</strong></article>
        <article><span>Lotes</span><strong>{lotes.filter((item) => item.loteErpId).length}</strong></article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Vinculaciones ERP</h2>
            <p className="hint">{estado}</p>
          </div>
          <label className="compact-field">
            Padron
            <select value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value as TipoPadron | 'todos')}>
              <option value="todos">Todos</option>
              <option value="zonas">Zonas</option>
              <option value="campos">Campos</option>
              <option value="lotes">Lotes</option>
              <option value="especies">Especies</option>
              <option value="actividades">Actividades</option>
              <option value="insumos">Insumos</option>
              <option value="labores">Labores</option>
            </select>
          </label>
        </div>

        <DataTable
          rows={filasFiltradas}
          getRowKey={(fila) => `${fila.tipo}:${fila.id}`}
          emptyMessage="Todavia no hay vinculaciones para mostrar."
          initialPageSize={25}
          columns={[
            { key: 'padron', label: 'Padron', width: 'minmax(110px, 0.7fr)', render: (fila) => fila.padron },
            { key: 'propio', label: 'Registro Agro App', width: 'minmax(180px, 1.2fr)', render: (fila) => <><strong>{fila.propio}</strong><span>{fila.detalle}</span></> },
            { key: 'erp', label: 'Registro ERP', width: 'minmax(220px, 1.4fr)', render: (fila) => fila.erp },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(96px, 0.55fr)', render: (fila) => fila.actualizado },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(170px, 0.8fr)',
              render: (fila) => (
                <div className="button-row table-actions">
                  <button className="small" type="button" disabled={!puedeConfigurarPlanificacion || guardando} onClick={() => abrirEdicion(fila)}>Editar</button>
                  <button className="small" type="button" disabled={!puedeConfigurarPlanificacion || guardando} onClick={() => desvincular(fila)}>Desvincular</button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {vinculacionEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="editar-vinculacion-title">
            <div className="modal-header">
              <div>
                <h2 id="editar-vinculacion-title">Editar vinculacion</h2>
                <p className="hint">El cambio reemplaza la referencia ERP asociada y queda registrado en auditoria.</p>
              </div>
              <button className="ghost" type="button" onClick={() => setVinculacionEnEdicion(null)}>Cerrar</button>
            </div>
            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>{vinculacionEnEdicion.fila.padron}</span>
                <strong>{vinculacionEnEdicion.fila.propio}</strong>
                <span>{vinculacionEnEdicion.fila.erp}</span>
              </div>
              <label className="reference-wide">
                Nueva referencia ERP
                <select value={vinculacionEnEdicion.destinoErpId} onChange={(event) => setVinculacionEnEdicion((actual) => actual && { ...actual, destinoErpId: event.target.value })}>
                  {opcionesEdicion.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.label}</option>)}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">Si el registro correcto no aparece, revisa que este sincronizado desde ALBOR y no este vinculado a otro registro.</span>
              <button className="primary" type="button" disabled={guardando || !vinculacionEnEdicion.destinoErpId} onClick={guardarEdicion}>
                <span className="button-content">{guardando && <LoadingSpinner label="Guardando vinculacion" />}{guardando ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
