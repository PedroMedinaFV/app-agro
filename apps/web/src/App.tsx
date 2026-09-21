import { useCallback, useEffect, useState } from 'react';
import { ErpCampania } from '@agro/tipos';
import { Layout } from './components/Layout';
import { LoginPanel } from './components/LoginPanel';
import { HomeScreen } from './screens/HomeScreen';
import { NotificacionesScreen } from './screens/NotificacionesScreen';
import { PlanificacionScreen } from './screens/PlanificacionScreen';
import { ProtocolosScreen } from './screens/ProtocolosScreen';
import { PreciosReferenciaScreen } from './screens/PreciosReferenciaScreen';
import { GastosComercialesScreen } from './screens/GastosComercialesScreen';
import { PrecipitacionesScreen } from './screens/PrecipitacionesScreen';
import { ObservacionesScreen } from './screens/ObservacionesScreen';
import { SeguimientoOperativoScreen } from './screens/SeguimientoOperativoScreen';
import { UsuariosAdminScreen } from './screens/UsuariosAdminScreen';
import { AuditoriaScreen } from './screens/AuditoriaScreen';
import { ConceptosGastosComercialesScreen } from './screens/ConceptosGastosComercialesScreen';
import { DestinosVentaScreen } from './screens/DestinosVentaScreen';
import { ServiciosAppScreen } from './screens/ServiciosAppScreen';
import { InsumosAppScreen } from './screens/InsumosAppScreen';
import { ZonasScreen } from './screens/ZonasScreen';
import { EspeciesAppScreen } from './screens/EspeciesAppScreen';
import { ActividadesAppScreen } from './screens/ActividadesAppScreen';
import { EmpresasErpScreen } from './screens/EmpresasErpScreen';
import { SincronizacionErpScreen } from './screens/SincronizacionErpScreen';
import { CamposScreen } from './screens/CamposScreen';
import { LotesScreen } from './screens/LotesScreen';
import { VinculacionesPadronesScreen } from './screens/VinculacionesPadronesScreen';
import { ToastViewport } from './components/ToastViewport';
import { obtenerCampaniasErpImportadas, obtenerNotificaciones } from './services/api';
import { useDemoAuth } from './hooks/useDemoAuth';
import { useErpDemo } from './hooks/useErpDemo';
import { usePlanificacion } from './hooks/usePlanificacion';
import { useProtocolos } from './hooks/useProtocolos';
import { useToast } from './hooks/useToast';
import { formatearUsd, leerNumero } from './utils/formatters';

type Vista = 'inicio' | 'notificaciones' | 'sincronizacion-erp' | 'usuarios' | 'auditoria' | 'campos' | 'lotes' | 'planificacion' | 'protocolos' | 'precios' | 'gastos' | 'seguimiento-operativo' | 'precipitaciones' | 'observaciones' | 'padrones-conceptos-gastos' | 'padrones-destinos' | 'padrones-labores' | 'padrones-insumos' | 'padrones-zonas' | 'padrones-especies' | 'padrones-actividades' | 'padrones-vinculaciones' | 'empresas-erp';

const vistasConSnapshotPlanificacion = new Set<Vista>([
  'campos',
  'lotes',
  'planificacion',
  'precios',
  'gastos',
  'padrones-conceptos-gastos',
  'padrones-destinos',
  'padrones-labores',
  'padrones-insumos',
  'padrones-vinculaciones',
]);

export function App() {
  const [vista, setVista] = useState<Vista>('inicio');
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const toast = useToast();
  const auth = useDemoAuth();
  const sesion = auth.sesion;
  const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);
  const [campaniasImportadas, setCampaniasImportadas] = useState<ErpCampania[]>([]);
  const puedeConfigurarErp = sesion?.permisos.includes('erp:configurar') || false;
  const puedeGestionarUsuarios = sesion?.permisos.includes('usuarios:gestionar') || false;
  const puedeLeerAuditoria = sesion?.permisos.includes('auditoria:leer') || false;
  const puedeGestionarCostos = sesion?.permisos.includes('costos:gestionar') || false;
  const modoCargaPlanificacion = vista === 'planificacion'
    ? 'resumen'
    : vistasConSnapshotPlanificacion.has(vista)
      ? 'snapshot'
      : false;
  const debeCargarProtocolos = vista === 'protocolos';
  const refrescarNotificaciones = useCallback(async () => {
    if (!sesion || !sesion.permisos.includes('planificacion:configurar')) {
      setNotificacionesPendientes(0);
      return;
    }

    try {
      const respuesta = await obtenerNotificaciones(sesion.token);
      setNotificacionesPendientes(respuesta.notificaciones.length);
    } catch {
      setNotificacionesPendientes(0);
    }
  }, [sesion]);
  const erp = useErpDemo(sesion, puedeConfigurarErp, toast.notify, refrescarNotificaciones);
  const planificacionApp = usePlanificacion(sesion, erp.snapshot, toast.notify, modoCargaPlanificacion);
  const protocolosApp = useProtocolos({
    sesion,
    snapshot: erp.snapshot,
    planificacion: planificacionApp.planificacion,
    planificacionActiva: planificacionApp.planificacionActiva,
    notificar: toast.notify,
    onProtocolosPersistidos: planificacionApp.incorporarProtocoloPlanificacion,
    cargarAutomaticamente: debeCargarProtocolos,
  });

  useEffect(() => {
    refrescarNotificaciones();
  }, [refrescarNotificaciones]);

  useEffect(() => {
    if (!sesion || vista !== 'planificacion') {
      setCampaniasImportadas([]);
      return;
    }

    obtenerCampaniasErpImportadas(sesion.token)
      .then((respuesta) => setCampaniasImportadas(respuesta.campanias))
      .catch(() => setCampaniasImportadas([]));
  }, [sesion, vista]);

  const lotes = erp.snapshot.lotes.map((lote) => ({
    ...lote,
    campo: erp.snapshot.campos.find((campo) => campo.erpId === lote.campoErpId),
  }));
  const zonasPorEmpresaYId = new Map(erp.snapshot.zonas.map((zona) => [`${zona.empresaErpId}:${zona.idZona}`, zona]));
  const esUsuarioComun = sesion?.usuario.rol === 'operador_campo';
  const empresasOperativas = new Set(erp.snapshot.campos.map((campo) => campo.empresaErpId));
  const campaniaActual = erp.snapshot.campanias.find((campania) => campania.esActual);
  const tituloVista = vista === 'empresas-erp'
    ? 'Empresas ERP'
    : vista === 'sincronizacion-erp'
      ? 'Sincronizacion ERP'
    : vista === 'usuarios'
      ? 'Usuarios'
    : vista === 'notificaciones'
      ? 'Notificaciones'
    : vista === 'auditoria'
      ? 'Auditoria'
    : vista === 'campos'
      ? 'Campos'
    : vista === 'lotes'
      ? 'Lotes'
    : vista === 'padrones-conceptos-gastos' || vista === 'padrones-destinos' || vista === 'padrones-labores' || vista === 'padrones-insumos' || vista === 'padrones-zonas' || vista === 'padrones-especies' || vista === 'padrones-actividades' || vista === 'padrones-vinculaciones'
      ? 'Padrones maestros'
    : vista === 'precios'
      ? 'Precios de cereales'
    : vista === 'gastos'
      ? 'Gastos comerciales'
    : vista === 'seguimiento-operativo'
      ? 'Seguimiento operativo'
    : vista === 'precipitaciones'
      ? 'Precipitaciones'
    : vista === 'observaciones'
      ? 'Observaciones'
    : vista === 'planificacion'
      ? 'Planificacion agricola'
      : vista === 'protocolos'
        ? 'Protocolos'
        : esUsuarioComun
          ? 'Mi trabajo'
          : 'Resumen de campo';
  const descripcionVista = vista === 'empresas-erp'
    ? erp.estadoEmpresas
    : vista === 'sincronizacion-erp'
      ? 'Importacion selectiva de informacion desde ALBOR'
    : vista === 'usuarios'
      ? 'Alta de usuarios, roles y campos asignados'
    : vista === 'notificaciones'
      ? 'Avisos internos generados por el sistema'
    : vista === 'auditoria'
      ? 'Consulta de cambios registrados por usuario, entidad y accion'
    : vista === 'campos'
      ? 'Padron de campos ERP y campos propios de Agro App'
    : vista === 'lotes'
      ? 'Padron de lotes ERP y lotes propios de Agro App'
    : vista === 'padrones-conceptos-gastos' || vista === 'padrones-destinos' || vista === 'padrones-labores' || vista === 'padrones-insumos' || vista === 'padrones-zonas' || vista === 'padrones-especies' || vista === 'padrones-actividades' || vista === 'padrones-vinculaciones'
      ? 'Administracion de maestros propios con permisos y auditoria'
    : vista === 'precios'
      ? 'Referencias comerciales para proponer precios en la planificacion'
    : vista === 'gastos'
      ? 'Referencias comerciales para estimar fletes, acondicionamiento y otros gastos'
    : vista === 'seguimiento-operativo'
      ? 'Ficha operativa, observaciones, fotos y precipitaciones'
    : vista === 'precipitaciones'
      ? 'Carga y consulta de lluvias por campo asignado'
    : vista === 'observaciones'
      ? 'Observaciones operativas generadas desde web y mobile'
    : vista === 'planificacion'
      ? planificacionApp.planificacionEstado
      : vista === 'protocolos'
        ? protocolosApp.protocolosEstado
        : erp.erpEstado;

  if (!sesion) {
    return (
      <LoginPanel
        error={auth.error}
        cargando={auth.cargando}
        onEmailLogin={auth.entrarConEmail}
        onMicrosoftLogin={auth.entrarConMicrosoft}
        onDemoLogin={auth.entrarModoDemo}
      />
    );
  }

  return (
    <>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismissToast} />
      <Layout
        sesion={sesion}
        sidebarAbierto={sidebarAbierto}
        onToggleSidebar={() => setSidebarAbierto((actual) => !actual)}
        onLogout={() => { setVista('inicio'); auth.cerrarSesion(); }}
        vista={vista}
        onVistaChange={setVista}
        titulo={tituloVista}
        descripcion={descripcionVista}
        puedeConfigurarErp={puedeConfigurarErp}
        puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
        puedeGestionarCostos={puedeGestionarCostos}
        puedeGestionarUsuarios={puedeGestionarUsuarios}
        puedeLeerAuditoria={puedeLeerAuditoria}
        notificacionesPendientes={notificacionesPendientes}
      >
        {vista === 'inicio' && (
          <HomeScreen
            snapshot={erp.snapshot}
            lotes={lotes}
            esUsuarioComun={esUsuarioComun}
            campaniaActual={campaniaActual}
            empresasOperativas={empresasOperativas}
            puedeConfigurarErp={puedeConfigurarErp}
            zonasPorEmpresaYId={zonasPorEmpresaYId}
          />
        )}

      {vista === 'notificaciones' && (
        <NotificacionesScreen
          sesion={sesion}
          notificar={toast.notify}
          onCantidadPendienteChange={setNotificacionesPendientes}
        />
      )}

      {vista === 'campos' && (
        <CamposScreen
          sesion={sesion}
          empresas={erp.empresasDisponibles}
          zonasPropias={planificacionApp.planificacion.zonasApp || []}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'lotes' && (
        <LotesScreen
          sesion={sesion}
          empresas={erp.empresasDisponibles}
          camposPropios={planificacionApp.planificacion.camposApp}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'planificacion' && (
        <PlanificacionScreen
          sesion={sesion}
          planificacion={planificacionApp.planificacion}
          planificacionesResumen={planificacionApp.planificacionesResumen}
          snapshot={erp.snapshot}
          campaniasDisponibles={campaniasImportadas.length ? campaniasImportadas : erp.snapshot.campanias}
          puedeEditarPlanificacion={planificacionApp.puedeEditarPlanificacion}
          puedeEditarPlanificacionPorPermiso={planificacionApp.puedeEditarPlanificacionPorPermiso}
          puedeCerrarPlanificacion={planificacionApp.puedeCerrarPlanificacion}
          guardandoPlanificacion={planificacionApp.guardandoPlanificacion}
          cerrandoPlanificacion={planificacionApp.cerrandoPlanificacion}
          cargandoPlanificacion={planificacionApp.cargandoPlanificacion}
          cargandoResumenPlanificacion={planificacionApp.cargandoResumenPlanificacion}
          planificacionActiva={planificacionApp.planificacionActiva}
          lineasPlanificacion={planificacionApp.lineasPlanificacion}
          hectareasPlanificadas={planificacionApp.hectareasPlanificadas}
          ingresoNetoTotal={planificacionApp.ingresoNetoTotal}
          costoTotal={planificacionApp.costoTotal}
          margenBrutoTotal={planificacionApp.margenBrutoTotal}
          camposProvisorios={planificacionApp.camposProvisorios}
          tieneLineasDuplicadas={planificacionApp.tieneLineasDuplicadas}
          clavesDuplicadas={planificacionApp.clavesDuplicadas}
          camposAppPorId={planificacionApp.camposAppPorId}
          lotesAppPorId={planificacionApp.lotesAppPorId}
          protocolosPorId={planificacionApp.protocolosPorId}
          asegurarPlanificacion={planificacionApp.asegurarPlanificacion}
          seleccionarPlanificacion={planificacionApp.seleccionarPlanificacion}
          crearEscenarioPlanificacion={planificacionApp.crearEscenarioPlanificacion}
          copiarEscenarioPlanificacion={planificacionApp.copiarEscenarioPlanificacion}
          actualizarCabeceraPlanificacion={planificacionApp.actualizarCabeceraPlanificacion}
          cambiarCampaniaPlanificacion={planificacionApp.cambiarCampaniaPlanificacion}
          agregarLotesAEscenario={planificacionApp.agregarLotesAEscenario}
          guardarBorradorPlanificacion={planificacionApp.guardarBorradorPlanificacion}
          cerrarPlanificacionActiva={planificacionApp.cerrarPlanificacionActiva}
          cambiarCampo={planificacionApp.cambiarCampo}
          cambiarLote={planificacionApp.cambiarLote}
          cambiarActividad={planificacionApp.cambiarActividad}
          cambiarProtocolo={planificacionApp.cambiarProtocolo}
          cambiarDestino={planificacionApp.cambiarDestino}
          actualizarLinea={planificacionApp.actualizarLinea}
          aplicarProtocoloALineas={planificacionApp.aplicarProtocoloALineas}
          aplicarDestinoALineas={planificacionApp.aplicarDestinoALineas}
          aplicarRindeALineas={planificacionApp.aplicarRindeALineas}
          copiarLineaPlanificacion={planificacionApp.copiarLineaPlanificacion}
          eliminarLineaPlanificacion={planificacionApp.eliminarLineaPlanificacion}
          eliminarLineasPlanificacion={planificacionApp.eliminarLineasPlanificacion}
          obtenerProtocolosCompatibles={planificacionApp.obtenerProtocolosCompatibles}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
      )}

      {vista === 'protocolos' && (
        <ProtocolosScreen
          sesion={sesion}
          protocolos={protocolosApp.protocolos}
          snapshot={erp.snapshot}
          planificacion={planificacionApp.planificacion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          guardandoProtocolo={protocolosApp.guardandoProtocolo}
          protocoloSeleccionadoId={protocolosApp.protocoloSeleccionadoId}
          protocoloSeleccionado={protocolosApp.protocoloSeleccionado}
          crearProtocoloVacio={protocolosApp.crearProtocoloVacio}
          copiarProtocoloSeleccionado={protocolosApp.copiarProtocoloSeleccionado}
          guardarProtocoloSeleccionado={protocolosApp.guardarProtocoloSeleccionado}
          asegurarPlanificacion={async () => { await planificacionApp.asegurarPlanificacion(); }}
          formatearUsd={formatearUsd}
          setProtocoloSeleccionadoId={protocolosApp.setProtocoloSeleccionadoId}
        />
      )}

      {vista === 'precios' && (
        <PreciosReferenciaScreen
          sesion={sesion}
          planificacion={planificacionApp.planificacion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          guardandoPrecios={planificacionApp.guardandoPrecios}
          guardarPrecioReferencia={planificacionApp.guardarPrecioReferenciaDesdeModal}
          formatearUsd={formatearUsd}
        />
      )}

      {vista === 'gastos' && (
        <GastosComercialesScreen
          sesion={sesion}
          planificacion={planificacionApp.planificacion}
          campanias={erp.snapshot.campanias}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          guardandoGastos={planificacionApp.guardandoGastos}
          guardarGastoComercial={planificacionApp.guardarGastoComercialDesdeModal}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
      )}

      {vista === 'precipitaciones' && (
        <PrecipitacionesScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'seguimiento-operativo' && (
        <SeguimientoOperativoScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'observaciones' && (
        <ObservacionesScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'usuarios' && (
        <UsuariosAdminScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'auditoria' && (
        <AuditoriaScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'padrones-conceptos-gastos' && (
        <ConceptosGastosComercialesScreen
          planificacion={planificacionApp.planificacion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          guardandoConceptos={planificacionApp.guardandoConceptosGastos}
          guardarConcepto={planificacionApp.guardarConceptoGastoComercialDesdeModal}
        />
      )}

      {vista === 'padrones-destinos' && (
        <DestinosVentaScreen
          sesion={sesion}
          planificacion={planificacionApp.planificacion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          guardandoDestinos={planificacionApp.guardandoDestinos}
          guardarDestino={planificacionApp.guardarDestinoVentaDesdeModal}
        />
      )}

      {vista === 'padrones-labores' && (
        <ServiciosAppScreen
          sesion={sesion}
          planificacion={planificacionApp.planificacion}
          snapshot={erp.snapshot}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion || puedeGestionarCostos}
          guardandoLabores={planificacionApp.guardandoLabores}
          guardarServicio={planificacionApp.guardarServicioAppDesdeModal}
          leerNumero={leerNumero}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-insumos' && (
        <InsumosAppScreen
          sesion={sesion}
          planificacion={planificacionApp.planificacion}
          snapshot={erp.snapshot}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion || puedeGestionarCostos}
          guardandoInsumos={planificacionApp.guardandoInsumos}
          guardarInsumo={planificacionApp.guardarInsumoAppDesdeModal}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-zonas' && (
        <ZonasScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-especies' && (
        <EspeciesAppScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-actividades' && (
        <ActividadesAppScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-vinculaciones' && (
        <VinculacionesPadronesScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionApp.puedeConfigurarPlanificacion}
          notificar={toast.notify}
          onVinculacionesActualizadas={async () => { await planificacionApp.refrescarPlanificacion({ forzar: true }); }}
        />
      )}

      {vista === 'empresas-erp' && (
        <EmpresasErpScreen
          puedeConfigurarErp={puedeConfigurarErp}
          guardandoEmpresas={erp.guardandoEmpresas}
          empresasDisponibles={erp.empresasDisponibles}
          empresasSeleccionadas={erp.empresasSeleccionadas}
          empresasSeleccionadasSet={erp.empresasSeleccionadasSet}
          guardarSeleccionEmpresas={erp.guardarSeleccionEmpresas}
          alternarEmpresa={erp.alternarEmpresa}
        />
      )}

      {vista === 'sincronizacion-erp' && (
        <SincronizacionErpScreen
          puedeConfigurarErp={puedeConfigurarErp}
          sincronizandoPadrones={erp.sincronizandoPadrones}
          ultimoResultadoSync={erp.ultimoResultadoSync}
          historialSincronizaciones={erp.historialSincronizaciones}
          empresasSeleccionadas={erp.empresasSeleccionadas}
          sincronizarPadrones={erp.sincronizarPadrones}
        />
      )}
      </Layout>
    </>
  );
}

