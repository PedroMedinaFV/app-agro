import { useState } from 'react';
import { Layout } from './components/Layout';
import { LoginPanel } from './components/LoginPanel';
import { HomeScreen } from './screens/HomeScreen';
import { PlanificacionScreen } from './screens/PlanificacionScreen';
import { ProtocolosScreen } from './screens/ProtocolosScreen';
import { PreciosReferenciaScreen } from './screens/PreciosReferenciaScreen';
import { GastosComercialesScreen } from './screens/GastosComercialesScreen';
import { ConceptosGastosComercialesScreen } from './screens/ConceptosGastosComercialesScreen';
import { DestinosVentaScreen } from './screens/DestinosVentaScreen';
import { LaboresReferenciaScreen } from './screens/LaboresReferenciaScreen';
import { InsumosPlanificacionScreen } from './screens/InsumosPlanificacionScreen';
import { EmpresasErpScreen } from './screens/EmpresasErpScreen';
import { ToastViewport } from './components/ToastViewport';
import { useDemoAuth } from './hooks/useDemoAuth';
import { useErpDemo } from './hooks/useErpDemo';
import { usePlanificacionDemo } from './hooks/usePlanificacionDemo';
import { useProtocolosDemo } from './hooks/useProtocolosDemo';
import { useToast } from './hooks/useToast';
import { formatearUsd, leerNumero } from './utils/formatters';

type Vista = 'inicio' | 'planificacion' | 'protocolos' | 'precios' | 'gastos' | 'padrones-conceptos-gastos' | 'padrones-destinos' | 'padrones-labores' | 'padrones-insumos' | 'empresas-erp';

export function App() {
  const [vista, setVista] = useState<Vista>('inicio');
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const toast = useToast();
  const auth = useDemoAuth();
  const sesion = auth.sesion;
  const puedeConfigurarErp = sesion?.permisos.includes('erp:configurar') || false;
  const erp = useErpDemo(sesion, puedeConfigurarErp, toast.notify);
  const planificacionDemo = usePlanificacionDemo(sesion, erp.snapshot, toast.notify);
  const protocolosDemo = useProtocolosDemo({
    sesion,
    snapshot: erp.snapshot,
    planificacion: planificacionDemo.planificacion,
    planificacionActiva: planificacionDemo.planificacionActiva,
    notificar: toast.notify,
  });

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
    : vista === 'padrones-conceptos-gastos' || vista === 'padrones-destinos' || vista === 'padrones-labores' || vista === 'padrones-insumos'
      ? 'Padrones maestros'
    : vista === 'precios'
      ? 'Precios de cereales'
    : vista === 'gastos'
      ? 'Gastos comerciales'
    : vista === 'planificacion'
      ? 'Planificacion agricola'
      : vista === 'protocolos'
        ? 'Protocolos'
        : esUsuarioComun
          ? 'Mi trabajo'
          : 'Resumen de campo';
  const descripcionVista = vista === 'empresas-erp'
    ? erp.estadoEmpresas
    : vista === 'padrones-conceptos-gastos' || vista === 'padrones-destinos' || vista === 'padrones-labores' || vista === 'padrones-insumos'
      ? 'Administracion de maestros propios con permisos y auditoria'
    : vista === 'precios'
      ? 'Referencias comerciales para proponer precios en la planificacion'
    : vista === 'gastos'
      ? 'Referencias comerciales para estimar fletes, acondicionamiento y otros gastos'
    : vista === 'planificacion'
      ? planificacionDemo.planificacionEstado
      : vista === 'protocolos'
        ? protocolosDemo.protocolosEstado
        : erp.erpEstado;

  if (!sesion) {
    return (
      <LoginPanel
        email={auth.email}
        onEmailChange={auth.setEmail}
        password={auth.password}
        onPasswordChange={auth.setPassword}
        rol={auth.rol}
        onRolChange={auth.setRol}
        error={auth.error}
        cargando={auth.cargando}
        onLogin={auth.entrarModoDemo}
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
          actualizarCabeceraPlanificacion={planificacionDemo.actualizarCabeceraPlanificacion}
          cambiarCampaniaPlanificacion={planificacionDemo.cambiarCampaniaPlanificacion}
          agregarLineaPlanificacion={planificacionDemo.agregarLineaPlanificacion}
          guardarBorradorPlanificacion={planificacionDemo.guardarBorradorPlanificacion}
          cerrarPlanificacionActiva={planificacionDemo.cerrarPlanificacionActiva}
          cambiarCampo={planificacionDemo.cambiarCampo}
          cambiarLote={planificacionDemo.cambiarLote}
          cambiarActividad={planificacionDemo.cambiarActividad}
          cambiarDestino={planificacionDemo.cambiarDestino}
          actualizarLinea={planificacionDemo.actualizarLinea}
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
          planificacion={planificacionDemo.planificacion}
          campanias={erp.snapshot.campanias}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoGastos={planificacionDemo.guardandoGastos}
          guardarGastoComercial={planificacionDemo.guardarGastoComercialDesdeModal}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
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
          planificacion={planificacionDemo.planificacion}
          snapshot={erp.snapshot}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoLabores={planificacionDemo.guardandoLabores}
          guardarLabor={planificacionDemo.guardarLaborReferenciaDesdeModal}
          leerNumero={leerNumero}
          formatearUsd={formatearUsd}
        />
      )}

      {vista === 'padrones-insumos' && (
        <InsumosPlanificacionScreen
          planificacion={planificacionDemo.planificacion}
          snapshot={erp.snapshot}
          puedeConfigurarPlanificacion={planificacionDemo.puedeConfigurarPlanificacion}
          guardandoInsumos={planificacionDemo.guardandoInsumos}
          guardarInsumo={planificacionDemo.guardarInsumoPlanificacionDesdeModal}
          leerNumero={leerNumero}
          formatearUsd={formatearUsd}
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
      </Layout>
    </>
  );
}
