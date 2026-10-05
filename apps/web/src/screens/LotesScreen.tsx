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
import { useLotesDerivados } from '../hooks/useLotesDerivados';
import { useVinculacionLote } from '../hooks/useVinculacionLote';
import {
  guardarCampoApp,
  guardarLoteApp,
  obtenerCamposErpImportados,
  obtenerCamposApp,
  obtenerLotesErpImportados,
  obtenerLotesApp,
} from '../services/api';
import {
  crearIdCampoDesdeErp,
  crearLoteNuevo,
  limpiarTextoVisible,
  normalizarCodigo,
} from '../utils/lotes/helpersLotes';

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
  const [guardando, setGuardando] = useState(false);
  const [loteEnEdicion, setLoteEnEdicion] = useState<LoteApp | null>(null);
  const [modoFormulario, setModoFormulario] = useState<'crear' | 'editar' | 'copiar'>('crear');
  const [campoSeleccionadoClave, setCampoSeleccionadoClave] = useState('');
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
    setLoteEnEdicion(crearLoteNuevo(sesion.usuario.clienteId || '', campoSugerido.campoAppId || ''));
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
      clienteId: sesion.usuario.clienteId || '',
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
      clienteId: sesion.usuario.clienteId || '',
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
          guardando={guardando}
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
