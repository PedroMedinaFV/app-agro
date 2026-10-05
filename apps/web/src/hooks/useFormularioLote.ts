import { useState, type Dispatch, type SetStateAction } from 'react';
import type { CampoApp, ErpCampo, ErpLote, LoteApp } from '@agro/tipos';
import type { CampoSeleccionable } from '../components/lotes/tiposLotes';
import { guardarCampoApp, guardarLoteApp } from '../services/api';
import {
  crearIdCampoDesdeErp,
  crearLoteNuevo,
  limpiarTextoVisible,
  normalizarCodigo,
} from '../utils/lotes/helpersLotes';

type ModoFormularioLote = 'crear' | 'editar' | 'copiar';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type UseFormularioLoteParams = {
  token: string;
  clienteId: string;
  puedeConfigurarPlanificacion: boolean;
  camposSeleccionables: CampoSeleccionable[];
  camposSeleccionablesPorClave: Map<string, CampoSeleccionable>;
  camposPropiosPorId: Map<string, CampoApp>;
  camposPropios: CampoApp[];
  camposErpPorId: Map<string, ErpCampo>;
  onCamposPropiosChange: Dispatch<SetStateAction<CampoApp[]>>;
  onLotesPropiosChange: Dispatch<SetStateAction<LoteApp[]>>;
  onEstadoChange: (estado: string) => void;
  notificar?: Notificar;
};

export function useFormularioLote({
  token,
  clienteId,
  puedeConfigurarPlanificacion,
  camposSeleccionables,
  camposSeleccionablesPorClave,
  camposPropiosPorId,
  camposPropios,
  camposErpPorId,
  onCamposPropiosChange,
  onLotesPropiosChange,
  onEstadoChange,
  notificar,
}: UseFormularioLoteParams) {
  const [loteEnEdicion, setLoteEnEdicion] = useState<LoteApp | null>(null);
  const [modoFormulario, setModoFormulario] = useState<ModoFormularioLote>('crear');
  const [campoSeleccionadoClave, setCampoSeleccionadoClave] = useState('');
  const [guardandoLote, setGuardandoLote] = useState(false);

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
    setLoteEnEdicion(crearLoteNuevo(clienteId, campoSugerido.campoAppId || ''));
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
      clienteId,
      campoAppId: '',
      loteErpId: undefined,
      nombre: lote.nombre,
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

    const existente = camposPropios.find((campo) => campo.campoErpId === campoSeleccionado.campoErpId);

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
      clienteId,
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
    }, token);

    onCamposPropiosChange((actuales) => [respuesta.campo, ...actuales]);
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

    setGuardandoLote(true);

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
      }, token);

      onLotesPropiosChange((actuales) => {
        const existe = actuales.some((lote) => lote.id === respuesta.lote.id);
        return existe
          ? actuales.map((lote) => (lote.id === respuesta.lote.id ? respuesta.lote : lote))
          : [respuesta.lote, ...actuales];
      });
      setLoteEnEdicion(null);
      onEstadoChange('Lote guardado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Lote guardado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el lote.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo el lote', mensaje });
    } finally {
      setGuardandoLote(false);
    }
  }

  return {
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
  };
}
