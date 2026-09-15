import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, ErpCampo, ErpEmpresa, ErpLote, LoteApp, LoteArchivoGeografico, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { OriginBadge } from '../components/OriginBadge';
import { Panel } from '../components/Panel';
import {
  guardarCampoApp,
  guardarArchivoGeograficoLote,
  guardarLoteApp,
  crearUrlSubidaArchivoGeograficoLote,
  obtenerArchivosGeograficosLote,
  obtenerCamposErpImportados,
  obtenerCamposApp,
  obtenerLotesErpImportados,
  obtenerLotesApp,
  subirArchivoAFirmaSupabase,
} from '../services/api';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type LotesScreenProps = {
  sesion: SesionUsuario;
  empresas: ErpEmpresa[];
  camposPropios: CampoApp[];
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type CampoSeleccionable = {
  clave: string;
  campoAppId?: string;
  campoErpId?: string;
  empresaErpId: string;
  codigo?: string;
  nombre: string;
  origen: 'agro' | 'erp';
};

type LoteTabla = {
  id: string;
  nombre: string;
  detalle: string;
  campo: string;
  superficie: string;
  origen: string;
  estado: string;
  accion: 'editar' | 'importado';
  lotePropio?: LoteApp;
  loteErp?: ErpLote;
};

type PuntoGeo = [number, number] | [number, number, number];
type GeometriaGeoJson =
  | { type: 'Point'; coordinates: PuntoGeo }
  | { type: 'LineString'; coordinates: PuntoGeo[] }
  | { type: 'Polygon'; coordinates: PuntoGeo[][] };
type FeatureGeoJson = { type: 'Feature'; geometry?: GeometriaGeoJson | null };
type FeatureCollectionGeoJson = { type: 'FeatureCollection'; features: FeatureGeoJson[] };

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function leerNumeroPositivo(valor: string) {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function crearLoteNuevo(clienteId: string, campoAppId: string): LoteApp {
  const ahora = new Date().toISOString();

  return {
    id: `lote-app-${Date.now()}`,
    clienteId,
    campoAppId,
    nombre: '',
    codigoInterno: '',
    superficieTotal: 0,
    superficieProductiva: 0,
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

function crearIdCampoDesdeErp(campoErpId: string) {
  return `campo-app-${campoErpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

function crearIdArchivoGeografico() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `lote-geo-${crypto.randomUUID()}`;
  }

  return `lote-geo-${Date.now()}`;
}

function obtenerMimeArchivoGeografico(archivo: File) {
  const nombre = archivo.name.toLowerCase();

  if (archivo.type) {
    return archivo.type;
  }

  if (nombre.endsWith('.kml')) {
    return 'application/vnd.google-earth.kml+xml';
  }

  if (nombre.endsWith('.kmz')) {
    return 'application/vnd.google-earth.kmz';
  }

  return 'application/octet-stream';
}

function obtenerTipoArchivoGeografico(archivo: File): LoteArchivoGeografico['tipo'] | undefined {
  const nombre = archivo.name.toLowerCase();

  if (nombre.endsWith('.kml')) {
    return 'kml';
  }

  if (nombre.endsWith('.kmz')) {
    return 'kmz';
  }

  return undefined;
}

function esPuntoGeo(valor: unknown): valor is PuntoGeo {
  return Array.isArray(valor)
    && valor.length >= 2
    && typeof valor[0] === 'number'
    && typeof valor[1] === 'number'
    && Number.isFinite(valor[0])
    && Number.isFinite(valor[1]);
}

function obtenerFeatureCollection(valor: unknown): FeatureCollectionGeoJson | undefined {
  if (!valor || typeof valor !== 'object') {
    return undefined;
  }

  const candidato = valor as { type?: unknown; features?: unknown };

  if (candidato.type !== 'FeatureCollection' || !Array.isArray(candidato.features)) {
    return undefined;
  }

  return candidato as FeatureCollectionGeoJson;
}

function obtenerPuntosGeometria(geometria: GeometriaGeoJson) {
  if (geometria.type === 'Point') {
    return [geometria.coordinates].filter(esPuntoGeo);
  }

  if (geometria.type === 'LineString') {
    return geometria.coordinates.filter(esPuntoGeo);
  }

  return geometria.coordinates.flat().filter(esPuntoGeo);
}

function crearProyectorGeoJson(features: FeatureGeoJson[]) {
  const puntos = features.flatMap((feature) => feature.geometry ? obtenerPuntosGeometria(feature.geometry) : []);

  if (!puntos.length) {
    return undefined;
  }

  const lons = puntos.map((punto) => punto[0]);
  const lats = puntos.map((punto) => punto[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const ancho = Math.max(maxLon - minLon, 0.000001);
  const alto = Math.max(maxLat - minLat, 0.000001);
  const padding = 12;
  const viewport = 200 - padding * 2;

  return (punto: PuntoGeo) => {
    const x = padding + ((punto[0] - minLon) / ancho) * viewport;
    const y = padding + ((maxLat - punto[1]) / alto) * viewport;

    return [x, y] as const;
  };
}

function crearPathLinea(puntos: PuntoGeo[], proyectar: (punto: PuntoGeo) => readonly [number, number]) {
  return puntos
    .filter(esPuntoGeo)
    .map((punto, indice) => {
      const [x, y] = proyectar(punto);

      return `${indice === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function LoteGeoPreview({ archivo }: { archivo: LoteArchivoGeografico }) {
  const geoJson = obtenerFeatureCollection(archivo.geometriaGeoJson);

  if (!geoJson || !geoJson.features.length) {
    return (
      <div className="geo-preview geo-preview-empty">
        {archivo.estado === 'rechazado' ? archivo.observaciones || 'Archivo rechazado.' : 'Sin geometria procesada.'}
      </div>
    );
  }

  const proyectar = crearProyectorGeoJson(geoJson.features);

  if (!proyectar) {
    return <div className="geo-preview geo-preview-empty">Sin coordenadas visibles.</div>;
  }

  return (
    <div className="geo-preview" aria-label={`Vista previa geografica de ${archivo.nombreArchivo}`}>
      <svg viewBox="0 0 200 200" role="img" aria-hidden="true">
        <rect x="1" y="1" width="198" height="198" rx="10" />
        {geoJson.features.map((feature, indiceFeature) => {
          const geometria = feature.geometry;

          if (!geometria) {
            return null;
          }

          if (geometria.type === 'Point' && esPuntoGeo(geometria.coordinates)) {
            const [x, y] = proyectar(geometria.coordinates);

            return <circle key={indiceFeature} cx={x} cy={y} r="3.5" />;
          }

          if (geometria.type === 'LineString') {
            const path = crearPathLinea(geometria.coordinates, proyectar);

            return path ? <path key={indiceFeature} d={path} /> : null;
          }

          if (geometria.type !== 'Polygon') {
            return null;
          }

          return geometria.coordinates.map((anillo, indiceAnillo) => {
            const path = crearPathLinea(anillo, proyectar);

            return path ? <path key={`${indiceFeature}-${indiceAnillo}`} d={`${path} Z`} className={indiceAnillo === 0 ? 'geo-polygon' : 'geo-hole'} /> : null;
          });
        })}
      </svg>
    </div>
  );
}

export function LotesScreen({ sesion, empresas, camposPropios, puedeConfigurarPlanificacion, notificar }: LotesScreenProps) {
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [camposPropiosActuales, setCamposPropiosActuales] = useState<CampoApp[]>(camposPropios);
  const [lotesPropios, setLotesPropios] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando lotes sincronizados.');
  const [guardando, setGuardando] = useState(false);
  const [loteEnEdicion, setLoteEnEdicion] = useState<LoteApp | null>(null);
  const [modoFormulario, setModoFormulario] = useState<'crear' | 'editar' | 'copiar'>('crear');
  const [lotePropioParaVincular, setLotePropioParaVincular] = useState<LoteApp | null>(null);
  const [loteArchivosGeograficos, setLoteArchivosGeograficos] = useState<LoteApp | null>(null);
  const [archivosGeograficos, setArchivosGeograficos] = useState<LoteArchivoGeografico[]>([]);
  const [archivoGeograficoSeleccionado, setArchivoGeograficoSeleccionado] = useState<File | null>(null);
  const [loteErpVincularId, setLoteErpVincularId] = useState('');
  const [campoSeleccionadoClave, setCampoSeleccionadoClave] = useState('');
  const [filtroCampoClave, setFiltroCampoClave] = useState('');
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function cargarLotes() {
      try {
        const [respuestaLotesErp, respuestaCamposErp, respuestaCamposPropios, respuestaLotesPropios] = await Promise.all([
          obtenerLotesErpImportados(sesion.token),
          obtenerCamposErpImportados(sesion.token),
          obtenerCamposApp(sesion.token),
          obtenerLotesApp(sesion.token),
        ]);

        setLotesErp(respuestaLotesErp.lotes);
        setCamposErp(respuestaCamposErp.campos);
        setCamposPropiosActuales(respuestaCamposPropios.campos);
        setLotesPropios(respuestaLotesPropios.lotes);
        setEstado('Lotes cargados desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron lotes', mensaje });
      }
    }

    cargarLotes();
  }, [sesion.token, notificar]);

  const empresasPorId = useMemo(() => new Map(empresas.map((empresa) => [empresa.erpId, empresa])), [empresas]);
  const camposPropiosPorId = useMemo(() => new Map(camposPropiosActuales.map((campo) => [campo.id, campo])), [camposPropiosActuales]);
  const camposErpPorId = useMemo(() => new Map(camposErp.map((campo) => [campo.erpId, campo])), [camposErp]);
  const camposVinculados = useMemo(() => new Set(camposPropiosActuales.map((campo) => campo.campoErpId).filter(Boolean)), [camposPropiosActuales]);
  const camposSeleccionables = useMemo<CampoSeleccionable[]>(() => {
    const propios = camposPropiosActuales.map((campo) => ({
      clave: `agro:${campo.id}`,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigoInterno,
      nombre: campo.nombre,
      origen: 'agro' as const,
    }));
    const importados = camposErp
      .filter((campo) => !camposVinculados.has(campo.erpId))
      .map((campo) => ({
        clave: `erp:${campo.erpId}`,
        campoErpId: campo.erpId,
        empresaErpId: campo.empresaErpId,
        codigo: campo.codigo,
        nombre: campo.nombre,
        origen: 'erp' as const,
      }));

    return [...propios, ...importados].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposErp, camposPropiosActuales, camposVinculados]);
  const camposSeleccionablesPorClave = useMemo(
    () => new Map(camposSeleccionables.map((campo) => [campo.clave, campo])),
    [camposSeleccionables],
  );
  const camposParaFiltrar = useMemo<CampoSeleccionable[]>(() => {
    const propios = camposPropiosActuales.map((campo) => ({
      clave: `agro:${campo.id}`,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigoInterno,
      nombre: campo.nombre,
      origen: 'agro' as const,
    }));
    const importados = camposErp.map((campo) => ({
      clave: `erp:${campo.erpId}`,
      campoErpId: campo.erpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigo,
      nombre: campo.nombre,
      origen: 'erp' as const,
    }));

    return [...propios, ...importados].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposErp, camposPropiosActuales]);
  const camposParaFiltrarPorClave = useMemo(
    () => new Map(camposParaFiltrar.map((campo) => [campo.clave, campo])),
    [camposParaFiltrar],
  );
  const lotesVinculados = useMemo(() => new Set(lotesPropios.map((lote) => lote.loteErpId).filter(Boolean)), [lotesPropios]);
  const lotesErpDisponiblesParaVincular = useMemo(() => {
    if (!lotePropioParaVincular) {
      return [];
    }

    const campoPropio = camposPropiosPorId.get(lotePropioParaVincular.campoAppId);

    return lotesErp
      .filter((lote) => !lotesVinculados.has(lote.erpId))
      .filter((lote) => !campoPropio?.campoErpId || campoPropio.campoErpId === lote.campoErpId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposPropiosPorId, lotePropioParaVincular, lotesErp, lotesVinculados]);
  const lotesErpSugeridosParaVincular = useMemo(() => (
    lotePropioParaVincular
      ? sugerirVinculacion(
        { codigo: lotePropioParaVincular.codigoInterno, nombre: lotePropioParaVincular.nombre },
        lotesErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.nombre,
      )
      : []
  ), [lotePropioParaVincular, lotesErpDisponiblesParaVincular]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const campoFiltrado = filtroCampoClave ? camposParaFiltrarPorClave.get(filtroCampoClave) : undefined;
  const lotesErpFiltrados = lotesErp.filter((lote) => {
    const campo = camposErpPorId.get(lote.campoErpId);
    const texto = normalizarCodigo(`${lote.codigo} ${lote.nombre} ${campo?.nombre || ''} ${empresasPorId.get(lote.empresaErpId)?.nombre || lote.empresaErpId}`);
    const coincideCampo = !campoFiltrado || lote.campoErpId === campoFiltrado.campoErpId;

    return texto.includes(filtroNormalizado) && coincideCampo;
  });
  const lotesPropiosFiltrados = lotesPropios.filter((lote) => !lote.loteErpId).filter((lote) => {
    const campo = camposPropiosPorId.get(lote.campoAppId);
    const texto = normalizarCodigo(`${lote.codigoInterno || ''} ${lote.nombre} ${campo?.nombre || ''}`);
    const coincideCampo = !campoFiltrado
      || lote.campoAppId === campoFiltrado.campoAppId
      || Boolean(campoFiltrado.campoErpId && campo?.campoErpId === campoFiltrado.campoErpId);

    return texto.includes(filtroNormalizado) && coincideCampo;
  });
  const filasLote: LoteTabla[] = [
    ...lotesPropiosFiltrados.map((lote) => {
      const campo = camposPropiosPorId.get(lote.campoAppId);

      return {
        id: lote.id,
        nombre: lote.nombre,
        detalle: lote.codigoInterno || 'Sin codigo interno',
        campo: campo?.nombre || 'Campo no disponible',
        superficie: `${lote.superficieProductiva} / ${lote.superficieTotal} ha`,
        origen: 'Agro App',
        estado: lote.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP',
        accion: 'editar' as const,
        lotePropio: lote,
      };
    }),
    ...lotesErpFiltrados.map((lote) => {
      const campo = camposErpPorId.get(lote.campoErpId);

      return {
        id: lote.erpId,
        nombre: lote.nombre,
        detalle: `${lote.codigo} - x-company ${lote.empresaErpId.replace('empresa:', '')}`,
        campo: campo?.nombre || `Campo ${lote.idCampo}`,
        superficie: `${lote.hectareasProductivas ?? lote.areaHectareas} / ${lote.areaHectareas} ha`,
        origen: 'ERP',
        estado: lotesVinculados.has(lote.erpId) ? 'Vinculado' : 'Disponible',
        accion: 'importado' as const,
        loteErp: lote,
      };
    }),
  ];

  function abrirNuevoLote() {
    const campoSugerido = camposSeleccionables[0];

    if (!campoSugerido) {
      notificar?.({
        tipo: 'info',
        titulo: 'Primero falta un campo',
        mensaje: 'Para crear un lote propio, antes sincroniza campos ERP o crea un campo en Padrones > Campos.',
      });
      return;
    }

    setModoFormulario('crear');
    setCampoSeleccionadoClave(campoSugerido.clave);
    setLoteEnEdicion(crearLoteNuevo(sesion.usuario.clienteId || 'cliente-demo', campoSugerido.campoAppId || ''));
  }

  function editarLote(lote: LoteApp) {
    setModoFormulario('editar');
    setCampoSeleccionadoClave(`agro:${lote.campoAppId}`);
    setLoteEnEdicion(lote);
  }

  function copiarLote(lote: LoteApp) {
    const ahora = new Date().toISOString();

    setModoFormulario('copiar');
    setCampoSeleccionadoClave(`agro:${lote.campoAppId}`);
    setLoteEnEdicion({
      ...lote,
      id: `lote-app-${Date.now()}`,
      loteErpId: undefined,
      nombre: lote.nombre,
      codigoInterno: lote.codigoInterno ? `${lote.codigoInterno}-COPIA` : '',
      estadoVinculacion: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    });
  }

  function copiarLoteErp(lote: ErpLote) {
    const campoErp = camposErpPorId.get(lote.campoErpId);
    const campoClave = `erp:${lote.campoErpId}`;
    const ahora = new Date().toISOString();

    setModoFormulario('copiar');
    setCampoSeleccionadoClave(campoClave);
    setLoteEnEdicion({
      id: `lote-app-${Date.now()}`,
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      campoAppId: '',
      loteErpId: undefined,
      nombre: lote.nombre,
      //codigoInterno: lote.codigo ? `${normalizarCodigo(lote.codigo)}-COPIA` : '',
      codigoInterno: '',
      superficieTotal: 0,
      superficieProductiva: 0,
      estadoVinculacion: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    });

    if (!campoErp) {
      notificar?.({
        tipo: 'info',
        titulo: 'Campo ERP pendiente',
        mensaje: 'Al guardar se validara que el campo del lote exista como campo operativo.',
      });
    }
  }

  function abrirVinculacion(lote: LoteApp) {
    const campoPropio = camposPropiosPorId.get(lote.campoAppId);
    const candidatos = sugerirVinculacion(
      { codigo: lote.codigoInterno, nombre: lote.nombre },
      lotesErp
        .filter((loteErp) => !lotesVinculados.has(loteErp.erpId))
        .filter((loteErp) => !campoPropio?.campoErpId || campoPropio.campoErpId === loteErp.campoErpId),
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );

    if (lote.estadoVinculacion !== 'provisorio' || lote.loteErpId) {
      notificar?.({
        tipo: 'info',
        titulo: 'Lote no vinculable',
        mensaje: 'Solo se pueden vincular lotes propios en estado provisorio.',
      });
      return;
    }

    if (!candidatos.length) {
      notificar?.({
        tipo: 'info',
        titulo: 'No hay lote ERP compatible',
        mensaje: 'No se encontro un lote ERP disponible para vincular con este lote provisorio.',
      });
      return;
    }

    setLotePropioParaVincular(lote);
    setLoteErpVincularId(candidatos[0].registro.erpId);
  }

  async function confirmarVinculacionLote() {
    if (!lotePropioParaVincular || !loteErpVincularId) {
      return;
    }

    const loteErp = lotesErp.find((lote) => lote.erpId === loteErpVincularId);

    if (!loteErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro el lote ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await guardarLoteApp(lotePropioParaVincular.id, {
        lote: {
          ...lotePropioParaVincular,
          loteErpId: loteErp.erpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con lote ERP ${loteErp.erpId}`,
      }, sesion.token);

      setLotesPropios((actuales) => actuales.map((lote) => (lote.id === respuesta.lote.id ? respuesta.lote : lote)));
      setLotePropioParaVincular(null);
      setLoteErpVincularId('');
      setEstado('Lote vinculado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Lote vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el lote.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo el lote', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  async function abrirArchivosGeograficos(lote: LoteApp) {
    setLoteArchivosGeograficos(lote);
    setArchivoGeograficoSeleccionado(null);
    setArchivosGeograficos([]);
    setGuardando(true);

    try {
      const respuesta = await obtenerArchivosGeograficosLote(lote.id, sesion.token);
      setArchivosGeograficos(respuesta.archivos);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los archivos geograficos.';
      notificar?.({ tipo: 'error', titulo: 'No se cargaron archivos', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  async function subirArchivoGeografico() {
    if (!loteArchivosGeograficos || !archivoGeograficoSeleccionado) {
      return;
    }

    const tipo = obtenerTipoArchivoGeografico(archivoGeograficoSeleccionado);
    const mimeType = obtenerMimeArchivoGeografico(archivoGeograficoSeleccionado);

    if (!tipo) {
      notificar?.({ tipo: 'error', titulo: 'Archivo invalido', mensaje: 'Solo se permiten archivos .kml o .kmz.' });
      return;
    }

    setGuardando(true);

    try {
      const urlSubida = await crearUrlSubidaArchivoGeograficoLote(loteArchivosGeograficos.id, {
        nombreArchivo: archivoGeograficoSeleccionado.name,
        mimeType,
        tamanioBytes: archivoGeograficoSeleccionado.size,
      }, sesion.token);
      const archivoParaSubir = archivoGeograficoSeleccionado.type
        ? archivoGeograficoSeleccionado
        : new File([archivoGeograficoSeleccionado], archivoGeograficoSeleccionado.name, { type: mimeType });

      await subirArchivoAFirmaSupabase(urlSubida.signedUploadUrl, archivoParaSubir);

      const ahora = new Date().toISOString();
      const respuesta = await guardarArchivoGeograficoLote(loteArchivosGeograficos.id, {
        archivo: {
          id: crearIdArchivoGeografico(),
          clienteId: sesion.usuario.clienteId || 'cliente-demo',
          loteAppId: loteArchivosGeograficos.id,
          nombreArchivo: archivoGeograficoSeleccionado.name,
          tipo,
          mimeType,
          tamanioBytes: archivoGeograficoSeleccionado.size,
          storageBucket: urlSubida.storageBucket,
          storagePath: urlSubida.storagePath,
          estado: 'pendiente_procesamiento',
          esPrincipal: archivosGeograficos.length === 0,
          createdAt: ahora,
          updatedAt: ahora,
        },
        origen: 'web',
        motivo: 'Vinculacion de archivo geografico KML/KMZ al lote',
      }, sesion.token);

      setArchivosGeograficos((actuales) => [respuesta.archivo, ...actuales]);
      setArchivoGeograficoSeleccionado(null);
      notificar?.({ tipo: 'success', titulo: 'Archivo vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el archivo geografico.';
      notificar?.({ tipo: 'error', titulo: 'No se subio el archivo', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  function seleccionarCampo(clave: string) {
    const campo = camposSeleccionablesPorClave.get(clave);

    setCampoSeleccionadoClave(clave);
    setLoteEnEdicion((actual) => actual && {
      ...actual,
      campoAppId: campo?.campoAppId || '',
    });
  }

  async function obtenerCampoAppParaGuardar() {
    const campoSeleccionado = camposSeleccionablesPorClave.get(campoSeleccionadoClave);

    if (!campoSeleccionado) {
      return undefined;
    }

    if (campoSeleccionado.campoAppId) {
      return camposPropiosPorId.get(campoSeleccionado.campoAppId);
    }

    if (!campoSeleccionado.campoErpId) {
      return undefined;
    }

    const existente = camposPropiosActuales.find((campo) => campo.campoErpId === campoSeleccionado.campoErpId);

    if (existente) {
      return existente;
    }

    const campoErp = camposErpPorId.get(campoSeleccionado.campoErpId);

    if (!campoErp) {
      return undefined;
    }

    const ahora = new Date().toISOString();
    const campoPreparado: CampoApp = {
      id: crearIdCampoDesdeErp(campoErp.erpId),
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      empresaErpId: campoErp.empresaErpId,
      campoErpId: campoErp.erpId,
      nombre: campoErp.nombre,
      codigoInterno: normalizarCodigo(campoErp.codigo),
      zonaErpId: campoErp.idZona ? `zona:${campoErp.idZona}` : undefined,
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const respuesta = await guardarCampoApp(campoPreparado.id, {
      campo: campoPreparado,
      origen: 'web',
      motivo: 'Creacion automatica de campo operativo vinculado desde alta de lote',
    }, sesion.token);

    setCamposPropiosActuales((actuales) => [respuesta.campo, ...actuales]);
    setCampoSeleccionadoClave(`agro:${respuesta.campo.id}`);

    return respuesta.campo;
  }

  async function guardarLote() {
    if (!loteEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(loteEnEdicion.nombre);

    const superficieTotal = loteEnEdicion.superficieTotal;
    const superficieProductiva = loteEnEdicion.superficieProductiva;

    if (!nombre) {
      notificar?.({ tipo: 'error', titulo: 'Lote incompleto', mensaje: 'El nombre del lote es obligatorio.' });
      return;
    }

    if (superficieTotal <= 0 || superficieProductiva <= 0) {
      notificar?.({ tipo: 'error', titulo: 'Lote incompleto', mensaje: 'Las superficies del lote son obligatorias.' });
      return;
    }


    if (loteEnEdicion.superficieProductiva > loteEnEdicion.superficieTotal) {
      notificar?.({ tipo: 'error', titulo: 'Superficie invalida', mensaje: 'La superficie productiva no puede superar la superficie total.' });
      return;
    }

    const lotePreparado: LoteApp = {
      ...loteEnEdicion,
      nombre,
      codigoInterno: loteEnEdicion.codigoInterno ? normalizarCodigo(loteEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const campoParaGuardar = await obtenerCampoAppParaGuardar();

      if (!campoParaGuardar) {
        throw new Error('Selecciona un campo valido para el lote.');
      }

      const respuesta = await guardarLoteApp(lotePreparado.id, {
        lote: {
          ...lotePreparado,
          campoAppId: campoParaGuardar.id,
        },
        origen: 'web',
        motivo: 'Alta o edicion de lote desde padron maestro web',
      }, sesion.token);

      setLotesPropios((actuales) => {
        const existe = actuales.some((lote) => lote.id === respuesta.lote.id);
        return existe
          ? actuales.map((lote) => (lote.id === respuesta.lote.id ? respuesta.lote : lote))
          : [respuesta.lote, ...actuales];
      });
      setLoteEnEdicion(null);
      setEstado('Lote guardado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Lote guardado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el lote.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo el lote', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article>
          <span>ERP sincronizados</span>
          <strong>{lotesErp.length}</strong>
        </article>
        <article>
          <span>Propios Agro App</span>
          <strong>{lotesPropios.length}</strong>
        </article>
        <article>
          <span>Provisorios</span>
          <strong>{lotesPropios.filter((lote) => lote.estadoVinculacion === 'provisorio').length}</strong>
        </article>
        <article>
          <span>Vinculados</span>
          <strong>{lotesPropios.filter((lote) => lote.estadoVinculacion === 'vinculado_erp').length}</strong>
        </article>
      </section>

      <Panel
        title="Lotes"
        description={estado}
        actions={(
          <ActionBar align="end">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo, lote, campo o empresa" />
            </label>
            <label className="compact-field">
              Campo
              <select value={filtroCampoClave} onChange={(event) => setFiltroCampoClave(event.target.value)}>
                <option value="">Todos</option>
                {camposParaFiltrar.map((campo) => (
                  <option key={campo.clave} value={campo.clave}>
                    {campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevoLote}>
              Nuevo lote
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={filasLote}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay lotes para el filtro seleccionado."
          initialPageSize={25}
          columns={[
            { key: 'lote', label: 'Lote', width: 'minmax(190px, 1.35fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'campo', label: 'Campo', width: 'minmax(150px, 1fr)', render: (fila) => fila.campo },
            { key: 'superficie', label: 'Superficie', width: 'minmax(110px, 0.75fr)', render: (fila) => fila.superficie },
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.7fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(190px, 0.85fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton icon="edit" label={`Editar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && editarLote(fila.lotePropio)} />
                    <IconButton icon="copy" label={`Copiar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && copiarLote(fila.lotePropio)} />
                    <IconButton icon="map" label={`Archivos geograficos de ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && abrirArchivosGeograficos(fila.lotePropio)} />
                    {fila.lotePropio?.estadoVinculacion === 'provisorio' && (
                      <IconButton icon="link" label={`Vincular lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && abrirVinculacion(fila.lotePropio)} />
                    )}
                  </div>
                )
                : (
                  <div className="table-icon-actions">
                    <IconButton icon="copy" label={`Copiar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion || !fila.loteErp} onClick={() => fila.loteErp && copiarLoteErp(fila.loteErp)} />
                  </div>
                ),
            },
          ]}
        />
      </Panel>

      {loteEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel">
            <div className="modal-header">
              <div>
                <h2>{modoFormulario === 'editar' ? 'Editar lote' : modoFormulario === 'copiar' ? 'Copiar lote' : 'Nuevo lote'}</h2>
                <p className="hint">Los lotes propios permiten planificar aunque todavia no existan en ALBOR.</p>
              </div>
              <Button variant="ghost" onClick={() => setLoteEnEdicion(null)}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <label className="reference-wide">
                Campo
                <select
                  value={campoSeleccionadoClave || `agro:${loteEnEdicion.campoAppId}`}
                  onChange={(event) => seleccionarCampo(event.target.value)}
                >
                  {camposSeleccionables.map((campo) => (
                    <option key={campo.clave} value={campo.clave}>
                      {campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Codigo interno
                <input
                  value={loteEnEdicion.codigoInterno || ''}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, codigoInterno: event.target.value })}
                  placeholder="Se normaliza en mayusculas"
                />
              </label>
              <label className="reference-wide">
                Nombre
                <input
                  value={loteEnEdicion.nombre}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, nombre: event.target.value })}
                  placeholder="Nombre del lote"
                />
              </label>
              <label>
                Superficie total
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={loteEnEdicion.superficieTotal}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, superficieTotal: leerNumeroPositivo(event.target.value) })}
                />
              </label>
              <label>
                Superficie productiva
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={loteEnEdicion.superficieProductiva}
                  onChange={(event) => setLoteEnEdicion((actual) => actual && { ...actual, superficieProductiva: leerNumeroPositivo(event.target.value) })}
                />
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">{modoFormulario === 'copiar' ? 'La copia se guarda como lote provisorio nuevo y queda lista para ajustar nombre o codigo.' : 'La vinculacion con ERP quedara como accion separada, propuesta y auditada.'}</span>
              <Button variant="primary" disabled={guardando} onClick={guardarLote}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Guardar
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {lotePropioParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-lote-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-lote-title">Vincular lote provisorio</h2>
                <p className="hint">La vinculacion no modifica los datos historicos de planificacion; solo enlaza el lote propio con el identificador ERP.</p>
              </div>
              <Button variant="ghost" onClick={() => { setLotePropioParaVincular(null); setLoteErpVincularId(''); }}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Lote provisorio</span>
                <strong>{lotePropioParaVincular.nombre}</strong>
                <span>{lotePropioParaVincular.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <label className="reference-wide">
                Lote ERP disponible
                <select value={loteErpVincularId} onChange={(event) => setLoteErpVincularId(event.target.value)}>
                  {lotesErpSugeridosParaVincular.map(({ registro, motivo }) => {
                    const campo = camposErpPorId.get(registro.campoErpId);

                    return (
                      <option key={registro.erpId} value={registro.erpId}>
                        {registro.codigo ? `${registro.codigo} - ` : ''}{registro.nombre} ({campo?.nombre || `Campo ${registro.idCampo}`}; {motivo})
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <span className="hint">El backend valida que el lote ERP exista y que no este vinculado a otro lote del cliente.</span>
              <Button variant="primary" disabled={guardando || !loteErpVincularId} onClick={confirmarVinculacionLote}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Vincular
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {loteArchivosGeograficos && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="archivos-geograficos-lote-title">
            <div className="modal-header">
              <div>
                <h2 id="archivos-geograficos-lote-title">Archivos geograficos</h2>
                <p className="hint">{loteArchivosGeograficos.nombre}. Vincula KML o KMZ para usar el lote en recorridas georreferenciadas.</p>
              </div>
              <Button variant="ghost" onClick={() => { setLoteArchivosGeograficos(null); setArchivoGeograficoSeleccionado(null); }}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <label className="reference-wide">
                Archivo KML/KMZ
                <input
                  type="file"
                  accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
                  onChange={(event) => setArchivoGeograficoSeleccionado(event.target.files?.[0] || null)}
                />
              </label>
              <div className="reference-total">
                <span>Archivos vinculados</span>
                <strong>{archivosGeograficos.length}</strong>
                <span>{archivosGeograficos.some((archivo) => archivo.esPrincipal) ? 'Con archivo principal' : 'Sin archivo principal'}</span>
              </div>
            </div>

            <div className="reference-list">
              {archivosGeograficos.length === 0 ? (
                <p className="hint">Todavia no hay archivos geograficos vinculados a este lote.</p>
              ) : archivosGeograficos.map((archivo) => (
                <article key={archivo.id} className="geo-file-row">
                  <LoteGeoPreview archivo={archivo} />
                  <div className="geo-file-data">
                    <strong>{archivo.nombreArchivo}</strong>
                    <span>{archivo.tipo.toUpperCase()} - {(archivo.tamanioBytes / 1024).toFixed(1)} KB</span>
                    {archivo.superficieCalculadaHa !== undefined && (
                      <span>Superficie detectada: {archivo.superficieCalculadaHa.toFixed(2)} ha</span>
                    )}
                    {archivo.observaciones && <span>{archivo.observaciones}</span>}
                  </div>
                  <div className="table-icon-actions">
                    <em>{archivo.esPrincipal ? 'Principal' : 'Archivo'}</em>
                    <em>{archivo.estado.replace(/_/g, ' ')}</em>
                  </div>
                </article>
              ))}
            </div>

            <div className="modal-actions">
              <span className="hint">El backend procesa el archivo y guarda GeoJSON para mobile, recorridas y vista de mapa.</span>
              <Button variant="primary" disabled={guardando || !archivoGeograficoSeleccionado} onClick={subirArchivoGeografico}>
                <span className="button-content">
                  {guardando && <span className="loading-spinner" />}
                  Vincular archivo
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
