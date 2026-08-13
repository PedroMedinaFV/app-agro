import { useEffect, useState } from 'react';
import {
  ErpEmpresa,
  ErpSnapshot,
  obtenerPermisosRol,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PlanificacionSnapshot,
  ProtocoloEtapa,
  ProtocoloProductivoDetalle,
  ProtocolosSnapshot,
  RolUsuario,
  SesionUsuario,
} from '@agro/tipos';
import {
  guardarEmpresasErpAdmin,
  guardarPlanificacion,
  guardarProtocolo,
  loginDemo,
  obtenerEmpresasErpAdmin,
  obtenerPlanificacionSnapshot,
  obtenerProtocolosSnapshot,
  obtenerSnapshotErp,
} from './services/api';

const snapshotFallback: ErpSnapshot = {
  sincronizadoEn: new Date().toISOString(),
  zonas: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:zona:34', idZona: 34, codigo: '00001', nombre: 'ZONA LA PROVIDENCIA', activo: true },
  ],
  campos: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:campo:241', idCampo: 241, idZona: 34, idSubZona: 107, codigo: '00006', nombre: 'LA PROVIDENCIA', paisCodigo: 'AR', sociedad: 'Demo', activo: true, admiteGanaderia: true, codigoSima: 34942, actualizadoEn: new Date().toISOString() },
  ],
  lotes: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:lote:724', idLote: 724, idCampo: 241, campoErpId: 'empresa:mock:campo:241', codigo: 'CL1', nombre: 'CABALLO LOCO 1', areaHectareas: 60, hectareasProductivas: 60, admiteGanaderia: true, admiteLecheria: false, codigoSima: 78998, activo: true, actualizadoEn: new Date().toISOString() },
  ],
  actividades: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:actividad:48', idActividad: 48, codigo: '011', descripcion: 'GIRASOL', activo: true, habilitadoExportacionCrea: true, idEspecie: 33, idTipoActividad: 1, actualizadoEn: new Date().toISOString() },
  ],
  especies: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:especie:33', idEspecie: 33, codigo: '01', nombre: 'GIRASOL', activo: true, codigoAfip: 2, actualizadoEn: new Date().toISOString() },
  ],
  empresas: [
    { erpId: 'empresa:1', idEmpresa: 1, codigo: '001', nombre: 'SOLMAT', activo: true, cuit: '30-70796234-4', razonSocial: 'SOLMAT AGROPECUARIA S.A.', actualizadoEn: new Date().toISOString() },
  ],
  campanias: [
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:campania:961', idCampania: 961, codigo: '19/20', nombre: '19/20', activo: true, esActual: true, actualizadoEn: new Date().toISOString() },
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:campania:966', idCampania: 966, codigo: '24/25', nombre: '24/25', activo: true, esActual: false, actualizadoEn: new Date().toISOString() },
    { empresaErpId: 'empresa:mock', erpId: 'empresa:mock:campania:967', idCampania: 967, codigo: '25/26', nombre: '25/26', activo: true, esActual: false, actualizadoEn: new Date().toISOString() },
  ],
  cultivos: [
    {
      empresaErpId: 'empresa:mock',
      erpId: 'empresa:mock:cultivo:577',
      idCultivo: 577,
      codigo: '00577',
      nombre: 'LP GIRASOL 19/20',
      idCampo: 241,
      campoErpId: 'empresa:mock:campo:241',
      idLote: 724,
      loteErpId: 'empresa:mock:lote:724',
      idActividad: 48,
      actividadErpId: 'empresa:mock:actividad:48',
      idEspecie: 33,
      especieErpId: 'empresa:mock:especie:33',
      idCampania: 961,
      campaniaErpId: 'empresa:mock:campania:961',
      hectareas: 60,
      hectareasSembradas: 60,
      hectareasCosechadas: 0,
      esAgriculturaIntensiva: false,
      socioEnFuncionAportes: true,
      activo: true,
      actualizadoEn: new Date().toISOString(),
    },
  ],
  insumos: [
    {
      empresaErpId: 'empresa:mock',
      erpId: 'empresa:mock:insumo:674',
      idInsumo: 674,
      idUnidadMedida: 19,
      idTipoInsumo: 83,
      idCategoriaInsumo: 65,
      codigo: '00008',
      nombre: '2.4 D 100%',
      activo: true,
      controlaStock: true,
      esInsumoGenerico: false,
      controlaPorLote: false,
      precioUnitario: 6.82,
      precioUnitarioVenta: 0,
      idMonedaPrecioUnitario: 2,
      idMonedaPrecioVenta: 2,
      actualizadoEn: new Date().toISOString(),
    },
  ],
};

const planificacionFallback: PlanificacionSnapshot = {
  sincronizadoEn: new Date().toISOString(),
  camposPlanificacion: [
    {
      id: 'campo-planificacion-erp-241',
      clienteId: 'cliente-demo',
      empresaErpId: 'empresa:mock',
      campoErpId: 'empresa:mock:campo:241',
      nombre: 'LA PROVIDENCIA',
      codigoInterno: '00006',
      zonaErpId: 'empresa:mock:zona:34',
      estadoVinculacion: 'vinculado_erp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'campo-planificacion-provisorio-1',
      clienteId: 'cliente-demo',
      empresaErpId: 'empresa:mock',
      nombre: 'CAMPO NUEVO A REGISTRAR',
      codigoInterno: 'TEMP-001',
      estadoVinculacion: 'provisorio',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  lotesPlanificacion: [
    {
      id: 'lote-planificacion-erp-724',
      clienteId: 'cliente-demo',
      campoPlanificacionId: 'campo-planificacion-erp-241',
      loteErpId: 'empresa:mock:lote:724',
      nombre: 'CABALLO LOCO 1',
      codigoInterno: 'CL1',
      superficieTotal: 60,
      superficieProductiva: 60,
      estadoVinculacion: 'vinculado_erp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lote-planificacion-provisorio-1',
      clienteId: 'cliente-demo',
      campoPlanificacionId: 'campo-planificacion-provisorio-1',
      nombre: 'LOTE NORTE',
      codigoInterno: 'TEMP-NORTE',
      superficieTotal: 42,
      superficieProductiva: 39,
      estadoVinculacion: 'provisorio',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  destinosReferencia: [
    {
      id: 'destino-girasol-puerto-quequen',
      clienteId: 'cliente-demo',
      empresaErpId: 'empresa:mock',
      campoPlanificacionId: 'campo-planificacion-erp-241',
      campoErpId: 'empresa:mock:campo:241',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      destinoVenta: 'Puerto Quequen',
      descripcion: 'Destino sugerido para girasol de LA PROVIDENCIA',
      prioridad: 1,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'destino-girasol-acopio-local',
      clienteId: 'cliente-demo',
      empresaErpId: 'empresa:mock',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      destinoVenta: 'Acopio local',
      descripcion: 'Destino alternativo para girasol',
      prioridad: 2,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  preciosReferencia: [
    {
      id: 'precio-girasol-quequen-planificado',
      clienteId: 'cliente-demo',
      campaniaErpId: 'empresa:mock:campania:961',
      empresaErpId: 'empresa:mock',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      destinoVenta: 'Puerto Quequen',
      tipoPrecio: 'planificado',
      valor: 315,
      moneda: 'USD',
      unidad: 'tn',
      fechaVigenciaDesde: new Date().toISOString(),
      fuente: 'manual',
      observaciones: 'Precio demo para validar margen bruto',
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  gastosComercialesReferencia: [
    {
      id: 'gastos-girasol-providencia-quequen',
      clienteId: 'cliente-demo',
      empresaErpId: 'empresa:mock',
      campoPlanificacionId: 'campo-planificacion-erp-241',
      campoErpId: 'empresa:mock:campo:241',
      actividadErpId: 'empresa:mock:actividad:48',
      destinoVenta: 'Puerto Quequen',
      descripcion: 'Flete y acondicionamiento girasol a Puerto Quequen',
      items: [
        { concepto: 'Flete', tipoCalculo: 'por_ha', valor: 32, moneda: 'USD', unidad: 'ha' },
        { concepto: 'Acondicionamiento', tipoCalculo: 'por_ha', valor: 7, moneda: 'USD', unidad: 'ha' },
        { concepto: 'Comision comercial', tipoCalculo: 'por_ha', valor: 3, moneda: 'USD', unidad: 'ha' },
      ],
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  protocolos: [
    {
      id: 'protocolo-girasol-media',
      clienteId: 'cliente-demo',
      nombre: 'Girasol tecnologia media',
      descripcion: 'Girasol - tecnologia media - barbecho, siembra, proteccion y cosecha',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      zonaErpId: 'empresa:mock:zona:34',
      campoPlanificacionId: 'campo-planificacion-erp-241',
      costoEstimadoPorHa: 520,
      activo: true,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    },
    {
      id: 'protocolo-girasol-zona',
      clienteId: 'cliente-demo',
      nombre: 'Girasol zona general',
      descripcion: 'Girasol - protocolo general para zona',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      zonaErpId: 'empresa:mock:zona:34',
      costoEstimadoPorHa: 500,
      activo: true,
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 'protocolo-girasol-global',
      clienteId: 'cliente-demo',
      nombre: 'Girasol base',
      descripcion: 'Girasol - protocolo base sin campo asignado',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      costoEstimadoPorHa: 470,
      activo: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-06-15T10:00:00.000Z',
    },
  ],
  planificaciones: [
    {
      id: 'planificacion-25-26-demo',
      clienteId: 'cliente-demo',
      campaniaErpId: 'empresa:mock:campania:961',
      nombre: 'Planificacion agricola demo',
      descripcion: 'Primera planilla para validar ingresos, costos y margen bruto.',
      estado: 'borrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineas: [
        {
          id: 'linea-planificacion-1',
          planificacionId: 'planificacion-25-26-demo',
          empresaErpId: 'empresa:mock',
          campoPlanificacionId: 'campo-planificacion-erp-241',
          campoErpId: 'empresa:mock:campo:241',
          lotePlanificacionId: 'lote-planificacion-erp-724',
          loteErpId: 'empresa:mock:lote:724',
          actividadErpId: 'empresa:mock:actividad:48',
          cultivoErpId: 'empresa:mock:cultivo:577',
          destinoReferenciaId: 'destino-girasol-puerto-quequen',
          destinoVenta: 'Puerto Quequen',
          destinoVentaManual: false,
          precioReferenciaId: 'precio-girasol-quequen-planificado',
          precioVentaEstimado: 315,
          precioVentaManual: false,
          hectareasPlanificadas: 60,
          rindeEstimado: 2.4,
          gastosComercialesReferenciaId: 'gastos-girasol-providencia-quequen',
          gastosComercialesEstimados: 2520,
          protocoloId: 'protocolo-girasol-media',
          ingresoBrutoEstimado: 45360,
          ingresoNetoEstimado: 42840,
          costoProduccionEstimado: 31200,
          margenBrutoEstimado: 11640,
          margenBrutoActualizado: 11640,
          estado: 'borrador',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  ],
};

const protocolosFallback: ProtocolosSnapshot = {
  sincronizadoEn: new Date().toISOString(),
  protocolos: [
    {
      id: 'protocolo-girasol-media',
      clienteId: 'cliente-demo',
      nombre: 'Girasol tecnologia media',
      descripcion: 'Girasol - tecnologia media - barbecho, siembra, proteccion y cosecha',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      zonaErpId: 'empresa:mock:zona:34',
      campoPlanificacionId: 'campo-planificacion-erp-241',
      costoEstimadoPorHa: 130.21,
      activo: true,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
      etapas: [
        {
          id: 'etapa-barbecho',
          protocoloId: 'protocolo-girasol-media',
          orden: 1,
          nombre: 'Barbecho',
          descripcion: 'Control quimico previo a siembra',
          labores: [
            {
              id: 'labor-pulverizacion-barbecho',
              etapaId: 'etapa-barbecho',
              nombre: 'Pulverizacion',
              unidad: 'ha',
              cantidadPorHa: 1,
              costoUnitario: 18,
              costoPorHa: 18,
              momentoEstimado: 'Pre siembra',
            },
          ],
          insumos: [
            {
              id: 'insumo-24d-barbecho',
              etapaId: 'etapa-barbecho',
              insumoPlanificacionId: 'insumo-planificacion-24d',
              insumoErpId: 'empresa:mock:insumo:674',
              nombre: '2.4 D 100%',
              tipo: 'Herbicida',
              unidad: 'l',
              dosisPorHa: 0.5,
              precioUnitarioEstimado: 6.82,
              costoPorHa: 3.41,
              momentoEstimado: 'Pre siembra',
            },
          ],
        },
        {
          id: 'etapa-siembra',
          protocoloId: 'protocolo-girasol-media',
          orden: 2,
          nombre: 'Siembra',
          descripcion: 'Implantacion del cultivo',
          labores: [
            {
              id: 'labor-siembra',
              etapaId: 'etapa-siembra',
              nombre: 'Siembra contratista',
              unidad: 'ha',
              cantidadPorHa: 1,
              costoUnitario: 62,
              costoPorHa: 62,
              momentoEstimado: 'Siembra',
            },
          ],
          insumos: [
            {
              id: 'insumo-semilla-girasol',
              etapaId: 'etapa-siembra',
              insumoPlanificacionId: 'insumo-planificacion-semilla-girasol',
              nombre: 'Semilla girasol',
              tipo: 'Semilla',
              unidad: 'bolsa',
              dosisPorHa: 0.18,
              precioUnitarioEstimado: 260,
              costoPorHa: 46.8,
              momentoEstimado: 'Siembra',
            },
          ],
        },
      ],
    },
  ],
};

function formatearUsd(valor: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(valor);
}

function leerNumero(valor: string) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}

function calcularCostoProtocoloWeb(protocolo: ProtocoloProductivoDetalle) {
  return protocolo.etapas.reduce((total, etapa) => {
    const costoLabores = etapa.labores.reduce((subtotal, labor) => subtotal + labor.costoPorHa, 0);
    const costoInsumos = etapa.insumos.reduce((subtotal, insumo) => subtotal + insumo.costoPorHa, 0);

    return total + costoLabores + costoInsumos;
  }, 0);
}

export function App() {
  const [vista, setVista] = useState<'inicio' | 'planificacion' | 'protocolos' | 'empresas-erp'>('inicio');
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [email, setEmail] = useState('demo@agroapp.local');
  const [password, setPassword] = useState('demo1234');
  const [rol, setRol] = useState<RolUsuario>('admin');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [snapshot, setSnapshot] = useState<ErpSnapshot>(snapshotFallback);
  const [planificacion, setPlanificacion] = useState<PlanificacionSnapshot>(planificacionFallback);
  const [protocolos, setProtocolos] = useState<ProtocolosSnapshot>(protocolosFallback);
  const [protocoloSeleccionadoId, setProtocoloSeleccionadoId] = useState(protocolosFallback.protocolos[0]?.id || '');
  const [erpEstado, setErpEstado] = useState('Datos ERP locales');
  const [planificacionEstado, setPlanificacionEstado] = useState('Planificacion demo local');
  const [protocolosEstado, setProtocolosEstado] = useState('Protocolos demo locales');
  const [empresasDisponibles, setEmpresasDisponibles] = useState<ErpEmpresa[]>(snapshotFallback.empresas);
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState<string[]>(['empresa:1']);
  const [guardandoEmpresas, setGuardandoEmpresas] = useState(false);
  const [estadoEmpresas, setEstadoEmpresas] = useState('Seleccion local para modo demo.');
  const [guardandoPlanificacion, setGuardandoPlanificacion] = useState(false);
  const [guardandoProtocolo, setGuardandoProtocolo] = useState(false);

  async function entrarModoDemo() {
    setCargando(true);
    setError('');

    try {
      setSesion(await loginDemo({ email, nombre: 'Usuario Demo', rol }));
    } catch (error) {
      // Fallback intencional: permite seguir validando UI cuando la API todavia no esta levantada.
      setError('API no disponible. Usando sesion demo local.');
      setSesion({
        token: 'demo-local-token',
        usuario: { id: 'demo-local', email, nombre: 'Usuario Demo', rol },
        origen: 'demo',
        permisos: obtenerPermisosRol(rol),
      });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    async function cargarDatosErp() {
      if (!sesion) {
        return;
      }

      try {
        const datosErp = await obtenerSnapshotErp(sesion.token);
        setSnapshot(datosErp);
        setEmpresasDisponibles(datosErp.empresas);
        setEmpresasSeleccionadas((actuales) => actuales.length ? actuales : datosErp.empresas.slice(0, 1).map((empresa) => empresa.erpId));
        setErpEstado('Datos ERP desde API mock');
      } catch (error) {
        setSnapshot(snapshotFallback);
        setEmpresasDisponibles(snapshotFallback.empresas);
        setErpEstado('API ERP no disponible. Usando mock local.');
      }
    }

    cargarDatosErp();
  }, [sesion]);

  useEffect(() => {
    async function cargarPlanificacion() {
      if (!sesion) {
        return;
      }

      try {
        setPlanificacion(await obtenerPlanificacionSnapshot(sesion.token));
        setPlanificacionEstado('Planificacion desde API mock');
      } catch (error) {
        setPlanificacion(planificacionFallback);
        setPlanificacionEstado('API de planificacion no disponible. Usando mock local.');
      }
    }

    cargarPlanificacion();
  }, [sesion]);

  useEffect(() => {
    async function cargarProtocolos() {
      if (!sesion) {
        return;
      }

      try {
        const datos = await obtenerProtocolosSnapshot(sesion.token);
        setProtocolos(datos);
        setProtocoloSeleccionadoId((actual) => actual || datos.protocolos[0]?.id || '');
        setProtocolosEstado('Protocolos desde API mock');
      } catch (error) {
        setProtocolos(protocolosFallback);
        setProtocoloSeleccionadoId((actual) => actual || protocolosFallback.protocolos[0]?.id || '');
        setProtocolosEstado('API de protocolos no disponible. Usando mock local.');
      }
    }

    cargarProtocolos();
  }, [sesion]);

  const puedeConfigurarErp = sesion?.permisos.includes('erp:configurar') || false;

  useEffect(() => {
    async function cargarEmpresasAdmin() {
      if (!sesion || !puedeConfigurarErp) {
        return;
      }

      try {
        const respuesta = await obtenerEmpresasErpAdmin(sesion.usuario.clienteId || 'cliente-demo', sesion.token);
        setEmpresasDisponibles(respuesta.empresas);
        setEmpresasSeleccionadas(respuesta.seleccionadas.map((seleccion) => seleccion.empresaErpId));
        setEstadoEmpresas('Empresas cargadas desde backend.');
      } catch (error) {
        setEmpresasDisponibles(snapshot.empresas);
        setEmpresasSeleccionadas((actuales) => actuales.length ? actuales : snapshot.empresas.slice(0, 1).map((empresa) => empresa.erpId));
        setEstadoEmpresas('Sin base de datos disponible. Usando seleccion local de demo.');
      }
    }

    cargarEmpresasAdmin();
  }, [sesion, snapshot.empresas, puedeConfigurarErp]);

  const lotes = snapshot.lotes.map((lote) => ({
    ...lote,
    campo: snapshot.campos.find((campo) => campo.erpId === lote.campoErpId),
  }));
  const zonasPorEmpresaYId = new Map(snapshot.zonas.map((zona) => [`${zona.empresaErpId}:${zona.idZona}`, zona]));
  const empresasSeleccionadasSet = new Set(empresasSeleccionadas);
  const esUsuarioComun = sesion?.usuario.rol === 'usuario';
  const empresasOperativas = new Set(snapshot.campos.map((campo) => campo.empresaErpId));
  const campaniaActual = snapshot.campanias.find((campania) => campania.esActual);
  const planificacionActiva = planificacion.planificaciones[0];
  const lineasPlanificacion = planificacionActiva?.lineas || [];
  const camposPlanificacionPorId = new Map(planificacion.camposPlanificacion.map((campo) => [campo.id, campo]));
  const lotesPlanificacionPorId = new Map(planificacion.lotesPlanificacion.map((lote) => [lote.id, lote]));
  const protocolosPorId = new Map(planificacion.protocolos.map((protocolo) => [protocolo.id, protocolo]));
  const margenBrutoTotal = lineasPlanificacion.reduce((total, linea) => total + linea.margenBrutoEstimado, 0);
  const ingresoNetoTotal = lineasPlanificacion.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0);
  const costoTotal = lineasPlanificacion.reduce((total, linea) => total + linea.costoProduccionEstimado, 0);
  const hectareasPlanificadas = lineasPlanificacion.reduce((total, linea) => total + linea.hectareasPlanificadas, 0);
  const camposProvisorios = planificacion.camposPlanificacion.filter((campo) => campo.estadoVinculacion === 'provisorio').length;
  const puedeEditarPlanificacion = sesion?.permisos.includes('planificacion:editar') && planificacionActiva?.estado !== 'cerrada';
  const clavesLineas = lineasPlanificacion.map((linea) => `${planificacionActiva?.campaniaErpId}|${linea.campoPlanificacionId}|${linea.lotePlanificacionId}|${linea.actividadErpId}`);
  const clavesDuplicadas = new Set(clavesLineas.filter((clave, indice) => clavesLineas.indexOf(clave) !== indice));
  const tieneLineasDuplicadas = clavesDuplicadas.size > 0;
  const puedeConfigurarPlanificacion = sesion?.permisos.includes('planificacion:configurar') || false;
  const protocoloSeleccionado = protocolos.protocolos.find((protocolo) => protocolo.id === protocoloSeleccionadoId) || protocolos.protocolos[0];

  function recalcularLinea(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
    const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
    const ingresoBrutoEstimado = linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado;
    const ingresoNetoEstimado = ingresoBrutoEstimado - linea.gastosComercialesEstimados;
    const costoProduccionEstimado = linea.hectareasPlanificadas * (protocolo?.costoEstimadoPorHa || 0);

    return {
      ...linea,
      ingresoBrutoEstimado,
      ingresoNetoEstimado,
      costoProduccionEstimado,
      margenBrutoEstimado: ingresoNetoEstimado - costoProduccionEstimado,
      margenBrutoActualizado: ingresoNetoEstimado - costoProduccionEstimado,
    };
  }

  function calcularGastosComerciales(linea: PlanificacionAgricolaLinea, referenciaId?: string) {
    const referencia = planificacion.gastosComercialesReferencia.find((item) => item.id === referenciaId);

    if (!referencia) {
      return linea.gastosComercialesEstimados;
    }

    return referencia.items.reduce((total, item) => {
      if (item.tipoCalculo === 'por_ha') {
        return total + item.valor * linea.hectareasPlanificadas;
      }

      if (item.tipoCalculo === 'por_tn') {
        return total + item.valor * linea.hectareasPlanificadas * linea.rindeEstimado;
      }

      if (item.tipoCalculo === 'porcentaje_ingreso') {
        return total + (linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado * item.valor) / 100;
      }

      return total + item.valor;
    }, 0);
  }

  function buscarDestinoSugerido(linea: Pick<PlanificacionAgricolaLinea, 'campoPlanificacionId' | 'campoErpId' | 'actividadErpId'>) {
    return planificacion.destinosReferencia
      .filter((item) => item.activo && item.actividadErpId === linea.actividadErpId)
      .sort((a, b) => {
        const pesoA = (a.campoPlanificacionId === linea.campoPlanificacionId ? 3 : 0) + (a.campoErpId === linea.campoErpId ? 2 : 0);
        const pesoB = (b.campoPlanificacionId === linea.campoPlanificacionId ? 3 : 0) + (b.campoErpId === linea.campoErpId ? 2 : 0);

        return pesoB - pesoA || a.prioridad - b.prioridad;
      })[0];
  }

  function buscarPrecioSugerido(actividadErpId: string, destinoVenta: string) {
    return planificacion.preciosReferencia.find((item) => item.activo && item.actividadErpId === actividadErpId && item.destinoVenta === destinoVenta)
      || planificacion.preciosReferencia.find((item) => item.activo && item.actividadErpId === actividadErpId);
  }

  function buscarGastosSugeridos(linea: Pick<PlanificacionAgricolaLinea, 'campoPlanificacionId' | 'campoErpId' | 'actividadErpId' | 'destinoVenta'>) {
    return planificacion.gastosComercialesReferencia
      .filter((item) => item.activo && item.actividadErpId === linea.actividadErpId && (!item.destinoVenta || item.destinoVenta === linea.destinoVenta))
      .sort((a, b) => {
        const pesoA = (a.campoPlanificacionId === linea.campoPlanificacionId ? 3 : 0) + (a.campoErpId === linea.campoErpId ? 2 : 0);
        const pesoB = (b.campoPlanificacionId === linea.campoPlanificacionId ? 3 : 0) + (b.campoErpId === linea.campoErpId ? 2 : 0);

        return pesoB - pesoA;
      })[0];
  }

  function obtenerProtocolosCompatibles(linea: Pick<PlanificacionAgricolaLinea, 'actividadErpId' | 'campoPlanificacionId' | 'campoErpId'>) {
    const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);

    return planificacion.protocolos
      .filter((protocolo) => {
        if (!protocolo.activo || protocolo.actividadErpId !== linea.actividadErpId) {
          return false;
        }

        const coincideCampo = !protocolo.campoPlanificacionId || protocolo.campoPlanificacionId === linea.campoPlanificacionId;
        const coincideZona = !protocolo.zonaErpId || protocolo.zonaErpId === campo?.zonaErpId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  function actualizarPlanificacionActiva(mutador: (actual: PlanificacionAgricola) => PlanificacionAgricola) {
    setPlanificacion((actual) => ({
      ...actual,
      planificaciones: actual.planificaciones.map((item, indice) => (indice === 0 ? mutador(item) : item)),
    }));
  }

  function cambiarCampaniaPlanificacion(campaniaErpId: string) {
    actualizarPlanificacionActiva((actual) => ({ ...actual, campaniaErpId }));
  }

  function actualizarLinea(id: string, cambios: Partial<PlanificacionAgricolaLinea>) {
    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      lineas: actual.lineas.map((linea) => (linea.id === id ? recalcularLinea({ ...linea, ...cambios }) : linea)),
    }));
  }

  function aplicarSugerenciasComerciales(linea: PlanificacionAgricolaLinea, destinoForzado?: string): Partial<PlanificacionAgricolaLinea> {
    const destino = destinoForzado
      ? planificacion.destinosReferencia.find((item) => item.destinoVenta === destinoForzado && item.actividadErpId === linea.actividadErpId)
      : buscarDestinoSugerido(linea);
    const destinoVenta = destinoForzado || destino?.destinoVenta || '';
    const precio = buscarPrecioSugerido(linea.actividadErpId, destinoVenta);
    const gastos = buscarGastosSugeridos({ ...linea, destinoVenta });

    return {
      destinoReferenciaId: destino?.id,
      destinoVenta,
      destinoVentaManual: Boolean(destinoForzado && destinoForzado !== destino?.destinoVenta),
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || linea.precioVentaEstimado,
      precioVentaManual: !precio,
      gastosComercialesReferenciaId: gastos?.id,
      gastosComercialesEstimados: calcularGastosComerciales({ ...linea, destinoVenta, precioVentaEstimado: precio?.valor || linea.precioVentaEstimado }, gastos?.id),
    };
  }

  function cambiarCampo(lineaId: string, campoPlanificacionId: string) {
    const campo = camposPlanificacionPorId.get(campoPlanificacionId);
    const lote = planificacion.lotesPlanificacion.find((item) => item.campoPlanificacionId === campoPlanificacionId);
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!campo || !lote || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      lotePlanificacionId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: lote.superficieProductiva,
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarLote(lineaId: string, lotePlanificacionId: string) {
    const lote = lotesPlanificacionPorId.get(lotePlanificacionId);
    const campo = lote ? camposPlanificacionPorId.get(lote.campoPlanificacionId) : undefined;
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!lote || !campo || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      lotePlanificacionId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: lote.superficieProductiva,
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarActividad(lineaId: string, actividadErpId: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);
    if (!linea) {
      return;
    }

    const base = { ...linea, actividadErpId };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarDestino(lineaId: string, destinoVenta: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    actualizarLinea(lineaId, aplicarSugerenciasComerciales(linea, destinoVenta));
  }

  function agregarLineaPlanificacion() {
    if (!planificacionActiva || !puedeEditarPlanificacion) {
      return;
    }

    const ultimaLinea = planificacionActiva.lineas[planificacionActiva.lineas.length - 1];
    const campoPorDefectoId = ultimaLinea?.campoPlanificacionId || planificacion.camposPlanificacion[0]?.id;
    const lote = planificacion.lotesPlanificacion.find((item) => item.campoPlanificacionId === campoPorDefectoId) || planificacion.lotesPlanificacion[0];
    const campo = lote ? camposPlanificacionPorId.get(lote.campoPlanificacionId) : undefined;
    const actividad = snapshot.actividades[0];
    const destino = actividad ? planificacion.destinosReferencia.find((item) => item.actividadErpId === actividad.erpId) : undefined;
    const precio = actividad ? planificacion.preciosReferencia.find((item) => item.actividadErpId === actividad.erpId && (!destino || item.destinoVenta === destino.destinoVenta)) : undefined;
    const ahora = new Date().toISOString();

    if (!lote || !campo || !actividad) {
      return;
    }

    const base: PlanificacionAgricolaLinea = {
      id: `linea-planificacion-${Date.now()}`,
      planificacionId: planificacionActiva.id,
      empresaErpId: campo.empresaErpId,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      lotePlanificacionId: lote.id,
      loteErpId: lote.loteErpId,
      actividadErpId: actividad.erpId,
      destinoReferenciaId: destino?.id,
      destinoVenta: destino?.destinoVenta || '',
      destinoVentaManual: !destino,
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      precioVentaManual: !precio,
      hectareasPlanificadas: lote.superficieProductiva,
      rindeEstimado: 0,
      gastosComercialesReferenciaId: undefined,
      gastosComercialesEstimados: 0,
      protocoloId: undefined,
      ingresoBrutoEstimado: 0,
      ingresoNetoEstimado: 0,
      costoProduccionEstimado: 0,
      margenBrutoEstimado: 0,
      margenBrutoActualizado: 0,
      estado: 'borrador',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];
    const nuevaLinea = recalcularLinea({ ...base, protocoloId: protocolo?.id, ...aplicarSugerenciasComerciales(base) });

    actualizarPlanificacionActiva((actual) => ({ ...actual, lineas: [...actual.lineas, nuevaLinea] }));
  }

  function eliminarLineaPlanificacion(lineaId: string) {
    if (!puedeEditarPlanificacion) {
      return;
    }

    actualizarPlanificacionActiva((actual) => ({ ...actual, lineas: actual.lineas.filter((linea) => linea.id !== lineaId) }));
  }

  function actualizarProtocolos(mutador: (protocolo: ProtocoloProductivoDetalle) => ProtocoloProductivoDetalle) {
    if (!protocoloSeleccionado) {
      return;
    }

    setProtocolos((actual) => ({
      ...actual,
      protocolos: actual.protocolos.map((protocolo) => {
        if (protocolo.id !== protocoloSeleccionado.id) {
          return protocolo;
        }

        const actualizado = mutador(protocolo);
        return { ...actualizado, costoEstimadoPorHa: calcularCostoProtocoloWeb(actualizado) };
      }),
    }));
  }

  function actualizarEtapa(etapaId: string, cambios: Partial<ProtocoloEtapa>) {
    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: protocolo.etapas.map((etapa) => (etapa.id === etapaId ? { ...etapa, ...cambios } : etapa)),
    }));
  }

  function agregarEtapaProtocolo() {
    if (!protocoloSeleccionado) {
      return;
    }

    const etapaId = `etapa-${Date.now()}`;
    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: [
        ...protocolo.etapas,
        {
          id: etapaId,
          protocoloId: protocolo.id,
          orden: protocolo.etapas.length + 1,
          nombre: 'Nueva etapa',
          labores: [],
          insumos: [],
        },
      ],
    }));
  }

  function agregarLabor(etapaId: string) {
    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: protocolo.etapas.map((etapa) => etapa.id === etapaId ? {
        ...etapa,
        labores: [
          ...etapa.labores,
          {
            id: `labor-${Date.now()}`,
            etapaId,
            nombre: 'Nueva labor',
            unidad: 'ha',
            cantidadPorHa: 1,
            costoUnitario: 0,
            costoPorHa: 0,
          },
        ],
      } : etapa),
    }));
  }

  function agregarInsumo(etapaId: string) {
    actualizarProtocolos((protocolo) => ({
      ...protocolo,
      etapas: protocolo.etapas.map((etapa) => etapa.id === etapaId ? {
        ...etapa,
        insumos: [
          ...etapa.insumos,
          {
            id: `insumo-${Date.now()}`,
            etapaId,
            insumoPlanificacionId: 'insumo-planificacion-provisorio',
            nombre: 'Insumo provisorio',
            unidad: 'unidad',
            dosisPorHa: 0,
            precioUnitarioEstimado: 0,
            costoPorHa: 0,
          },
        ],
      } : etapa),
    }));
  }

  function crearProtocoloVacio() {
    if (!sesion) {
      return;
    }

    const ahora = new Date().toISOString();
    const id = `protocolo-nuevo-${Date.now()}`;
    const actividadBase = snapshot.actividades[0];
    const protocoloNuevo: ProtocoloProductivoDetalle = {
      id,
      clienteId: 'cliente-demo',
      nombre: 'Nuevo protocolo',
      descripcion: 'Protocolo en borrador',
      actividadErpId: actividadBase?.erpId || 'actividad-pendiente',
      costoEstimadoPorHa: 0,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
      etapas: [],
    };

    setProtocolos((actual) => ({
      ...actual,
      protocolos: [protocoloNuevo, ...actual.protocolos],
    }));
    setProtocoloSeleccionadoId(id);
    setProtocolosEstado('Protocolo nuevo creado en memoria demo. Guardalo para persistir el borrador.');
  }

  function copiarProtocoloSeleccionado(protocoloOrigen = protocoloSeleccionado) {
    if (!protocoloOrigen) {
      return;
    }

    const ahora = new Date().toISOString();
    const id = `protocolo-copia-${Date.now()}`;
    const protocoloCopiado: ProtocoloProductivoDetalle = {
      ...protocoloOrigen,
      id,
      nombre: `${protocoloOrigen.nombre} - copia`,
      protocoloOrigenId: protocoloOrigen.id,
      createdAt: ahora,
      updatedAt: ahora,
      etapas: protocoloOrigen.etapas.map((etapa, etapaIndice) => {
        const etapaId = `${id}-etapa-${etapaIndice + 1}`;

        return {
          ...etapa,
          id: etapaId,
          protocoloId: id,
          labores: etapa.labores.map((labor, laborIndice) => ({
            ...labor,
            id: `${etapaId}-labor-${laborIndice + 1}`,
            etapaId,
          })),
          insumos: etapa.insumos.map((insumo, insumoIndice) => ({
            ...insumo,
            id: `${etapaId}-insumo-${insumoIndice + 1}`,
            etapaId,
          })),
        };
      }),
    };

    setProtocolos((actual) => ({
      ...actual,
      protocolos: [protocoloCopiado, ...actual.protocolos],
    }));
    setProtocoloSeleccionadoId(id);
    setProtocolosEstado('Copia creada en memoria demo. Editala y guardala como protocolo independiente.');
  }

  async function guardarProtocoloSeleccionado() {
    if (!sesion || !protocoloSeleccionado) {
      return;
    }

    setGuardandoProtocolo(true);

    try {
      const respuesta = await guardarProtocolo(protocoloSeleccionado.id, {
        protocolo: protocoloSeleccionado,
        origen: 'web',
        motivo: 'Guardado de protocolo desde demo web',
      }, sesion.token);

      setProtocolos((actual) => ({
        ...actual,
        protocolos: actual.protocolos.map((protocolo) => protocolo.id === respuesta.protocolo.id ? respuesta.protocolo : protocolo),
      }));
      setProtocolosEstado(respuesta.mensaje);
    } catch (error) {
      setProtocolosEstado(error instanceof Error ? error.message : 'Protocolo guardado localmente. API/DB no disponible para persistir.');
    } finally {
      setGuardandoProtocolo(false);
    }
  }

  function alternarEmpresa(empresaErpId: string) {
    setEmpresasSeleccionadas((actuales) =>
      actuales.includes(empresaErpId)
        ? actuales.filter((id) => id !== empresaErpId)
        : [...actuales, empresaErpId],
    );
  }

  async function guardarSeleccionEmpresas() {
    if (!sesion) {
      return;
    }

    setGuardandoEmpresas(true);

    try {
      await guardarEmpresasErpAdmin(sesion.usuario.clienteId || 'cliente-demo', empresasSeleccionadas, sesion.token);
      setEstadoEmpresas('Seleccion guardada en backend.');
    } catch (error) {
      setEstadoEmpresas('Seleccion guardada localmente para esta demo. Falta PostgreSQL para persistir.');
    } finally {
      setGuardandoEmpresas(false);
    }
  }

  async function guardarBorradorPlanificacion() {
    if (!sesion || !planificacionActiva) {
      return;
    }

    setGuardandoPlanificacion(true);

    try {
      if (tieneLineasDuplicadas) {
        setPlanificacionEstado('No se puede guardar: hay lineas duplicadas para la misma campania, campo, lote y actividad.');
        return;
      }

      const respuesta = await guardarPlanificacion(planificacionActiva.id, {
        planificacion: planificacionActiva,
        origen: 'web',
        motivo: 'Guardado de borrador desde planilla web demo',
      }, sesion.token);

      actualizarPlanificacionActiva(() => respuesta.planificacion);
      setPlanificacionEstado(respuesta.mensaje);
    } catch (error) {
      setPlanificacionEstado(error instanceof Error ? error.message : 'Borrador guardado localmente. API/DB no disponible para persistir.');
    } finally {
      setGuardandoPlanificacion(false);
    }
  }

  if (!sesion) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Agro App Web</p>
            <h1>Iniciar sesion</h1>
            <p className="intro">Validacion local del MVP para avanzar rapido con pantallas y flujo de datos.</p>
          </div>

          <label>
            Correo
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Contrasena
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          <label>
            Rol demo
            <select value={rol} onChange={(event) => setRol(event.target.value as RolUsuario)}>
              <option value="admin">Admin</option>
              <option value="usuario">Usuario</option>
            </select>
          </label>

          <button className="primary" onClick={entrarModoDemo} disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Entrar en modo demo'}
          </button>

          <button className="secondary" disabled>
            Continuar con Microsoft
          </button>

          {error && <p className="status-warning">{error}</p>}
          <p className="hint">Microsoft queda preparado para conectar cuando tengamos App Registration y backend con DB.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="brand">Agro App</p>
          <p className="user">{sesion.usuario.nombre}</p>
          <p className="user">{sesion.usuario.rol}</p>
        </div>
        <nav>
          <a className={vista === 'inicio' ? 'active' : ''} onClick={() => setVista('inicio')}>Inicio</a>
          <a>{esUsuarioComun ? 'Mis campos' : 'Campos'}</a>
          <a>{esUsuarioComun ? 'Mis lotes' : 'Lotes'}</a>
          <a className={vista === 'planificacion' ? 'active' : ''} onClick={() => setVista('planificacion')}>Planificacion</a>
          <a className={vista === 'protocolos' ? 'active' : ''} onClick={() => setVista('protocolos')}>Protocolos</a>
          <a>Siembra</a>
          <a>Cosecha</a>
          <a>Monitoreos</a>
          {puedeConfigurarErp && <a className={vista === 'empresas-erp' ? 'active' : ''} onClick={() => setVista('empresas-erp')}>Empresas ERP</a>}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel operativo</p>
            <h1>{vista === 'empresas-erp' ? 'Empresas ERP' : vista === 'planificacion' ? 'Planificacion agricola' : vista === 'protocolos' ? 'Protocolos' : esUsuarioComun ? 'Mi trabajo' : 'Resumen de campo'}</h1>
            <p className="hint">{vista === 'empresas-erp' ? estadoEmpresas : vista === 'planificacion' ? planificacionEstado : vista === 'protocolos' ? protocolosEstado : erpEstado}</p>
          </div>
          <button className="ghost" onClick={() => { setVista('inicio'); setSesion(null); }}>Cerrar sesion</button>
        </header>

        {vista === 'inicio' && <section className="metrics">
          <article>
            <span>{esUsuarioComun ? 'Mis campos' : 'Campos'}</span>
            <strong>{snapshot.campos.length}</strong>
          </article>
          <article>
            <span>{esUsuarioComun ? 'Mis lotes activos' : 'Lotes activos'}</span>
            <strong>{snapshot.lotes.filter((lote) => lote.activo).length}</strong>
          </article>
          <article>
            <span>Hectareas</span>
            <strong>{snapshot.lotes.reduce((total, lote) => total + lote.areaHectareas, 0)}</strong>
          </article>
          <article>
            <span>Actividades ERP</span>
            <strong>{snapshot.actividades.length}</strong>
          </article>
          <article>
            <span>Especies</span>
            <strong>{snapshot.especies.length}</strong>
          </article>
          <article>
            <span>{esUsuarioComun ? 'Campania actual' : 'Campanias'}</span>
            <strong>{esUsuarioComun ? campaniaActual?.codigo || '-' : snapshot.campanias.length}</strong>
          </article>
          <article>
            <span>Cultivos</span>
            <strong>{snapshot.cultivos.length}</strong>
          </article>
          <article>
            <span>Insumos</span>
            <strong>{snapshot.insumos.length}</strong>
          </article>
          <article>
            <span>{esUsuarioComun ? 'Empresas asignadas' : 'Empresas ERP'}</span>
            <strong>{esUsuarioComun ? empresasOperativas.size : snapshot.empresas.length}</strong>
          </article>
        </section>}

        {vista === 'inicio' && <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Lotes</h2>
              <button className="small">{esUsuarioComun ? 'Cargar dato' : 'Nuevo'}</button>
            </div>
            <div className="table">
              {lotes.map((lote) => (
                <div className="row" key={lote.erpId}>
                  <div>
                    <strong>{lote.nombre}</strong>
                    <span>{lote.campo?.nombre || lote.campoErpId} - {lote.cultivoNombre || 'Sin cultivo'}</span>
                    {lote.campo?.idZona && <span>{zonasPorEmpresaYId.get(`${lote.empresaErpId}:${lote.campo.idZona}`)?.nombre || `Zona ${lote.campo.idZona}`}</span>}
                    {lote.campo && <span>Campo ERP {lote.campo.codigo} - Ganaderia: {lote.campo.admiteGanaderia ? 'si' : 'no'}</span>}
                  </div>
                  <span>{lote.areaHectareas} ha / prod. {lote.hectareasProductivas ?? lote.areaHectareas} ha</span>
                  <em>{lote.activo ? 'Activo' : 'Inactivo'}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>{esUsuarioComun ? 'Acciones disponibles' : 'Actividades ERP'}</h2>
            </div>
            {esUsuarioComun ? (
              <div className="activity-list">
                <article>
                  <span>Permitido</span>
                  <strong>Cargar registros de campo</strong>
                  <p>Los registros quedaran asociados a tus campos asignados.</p>
                </article>
                <article>
                  <span>Proximo</span>
                  <strong>Sincronizacion offline</strong>
                  <p>Mobile guardara pendientes y backend validara permisos antes de persistir.</p>
                </article>
              </div>
            ) : <div className="activity-list">
              {snapshot.actividades.map((actividad) => (
                <article key={actividad.erpId}>
                  <span>{actividad.activo ? 'Activo' : 'Inactivo'}</span>
                  <strong>{actividad.codigo} - {actividad.descripcion}</strong>
                  <p>Tipo {actividad.idTipoActividad ?? '-'} / Especie {snapshot.especies.find((especie) => especie.empresaErpId === actividad.empresaErpId && especie.idEspecie === actividad.idEspecie)?.nombre || actividad.idEspecie || '-'}</p>
                </article>
              ))}
            </div>}
          </div>

          {puedeConfigurarErp && (
            <div className="panel admin-panel">
              <div className="panel-header">
                <h2>Configuracion ERP</h2>
                <button className="small">Editar</button>
              </div>
              <div className="admin-grid">
                <span>Permiso</span>
                <strong>erp:configurar</strong>
                <span>Modo actual</span>
                <strong>Mock / fallback</strong>
                <span>Alcance</span>
                <strong>Solo administradores</strong>
              </div>
            </div>
          )}
        </section>}

        {vista === 'planificacion' && (
          <section className="planning-stack">
            <section className="planning-hero">
              <div>
                <p className="eyebrow">Planificacion</p>
                <h2>{planificacionActiva?.nombre || 'Sin planificacion activa'}</h2>
                <p className="hint">{planificacionActiva?.descripcion || 'Crear una planificacion para comenzar.'}</p>
              </div>
              <label className="compact-field">
                Campania
                <select
                  value={planificacionActiva?.campaniaErpId || ''}
                  onChange={(event) => cambiarCampaniaPlanificacion(event.target.value)}
                  disabled={!puedeEditarPlanificacion}
                >
                  {snapshot.campanias.map((campania) => (
                    <option key={campania.erpId} value={campania.erpId}>
                      {campania.codigo} {campania.esActual ? '(actual)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className={`status-pill ${planificacionActiva?.estado === 'cerrada' ? 'locked' : ''}`}>
                {planificacionActiva?.estado || 'sin_estado'}
              </div>
            </section>

            <section className="metrics planning-metrics">
              <article>
                <span>Hectareas planificadas</span>
                <strong>{hectareasPlanificadas}</strong>
              </article>
              <article>
                <span>Ingreso neto</span>
                <strong>{formatearUsd(ingresoNetoTotal)}</strong>
              </article>
              <article>
                <span>Costo produccion</span>
                <strong>{formatearUsd(costoTotal)}</strong>
              </article>
              <article>
                <span>Margen bruto</span>
                <strong>{formatearUsd(margenBrutoTotal)}</strong>
              </article>
            </section>

            {camposProvisorios > 0 && (
              <div className="status-warning">
                Hay {camposProvisorios} campo provisorio disponible para planificar. Cuando exista en ERP, se podra vincular con auditoria.
              </div>
            )}

            {tieneLineasDuplicadas && (
              <div className="status-error">
                Hay lineas duplicadas: para una misma campania, campo, lote y actividad solo puede existir una linea.
              </div>
            )}

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Planilla</h2>
                  <p className="hint">Grilla editable para armar varias lineas y guardar el borrador.</p>
                </div>
                <div className="button-row">
                  <button className="small" onClick={agregarLineaPlanificacion} disabled={!puedeEditarPlanificacion}>
                    Nueva linea
                  </button>
                  <button className="primary" onClick={guardarBorradorPlanificacion} disabled={!puedeEditarPlanificacion || guardandoPlanificacion || tieneLineasDuplicadas}>
                    {guardandoPlanificacion ? 'Guardando...' : 'Guardar borrador'}
                  </button>
                </div>
              </div>

              <div className="planning-table">
                <div className="planning-row planning-head">
                  <span>Campo</span>
                  <span>Lote</span>
                  <span>Actividad</span>
                  <span>Destino</span>
                  <span>Ha</span>
                  <span>Rinde</span>
                  <span>Precio</span>
                  <span>Gastos</span>
                  <span>Protocolo</span>
                  <span>MB</span>
                  <span></span>
                </div>

                {lineasPlanificacion.map((linea) => {
                  const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);
                  const lote = lotesPlanificacionPorId.get(linea.lotePlanificacionId);
                  const actividad = snapshot.actividades.find((item) => item.erpId === linea.actividadErpId);
                  const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
                  const lotesDelCampo = planificacion.lotesPlanificacion.filter((item) => item.campoPlanificacionId === linea.campoPlanificacionId);
                  const destinosDisponibles = planificacion.destinosReferencia
                    .filter((item) => item.activo && item.actividadErpId === linea.actividadErpId)
                    .sort((a, b) => a.prioridad - b.prioridad);
                  const protocolosCompatibles = obtenerProtocolosCompatibles(linea);
                  const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoPlanificacionId}|${linea.lotePlanificacionId}|${linea.actividadErpId}`;
                  const lineaDuplicada = clavesDuplicadas.has(claveLinea);

                  return (
                    <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''}`} key={linea.id}>
                      <div>
                        <select
                          value={linea.campoPlanificacionId}
                          onChange={(event) => cambiarCampo(linea.id, event.target.value)}
                          disabled={!puedeEditarPlanificacion}
                        >
                          {planificacion.camposPlanificacion.map((item) => (
                            <option key={item.id} value={item.id}>{item.nombre}</option>
                          ))}
                        </select>
                        <em>{campo?.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP'}</em>
                      </div>
                      <div>
                        <select
                          value={linea.lotePlanificacionId}
                          onChange={(event) => cambiarLote(linea.id, event.target.value)}
                          disabled={!puedeEditarPlanificacion}
                        >
                          {lotesDelCampo.map((item) => (
                            <option key={item.id} value={item.id}>{item.nombre}</option>
                          ))}
                        </select>
                        <span>prod. {lote?.superficieProductiva ?? '-'}</span>
                      </div>
                      <div>
                        <select
                          value={linea.actividadErpId}
                          onChange={(event) => cambiarActividad(linea.id, event.target.value)}
                          disabled={!puedeEditarPlanificacion}
                        >
                          {snapshot.actividades.map((item) => (
                            <option key={item.erpId} value={item.erpId}>{item.descripcion}</option>
                          ))}
                        </select>
                        <span>{actividad?.codigo || '-'}</span>
                        {lineaDuplicada && <span className="cell-error">Actividad duplicada</span>}
                      </div>
                      <div>
                        <select
                          value={linea.destinoVenta}
                          onChange={(event) => cambiarDestino(linea.id, event.target.value)}
                          disabled={!puedeEditarPlanificacion}
                        >
                          {destinosDisponibles.map((destino) => (
                            <option key={destino.id} value={destino.destinoVenta}>{destino.destinoVenta}</option>
                          ))}
                          {!destinosDisponibles.some((destino) => destino.destinoVenta === linea.destinoVenta) && (
                            <option value={linea.destinoVenta}>{linea.destinoVenta || 'Sin destino'}</option>
                          )}
                        </select>
                        <span>{linea.destinoVentaManual ? 'Manual' : 'Sugerido'}</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.hectareasPlanificadas}
                          onChange={(event) => actualizarLinea(linea.id, { hectareasPlanificadas: leerNumero(event.target.value) })}
                          disabled={!puedeEditarPlanificacion}
                        />
                        <span>ha</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.rindeEstimado}
                          onChange={(event) => actualizarLinea(linea.id, { rindeEstimado: leerNumero(event.target.value) })}
                          disabled={!puedeEditarPlanificacion}
                        />
                        <span>tn/ha</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.precioVentaEstimado}
                          onChange={(event) => actualizarLinea(linea.id, { precioVentaEstimado: leerNumero(event.target.value), precioVentaManual: true })}
                          disabled={!puedeEditarPlanificacion}
                        />
                        <span>{linea.precioVentaManual ? 'Manual' : 'Referencia'}</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linea.gastosComercialesEstimados}
                          onChange={(event) => actualizarLinea(linea.id, { gastosComercialesEstimados: leerNumero(event.target.value) })}
                          disabled={!puedeEditarPlanificacion}
                        />
                        <span>USD total</span>
                      </div>
                      <div>
                        <select
                          value={linea.protocoloId || ''}
                          onChange={(event) => actualizarLinea(linea.id, { protocoloId: event.target.value || undefined })}
                          disabled={!puedeEditarPlanificacion}
                        >
                          <option value="">Sin protocolo</option>
                          {protocolosCompatibles.map((item) => (
                            <option key={item.id} value={item.id}>{item.nombre}</option>
                          ))}
                        </select>
                        <span>{protocolo ? `${formatearUsd(protocolo.costoEstimadoPorHa)} / ha - act. ${new Date(protocolo.updatedAt).toLocaleDateString('es-AR')}` : 'Costo 0'}</span>
                      </div>
                      <div>
                        <strong>{formatearUsd(linea.margenBrutoEstimado)}</strong>
                        <span>Neto {formatearUsd(linea.ingresoNetoEstimado)}</span>
                      </div>
                      <div className="row-actions">
                        <button className="danger" onClick={() => eliminarLineaPlanificacion(linea.id)} disabled={!puedeEditarPlanificacion || lineasPlanificacion.length === 1}>
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-header">
                  <h2>Precios de referencia</h2>
                </div>
                <div className="activity-list">
                  {planificacion.preciosReferencia.map((precio) => (
                    <article key={precio.id}>
                      <span>{precio.tipoPrecio} / {precio.fuente}</span>
                      <strong>{precio.destinoVenta} - {formatearUsd(precio.valor)} {precio.unidad}</strong>
                      <p>Se propone al crear la linea, pero el valor se copia para conservar el supuesto.</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Protocolos</h2>
                </div>
                <div className="activity-list">
                  {planificacion.protocolos.map((protocolo) => (
                    <article key={protocolo.id}>
                      <span>{protocolo.activo ? 'Activo' : 'Inactivo'}</span>
                      <strong>{protocolo.nombre}</strong>
                      <p>{protocolo.descripcion}. Costo: {formatearUsd(protocolo.costoEstimadoPorHa)} / ha.</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </section>
        )}

        {vista === 'protocolos' && (
          <section className="planning-stack">
            <section className="planning-hero">
              <div>
                <p className="eyebrow">Protocolos productivos</p>
                <h2>{protocoloSeleccionado?.nombre || 'Sin protocolo'}</h2>
                <p className="hint">Plantillas de labores e insumos para calcular costos productivos por hectarea.</p>
              </div>
              <div className="button-row">
                <button className="secondary" onClick={crearProtocoloVacio} disabled={!puedeConfigurarPlanificacion}>Nuevo</button>
                <button className="secondary" onClick={() => copiarProtocoloSeleccionado()} disabled={!puedeConfigurarPlanificacion || !protocoloSeleccionado}>Copiar</button>
              </div>
              <div className="status-pill">{protocoloSeleccionado ? formatearUsd(protocoloSeleccionado.costoEstimadoPorHa) : '-'}</div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Grilla de protocolos</h2>
                  <p className="hint">Listado para comparar, seleccionar y copiar protocolos productivos.</p>
                </div>
                <span className="status-pill">{protocolos.protocolos.length}</span>
              </div>

              <div className="protocol-table">
                <div className="protocol-row protocol-head">
                  <span>Nombre</span>
                  <span>Actividad</span>
                  <span>Campo</span>
                  <span>Costo</span>
                  <span>Actualizado</span>
                  <span>Acciones</span>
                </div>
                {protocolos.protocolos.map((protocolo) => {
                  const actividad = snapshot.actividades.find((item) => item.erpId === protocolo.actividadErpId);
                  const campo = planificacion.camposPlanificacion.find((item) => item.id === protocolo.campoPlanificacionId);

                  return (
                    <div className={`protocol-row ${protocolo.id === protocoloSeleccionado?.id ? 'selected' : ''}`} key={protocolo.id}>
                      <div>
                        <strong>{protocolo.nombre}</strong>
                        <span>{protocolo.descripcion}</span>
                        {protocolo.protocoloOrigenId && <em>Copia de {protocolo.protocoloOrigenId}</em>}
                      </div>
                      <span>{actividad?.descripcion || protocolo.actividadErpId}</span>
                      <span>{campo?.nombre || 'General'}</span>
                      <strong>{formatearUsd(protocolo.costoEstimadoPorHa)}</strong>
                      <span>{new Date(protocolo.updatedAt).toLocaleDateString('es-AR')}</span>
                      <div className="button-row">
                        <button className="small" onClick={() => setProtocoloSeleccionadoId(protocolo.id)}>Editar</button>
                        <button className="small" onClick={() => copiarProtocoloSeleccionado(protocolo)} disabled={!puedeConfigurarPlanificacion}>Copiar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {protocoloSeleccionado && (
              <>
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Cabecera</h2>
                      <p className="hint">Actividad obligatoria, zona/campo opcionales y costo calculado desde etapas.</p>
                    </div>
                    <button className="primary" onClick={guardarProtocoloSeleccionado} disabled={!puedeConfigurarPlanificacion || guardandoProtocolo}>
                      {guardandoProtocolo ? 'Guardando...' : 'Guardar protocolo'}
                    </button>
                  </div>

                  <div className="protocol-form">
                    <label>
                      Nombre
                      <input
                        value={protocoloSeleccionado.nombre}
                        onChange={(event) => actualizarProtocolos((protocolo) => ({ ...protocolo, nombre: event.target.value }))}
                        disabled={!puedeConfigurarPlanificacion}
                      />
                    </label>
                    <label>
                      Actividad
                      <select
                        value={protocoloSeleccionado.actividadErpId}
                        onChange={(event) => actualizarProtocolos((protocolo) => ({ ...protocolo, actividadErpId: event.target.value }))}
                        disabled={!puedeConfigurarPlanificacion}
                      >
                        {snapshot.actividades.map((actividad) => (
                          <option key={actividad.erpId} value={actividad.erpId}>{actividad.descripcion}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Campo
                      <select
                        value={protocoloSeleccionado.campoPlanificacionId || ''}
                        onChange={(event) => actualizarProtocolos((protocolo) => ({ ...protocolo, campoPlanificacionId: event.target.value || undefined }))}
                        disabled={!puedeConfigurarPlanificacion}
                      >
                        <option value="">Todos los campos compatibles</option>
                        {planificacion.camposPlanificacion.map((campo) => (
                          <option key={campo.id} value={campo.id}>{campo.nombre}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Descripcion
                      <input
                        value={protocoloSeleccionado.descripcion}
                        onChange={(event) => actualizarProtocolos((protocolo) => ({ ...protocolo, descripcion: event.target.value }))}
                        disabled={!puedeConfigurarPlanificacion}
                      />
                    </label>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Etapas</h2>
                      <p className="hint">Cada etapa agrupa labores e insumos. El costo por ha se recalcula al editar.</p>
                    </div>
                    <button className="small" onClick={agregarEtapaProtocolo} disabled={!puedeConfigurarPlanificacion}>Agregar etapa</button>
                  </div>

                  <div className="protocol-stages">
                    {protocoloSeleccionado.etapas.map((etapa) => (
                      <article className="protocol-stage" key={etapa.id}>
                        <div className="protocol-stage-header">
                          <input
                            value={etapa.nombre}
                            onChange={(event) => actualizarEtapa(etapa.id, { nombre: event.target.value })}
                            disabled={!puedeConfigurarPlanificacion}
                          />
                          <span>Orden {etapa.orden}</span>
                        </div>

                        <div className="protocol-detail-grid">
                          <div>
                            <div className="panel-header inline">
                              <h3>Labores</h3>
                              <button className="small" onClick={() => agregarLabor(etapa.id)} disabled={!puedeConfigurarPlanificacion}>Agregar</button>
                            </div>
                            {etapa.labores.map((labor) => (
                              <div className="protocol-item" key={labor.id}>
                                <input
                                  value={labor.nombre}
                                  onChange={(event) => actualizarEtapa(etapa.id, {
                                    labores: etapa.labores.map((item) => item.id === labor.id ? { ...item, nombre: event.target.value } : item),
                                  })}
                                  disabled={!puedeConfigurarPlanificacion}
                                />
                                <input
                                  type="number"
                                  value={labor.costoUnitario}
                                  onChange={(event) => actualizarEtapa(etapa.id, {
                                    labores: etapa.labores.map((item) => item.id === labor.id ? { ...item, costoUnitario: leerNumero(event.target.value), costoPorHa: leerNumero(event.target.value) * item.cantidadPorHa } : item),
                                  })}
                                  disabled={!puedeConfigurarPlanificacion}
                                />
                                <span>{formatearUsd(labor.costoPorHa)} / ha</span>
                              </div>
                            ))}
                          </div>

                          <div>
                            <div className="panel-header inline">
                              <h3>Insumos</h3>
                              <button className="small" onClick={() => agregarInsumo(etapa.id)} disabled={!puedeConfigurarPlanificacion}>Agregar</button>
                            </div>
                            {etapa.insumos.map((insumo) => (
                              <div className="protocol-item" key={insumo.id}>
                                <input
                                  value={insumo.nombre}
                                  onChange={(event) => actualizarEtapa(etapa.id, {
                                    insumos: etapa.insumos.map((item) => item.id === insumo.id ? { ...item, nombre: event.target.value } : item),
                                  })}
                                  disabled={!puedeConfigurarPlanificacion}
                                />
                                <input
                                  type="number"
                                  value={insumo.precioUnitarioEstimado}
                                  onChange={(event) => actualizarEtapa(etapa.id, {
                                    insumos: etapa.insumos.map((item) => item.id === insumo.id ? { ...item, precioUnitarioEstimado: leerNumero(event.target.value), costoPorHa: leerNumero(event.target.value) * item.dosisPorHa } : item),
                                  })}
                                  disabled={!puedeConfigurarPlanificacion}
                                />
                                <span>{formatearUsd(insumo.costoPorHa)} / ha</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </section>
        )}

        {vista === 'empresas-erp' && puedeConfigurarErp && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Empresas asociadas a AGRO</h2>
                <p className="hint">La seleccion define con que valores de x-company se sincronizan los padrones.</p>
              </div>
              <button className="primary" onClick={guardarSeleccionEmpresas} disabled={guardandoEmpresas}>
                {guardandoEmpresas ? 'Guardando...' : 'Guardar seleccion'}
              </button>
            </div>

            <div className="company-summary">
              <article>
                <span>Disponibles</span>
                <strong>{empresasDisponibles.length}</strong>
              </article>
              <article>
                <span>Seleccionadas</span>
                <strong>{empresasSeleccionadas.length}</strong>
              </article>
            </div>

            <div className="company-table">
              {empresasDisponibles.map((empresa) => (
                <label className="company-row" key={empresa.erpId}>
                  <input
                    type="checkbox"
                    checked={empresasSeleccionadasSet.has(empresa.erpId)}
                    onChange={() => alternarEmpresa(empresa.erpId)}
                  />
                  <div>
                    <strong>{empresa.codigo} - {empresa.nombre}</strong>
                    <span>{empresa.razonSocial || 'Sin razon social'} / CUIT {empresa.cuit || '-'}</span>
                    <span>x-company: {empresa.idEmpresa}</span>
                  </div>
                  <em>{empresa.activo ? 'Activa' : 'Inactiva'}</em>
                </label>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
