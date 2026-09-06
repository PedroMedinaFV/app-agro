import { useEffect, useState } from 'react';
import { ErpEmpresa, ErpSnapshot, SesionUsuario } from '@agro/tipos';
import { guardarEmpresasErpAdmin, obtenerEmpresasErpAdmin, obtenerSnapshotErp, sincronizarPadronesErp, SincronizacionErpResultado } from '../services/api';
import { snapshotFallback } from '../data/demoData';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

export function useErpDemo(
  sesion: SesionUsuario | null,
  puedeConfigurarErp: boolean,
  notificar?: Notificar,
  onSincronizacionCompletada?: () => Promise<void> | void,
) {
  const [snapshot, setSnapshot] = useState<ErpSnapshot>(snapshotFallback);
  const [erpEstado, setErpEstado] = useState('Datos ERP locales');
  const [empresasDisponibles, setEmpresasDisponibles] = useState<ErpEmpresa[]>(snapshotFallback.empresas);
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState<string[]>(['empresa:1']);
  const [guardandoEmpresas, setGuardandoEmpresas] = useState(false);
  const [sincronizandoPadrones, setSincronizandoPadrones] = useState(false);
  const [ultimoResultadoSync, setUltimoResultadoSync] = useState<SincronizacionErpResultado['resultado'] | null>(null);
  const [estadoEmpresas, setEstadoEmpresas] = useState('Seleccion local para modo demo.');

  useEffect(() => {
    async function cargarDatosErp() {
      if (!sesion || puedeConfigurarErp) {
        return;
      }

      try {
        const datosErp = await obtenerSnapshotErp(sesion.token);
        setSnapshot(datosErp);
        if (!puedeConfigurarErp) {
          setEmpresasDisponibles(datosErp.empresas);
          setEmpresasSeleccionadas((actuales) => actuales.length ? actuales : datosErp.empresas.slice(0, 1).map((empresa) => empresa.erpId));
        }
        setErpEstado('Datos ERP desde backend');
      } catch (error) {
        setSnapshot(snapshotFallback);
        if (!puedeConfigurarErp) {
          setEmpresasDisponibles(snapshotFallback.empresas);
        }
        setErpEstado('API ERP no disponible. Usando mock local.');
      }
    }

    cargarDatosErp();
  }, [sesion, puedeConfigurarErp]);

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
      notificar?.({
        tipo: 'success',
        titulo: 'Empresas guardadas',
        mensaje: 'La seleccion AGRO fue persistida en backend.',
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la seleccion.';
      setEstadoEmpresas(`No se pudo guardar la seleccion: ${mensaje}`);
      notificar?.({
        tipo: 'error',
        titulo: 'No se guardo la seleccion',
        mensaje,
      });
    } finally {
      setGuardandoEmpresas(false);
    }
  }

  async function sincronizarPadrones() {
    if (!sesion) {
      return;
    }

    setSincronizandoPadrones(true);
    setEstadoEmpresas('Sincronizando padrones desde ALBOR.');

    try {
      const respuesta = await sincronizarPadronesErp(sesion.token);
      setUltimoResultadoSync(respuesta.resultado);
      setEstadoEmpresas(`Padrones sincronizados: ${respuesta.resultado.sincronizadoEn}`);
      await onSincronizacionCompletada?.();
      const sugerencias = respuesta.resultado.sugerenciasVinculacion;
      const mensajeSugerencias = sugerencias?.creadas
        ? ` Se generaron ${sugerencias.creadas} notificaciones de vinculacion.`
        : ' No se generaron nuevas sugerencias de vinculacion.';
      notificar?.({
        tipo: 'success',
        titulo: 'Padrones sincronizados',
        mensaje: `${respuesta.resultado.campos} campos, ${respuesta.resultado.lotes} lotes y ${respuesta.resultado.cultivos} cultivos actualizados.${mensajeSugerencias}`,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron sincronizar padrones.';
      setEstadoEmpresas(`No se pudo sincronizar: ${mensaje}`);
      notificar?.({
        tipo: 'error',
        titulo: 'No se sincronizo',
        mensaje,
      });
    } finally {
      setSincronizandoPadrones(false);
    }
  }

  return {
    snapshot,
    erpEstado,
    empresasDisponibles,
    empresasSeleccionadas,
    empresasSeleccionadasSet: new Set(empresasSeleccionadas),
    guardandoEmpresas,
    sincronizandoPadrones,
    ultimoResultadoSync,
    estadoEmpresas,
    alternarEmpresa,
    guardarSeleccionEmpresas,
    sincronizarPadrones,
  };
}
