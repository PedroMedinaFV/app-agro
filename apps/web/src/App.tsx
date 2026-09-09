import { useCallback, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoginPanel } from './components/LoginPanel';
import { HomeScreen } from './screens/HomeScreen';
import { NotificacionesScreen } from './screens/NotificacionesScreen';
import { PlanificacionScreen } from './screens/PlanificacionScreen';
import { ProtocolosScreen } from './screens/ProtocolosScreen';
import { PreciosReferenciaScreen } from './screens/PreciosReferenciaScreen';
import { GastosComercialesScreen } from './screens/GastosComercialesScreen';
import { PrecipitacionesScreen } from './screens/PrecipitacionesScreen';
import { UsuariosAdminScreen } from './screens/UsuariosAdminScreen';
import { ConceptosGastosComercialesScreen } from './screens/ConceptosGastosComercialesScreen';
import { DestinosVentaScreen } from './screens/DestinosVentaScreen';
import { LaboresReferenciaScreen } from './screens/LaboresReferenciaScreen';
import { InsumosPlanificacionScreen } from './screens/InsumosPlanificacionScreen';
import { ZonasScreen } from './screens/ZonasScreen';
import { EspeciesPlanificacionScreen } from './screens/EspeciesPlanificacionScreen';
import { ActividadesPlanificacionScreen } from './screens/ActividadesPlanificacionScreen';
import { EmpresasErpScreen } from './screens/EmpresasErpScreen';
import { SincronizacionErpScreen } from './screens/SincronizacionErpScreen';
import { CamposScreen } from './screens/CamposScreen';
import { LotesScreen } from './screens/LotesScreen';
import { VinculacionesPadronesScreen } from './screens/VinculacionesPadronesScreen';
import { ToastViewport } from './components/ToastViewport';
import { obtenerNotificaciones } from './services/api';
import { useDemoAuth } from './hooks/useDemoAuth';
import { useErpDemo } from './hooks/useErpDemo';
import { usePlanificacionDemo } from './hooks/usePlanificacionDemo';
import { useProtocolosDemo } from './hooks/useProtocolosDemo';
import { useToast } from './hooks/useToast';
import { formatearUsd, leerNumero } from './utils/formatters';

type Vista = 'inicio' | 'notificaciones' | 'sincronizacion-erp' | 'usuarios' | 'campos' | 'lotes' | 'planificacion' | 'protocolos' | 'precios' | 'gastos' | 'precipitaciones' | 'padrones-conceptos-gastos' | 'padrones-destinos' | 'padrones-labores' | 'padrones-insumos' | 'padrones-zonas' | 'padrones-especies' | 'padrones-actividades' | 'padrones-vinculaciones' | 'empresas-erp';

export function App() {
  const [vista, setVista] = useState<Vista>('inicio');
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const toast = useToast();
  const auth = useDemoAuth();
  const sesion = auth.sesion;
  const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);
  const puedeConfigurarErp = sesion?.permisos.includes('erp:configurar') || false;
  const puedeGestionarUsuarios = sesion?.permisos.includes('usuarios:gestionar') || false;
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
  const planificacionDemo = usePlanificacionDemo(sesion, erp.snapshot, toast.notify);
  const protocolosDemo = useProtocolosDemo({
    sesion,
    snapshot: erp.snapshot,
    planificacion: planificacionDemo.planificacion,
    planificacionActiva: planificacionDemo.planificacionActiva,
    notificar: toast.notify,
  });

  useEffect(() => {
    refrescarNotificaciones();
  }, [refrescarNotificaciones]);

  const lotes = erp.snapshot.lotes.map((lote) => ({
    ...lote,
    campo: erp.snapshot.campos.find((campo) => campo.erpId === lote.campoErpId),
  }));
  const zonasPorEmpresaYId = new Map(erp.snapshot.zonas.map((zona) => [`${zona.empresaErpId}:${zona.idZona}`, zona]));
  const esUsuarioComun = sesion?.usuario.rol === 'usuario';
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
    : vista === 'precipitaciones'
      ? 'Precipitaciones'
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
    : vista === 'precipitaciones'
      ? 'Carga y consulta de lluvias por campo asignado'
    : vista === 'planificacion'
      ? planificacionDemo.planificacionEstado
      : vista === 'protocolos'
        ? protocolosDemo.protocolosEstado
        : erp.erpEstado;

  if (!sesion) {
    return (
      <LoginPanel
        error={auth.error}
        cargando={auth.cargando}
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
        puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
        puedeGestionarUsuarios={puedeGestionarUsuarios}
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
          zonasPropias={planificacionDemo.planificacion.zonasPlanificacion || []}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'lotes' && (
        <LotesScreen
          sesion={sesion}
          empresas={erp.empresasDisponibles}
          camposPropios={planificacionDemo.planificacion.camposPlanificacion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'planificacion' && (
        <PlanificacionScreen
          planificacion={planificacionDemo.planificacion}
          snapshot={erp.snapshot}
          puedeEditarPlanificacion={planificacionDemo.puedeEditarPlanificacion}
          puedeEditarPlanificacionPorPermiso={planificacionDemo.puedeEditarPlanificacionPorPermiso}
          puedeCerrarPlanificacion={planificacionDemo.puedeCerrarPlanificacion}
          guardandoPlanificacion={planificacionDemo.guardandoPlanificacion}
          cerrandoPlanificacion={planificacionDemo.cerrandoPlanificacion}
          planificacionActiva={planificacionDemo.planificacionActiva}
          lineasPlanificacion={planificacionDemo.lineasPlanificacion}
          hectareasPlanificadas={planificacionDemo.hectareasPlanificadas}
          ingresoNetoTotal={planificacionDemo.ingresoNetoTotal}
          costoTotal={planificacionDemo.costoTotal}
          margenBrutoTotal={planificacionDemo.margenBrutoTotal}
          camposProvisorios={planificacionDemo.camposProvisorios}
          tieneLineasDuplicadas={planificacionDemo.tieneLineasDuplicadas}
          clavesDuplicadas={planificacionDemo.clavesDuplicadas}
          camposPlanificacionPorId={planificacionDemo.camposPlanificacionPorId}
          lotesPlanificacionPorId={planificacionDemo.lotesPlanificacionPorId}
          protocolosPorId={planificacionDemo.protocolosPorId}
          seleccionarPlanificacion={planificacionDemo.seleccionarPlanificacion}
          crearEscenarioPlanificacion={planificacionDemo.crearEscenarioPlanificacion}
          copiarEscenarioPlanificacion={planificacionDemo.copiarEscenarioPlanificacion}
          actualizarCabeceraPlanificacion={planificacionDemo.actualizarCabeceraPlanificacion}
          cambiarCampaniaPlanificacion={planificacionDemo.cambiarCampaniaPlanificacion}
          agregarLineaPlanificacion={planificacionDemo.agregarLineaPlanificacion}
          guardarBorradorPlanificacion={planificacionDemo.guardarBorradorPlanificacion}
          cerrarPlanificacionActiva={planificacionDemo.cerrarPlanificacionActiva}
          cambiarCampo={planificacionDemo.cambiarCampo}
          cambiarLote={planificacionDemo.cambiarLote}
          cambiarActividad={planificacionDemo.cambiarActividad}
          cambiarProtocolo={planificacionDemo.cambiarProtocolo}
          cambiarDestino={planificacionDemo.cambiarDestino}
          actualizarLinea={planificacionDemo.actualizarLinea}
          copiarLineaPlanificacion={planificacionDemo.copiarLineaPlanificacion}
          eliminarLineaPlanificacion={planificacionDemo.eliminarLineaPlanificacion}
          obtenerProtocolosCompatibles={planificacionDemo.obtenerProtocolosCompatibles}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
      )}

      {vista === 'protocolos' && (
        <ProtocolosScreen
          protocolos={protocolosDemo.protocolos}
          snapshot={erp.snapshot}
          planificacion={planificacionDemo.planificacion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoProtocolo={protocolosDemo.guardandoProtocolo}
          protocoloSeleccionadoId={protocolosDemo.protocoloSeleccionadoId}
          protocoloSeleccionado={protocolosDemo.protocoloSeleccionado}
          crearProtocoloVacio={protocolosDemo.crearProtocoloVacio}
          copiarProtocoloSeleccionado={protocolosDemo.copiarProtocoloSeleccionado}
          guardarProtocoloSeleccionado={protocolosDemo.guardarProtocoloSeleccionado}
          actualizarProtocolos={protocolosDemo.actualizarProtocolos}
          agregarEtapaProtocolo={protocolosDemo.agregarEtapaProtocolo}
          actualizarEtapa={protocolosDemo.actualizarEtapa}
          agregarLabor={protocolosDemo.agregarLabor}
          agregarInsumo={protocolosDemo.agregarInsumo}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
          setProtocoloSeleccionadoId={protocolosDemo.setProtocoloSeleccionadoId}
        />
      )}

      {vista === 'precios' && (
        <PreciosReferenciaScreen
          sesion={sesion}
          planificacion={planificacionDemo.planificacion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoPrecios={planificacionDemo.guardandoPrecios}
          guardarPrecioReferencia={planificacionDemo.guardarPrecioReferenciaDesdeModal}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
      )}

      {vista === 'gastos' && (
        <GastosComercialesScreen
          sesion={sesion}
          planificacion={planificacionDemo.planificacion}
          campanias={erp.snapshot.campanias}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoGastos={planificacionDemo.guardandoGastos}
          guardarGastoComercial={planificacionDemo.guardarGastoComercialDesdeModal}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
      )}

      {vista === 'precipitaciones' && (
        <PrecipitacionesScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'usuarios' && (
        <UsuariosAdminScreen sesion={sesion} notificar={toast.notify} />
      )}

      {vista === 'padrones-conceptos-gastos' && (
        <ConceptosGastosComercialesScreen
          planificacion={planificacionDemo.planificacion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoConceptos={planificacionDemo.guardandoConceptosGastos}
          guardarConcepto={planificacionDemo.guardarConceptoGastoComercialDesdeModal}
        />
      )}

      {vista === 'padrones-destinos' && (
        <DestinosVentaScreen
          planificacion={planificacionDemo.planificacion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoDestinos={planificacionDemo.guardandoDestinos}
          guardarDestino={planificacionDemo.guardarDestinoVentaDesdeModal}
        />
      )}

      {vista === 'padrones-labores' && (
        <LaboresReferenciaScreen
          sesion={sesion}
          planificacion={planificacionDemo.planificacion}
          snapshot={erp.snapshot}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoLabores={planificacionDemo.guardandoLabores}
          guardarLabor={planificacionDemo.guardarLaborReferenciaDesdeModal}
          leerNumero={leerNumero}
          formatearUsd={formatearUsd}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-insumos' && (
        <InsumosPlanificacionScreen
          sesion={sesion}
          planificacion={planificacionDemo.planificacion}
          snapshot={erp.snapshot}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoInsumos={planificacionDemo.guardandoInsumos}
          guardarInsumo={planificacionDemo.guardarInsumoPlanificacionDesdeModal}
          leerNumero={leerNumero}
          formatearUsd={formatearUsd}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-zonas' && (
        <ZonasScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-especies' && (
        <EspeciesPlanificacionScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-actividades' && (
        <ActividadesPlanificacionScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          notificar={toast.notify}
        />
      )}

      {vista === 'padrones-vinculaciones' && (
        <VinculacionesPadronesScreen
          sesion={sesion}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          notificar={toast.notify}
          onVinculacionesActualizadas={planificacionDemo.refrescarPlanificacion}
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
