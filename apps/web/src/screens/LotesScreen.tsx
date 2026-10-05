import { useEffect, useState } from 'react';
import type { CampoApp, ErpCampo, ErpEmpresa, ErpLote, LoteApp, SesionUsuario } from '@agro/tipos';
import { FiltrosLotes } from '../components/lotes/FiltrosLotes';
import { FormularioLoteModal } from '../components/lotes/FormularioLoteModal';
import { MetricasLotes } from '../components/lotes/MetricasLotes';
import { ModalArchivosGeograficosLote } from '../components/lotes/ModalArchivosGeograficosLote';
import { ModalVincularLote } from '../components/lotes/ModalVincularLote';
import { TablaLotes } from '../components/lotes/TablaLotes';
import { Panel } from '../components/Panel';
import { useArchivosGeograficosLote } from '../hooks/useArchivosGeograficosLote';
import { useFormularioLote } from '../hooks/useFormularioLote';
import { useLotesDerivados } from '../hooks/useLotesDerivados';
import { useVinculacionLote } from '../hooks/useVinculacionLote';
import {
  obtenerCamposErpImportados,
  obtenerCamposApp,
  obtenerLotesErpImportados,
  obtenerLotesApp,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type LotesScreenProps = {
  sesion: SesionUsuario;
  empresas: ErpEmpresa[];
  camposPropios: CampoApp[];
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

export function LotesScreen({ sesion, empresas, camposPropios, puedeConfigurarPlanificacion, notificar }: LotesScreenProps) {
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [camposPropiosActuales, setCamposPropiosActuales] = useState<CampoApp[]>(camposPropios);
  const [lotesPropios, setLotesPropios] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando lotes sincronizados.');
  const [filtroCampoClave, setFiltroCampoClave] = useState('');
  const [filtro, setFiltro] = useState('');
  const {
    loteArchivosGeograficos,
    archivosGeograficos,
    archivoGeograficoSeleccionado,
    guardandoArchivos,
    abrirArchivosGeograficos,
    cerrarArchivosGeograficos,
    setArchivoGeograficoSeleccionado,
    subirArchivoGeografico,
  } = useArchivosGeograficosLote({
    token: sesion.token,
    clienteId: sesion.usuario.clienteId || '',
    notificar,
  });
  const {
    lotePropioParaVincular,
    loteErpVincularId,
    guardandoVinculacion,
    abrirVinculacion,
    cerrarVinculacion,
    setLoteErpVincularId,
    confirmarVinculacionLote,
  } = useVinculacionLote({
    token: sesion.token,
    lotesErp,
    lotesPropios,
    camposPropios: camposPropiosActuales,
    onLotesPropiosChange: setLotesPropios,
    onEstadoChange: setEstado,
    notificar,
  });

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

  const {
    camposPropiosPorId,
    camposErpPorId,
    camposSeleccionables,
    camposSeleccionablesPorClave,
    camposParaFiltrar,
    lotesErpSugeridosParaVincular,
    filasLote,
    metricasLotes,
  } = useLotesDerivados({
    empresas,
    camposPropios: camposPropiosActuales,
    camposErp,
    lotesPropios,
    lotesErp,
    filtro,
    filtroCampoClave,
    lotePropioParaVincular,
  });
  const {
    loteEnEdicion,
    modoFormulario,
    campoSeleccionadoClave,
    guardandoLote,
    abrirNuevoLote,
    editarLote,
    copiarLote,
    copiarLoteErp,
    seleccionarCampo,
    setLoteEnEdicion,
    guardarLote,
  } = useFormularioLote({
    token: sesion.token,
    clienteId: sesion.usuario.clienteId || '',
    puedeConfigurarPlanificacion,
    camposSeleccionables,
    camposSeleccionablesPorClave,
    camposPropiosPorId,
    camposPropios: camposPropiosActuales,
    camposErpPorId,
    onCamposPropiosChange: setCamposPropiosActuales,
    onLotesPropiosChange: setLotesPropios,
    onEstadoChange: setEstado,
    notificar,
  });

  return (
    <div className="planning-stack">
      <MetricasLotes {...metricasLotes} />

      <Panel
        title="Lotes"
        description={estado}
        actions={(
          <FiltrosLotes
            filtro={filtro}
            filtroCampoClave={filtroCampoClave}
            camposParaFiltrar={camposParaFiltrar}
            puedeConfigurarPlanificacion={puedeConfigurarPlanificacion}
            onCambiarFiltro={setFiltro}
            onCambiarCampo={setFiltroCampoClave}
            onNuevoLote={abrirNuevoLote}
          />
        )}
      >
        <TablaLotes
          filas={filasLote}
          puedeConfigurarPlanificacion={puedeConfigurarPlanificacion}
          onEditarLote={editarLote}
          onCopiarLote={copiarLote}
          onCopiarLoteErp={copiarLoteErp}
          onAbrirArchivosGeograficos={abrirArchivosGeograficos}
          onAbrirVinculacion={abrirVinculacion}
        />
      </Panel>

      {loteEnEdicion && (
        <FormularioLoteModal
          lote={loteEnEdicion}
          modo={modoFormulario}
          camposSeleccionables={camposSeleccionables}
          campoSeleccionadoClave={campoSeleccionadoClave}
          guardando={guardandoLote}
          onClose={() => setLoteEnEdicion(null)}
          onSeleccionarCampo={seleccionarCampo}
          onActualizarLote={(lote) => setLoteEnEdicion(lote)}
          onGuardar={guardarLote}
        />
      )}
      {lotePropioParaVincular && (
        <ModalVincularLote
          lote={lotePropioParaVincular}
          loteErpVincularId={loteErpVincularId}
          sugerencias={lotesErpSugeridosParaVincular}
          camposErpPorId={camposErpPorId}
          guardando={guardandoVinculacion}
          onClose={cerrarVinculacion}
          onChangeLoteErp={setLoteErpVincularId}
          onConfirmar={confirmarVinculacionLote}
        />
      )}
      {loteArchivosGeograficos && (
        <ModalArchivosGeograficosLote
          lote={loteArchivosGeograficos}
          archivos={archivosGeograficos}
          archivoSeleccionado={archivoGeograficoSeleccionado}
          guardando={guardandoArchivos}
          onClose={cerrarArchivosGeograficos}
          onSeleccionarArchivo={setArchivoGeograficoSeleccionado}
          onSubirArchivo={subirArchivoGeografico}
        />
      )}
    </div>
  );
}
