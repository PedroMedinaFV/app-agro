import { useState } from 'react';
import type { LoteApp, LoteArchivoGeografico } from '@agro/tipos';
import {
  crearUrlSubidaArchivoGeograficoLote,
  guardarArchivoGeograficoLote,
  obtenerArchivosGeograficosLote,
  subirArchivoAFirmaSupabase,
} from '../services/api';
import {
  crearIdArchivoGeografico,
  obtenerMimeArchivoGeografico,
  obtenerTipoArchivoGeografico,
} from '../utils/lotes/helpersLotes';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type UseArchivosGeograficosLoteParams = {
  token: string;
  clienteId: string;
  notificar?: Notificar;
};

export function useArchivosGeograficosLote({ token, clienteId, notificar }: UseArchivosGeograficosLoteParams) {
  const [loteArchivosGeograficos, setLoteArchivosGeograficos] = useState<LoteApp | null>(null);
  const [archivosGeograficos, setArchivosGeograficos] = useState<LoteArchivoGeografico[]>([]);
  const [archivoGeograficoSeleccionado, setArchivoGeograficoSeleccionado] = useState<File | null>(null);
  const [guardandoArchivos, setGuardandoArchivos] = useState(false);

  async function abrirArchivosGeograficos(lote: LoteApp) {
    setLoteArchivosGeograficos(lote);
    setArchivoGeograficoSeleccionado(null);
    setArchivosGeograficos([]);
    setGuardandoArchivos(true);

    try {
      const respuesta = await obtenerArchivosGeograficosLote(lote.id, token);
      setArchivosGeograficos(respuesta.archivos);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los archivos geograficos.';
      notificar?.({ tipo: 'error', titulo: 'No se cargaron archivos', mensaje });
    } finally {
      setGuardandoArchivos(false);
    }
  }

  function cerrarArchivosGeograficos() {
    setLoteArchivosGeograficos(null);
    setArchivoGeograficoSeleccionado(null);
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

    setGuardandoArchivos(true);

    try {
      const urlSubida = await crearUrlSubidaArchivoGeograficoLote(loteArchivosGeograficos.id, {
        nombreArchivo: archivoGeograficoSeleccionado.name,
        mimeType,
        tamanioBytes: archivoGeograficoSeleccionado.size,
      }, token);
      const archivoParaSubir = archivoGeograficoSeleccionado.type
        ? archivoGeograficoSeleccionado
        : new File([archivoGeograficoSeleccionado], archivoGeograficoSeleccionado.name, { type: mimeType });

      await subirArchivoAFirmaSupabase(urlSubida.signedUploadUrl, archivoParaSubir);

      const ahora = new Date().toISOString();
      const respuesta = await guardarArchivoGeograficoLote(loteArchivosGeograficos.id, {
        archivo: {
          id: crearIdArchivoGeografico(),
          clienteId,
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
      }, token);

      setArchivosGeograficos((actuales) => [respuesta.archivo, ...actuales]);
      setArchivoGeograficoSeleccionado(null);
      notificar?.({ tipo: 'success', titulo: 'Archivo vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el archivo geografico.';
      notificar?.({ tipo: 'error', titulo: 'No se subio el archivo', mensaje });
    } finally {
      setGuardandoArchivos(false);
    }
  }

  return {
    loteArchivosGeograficos,
    archivosGeograficos,
    archivoGeograficoSeleccionado,
    guardandoArchivos,
    abrirArchivosGeograficos,
    cerrarArchivosGeograficos,
    setArchivoGeograficoSeleccionado,
    subirArchivoGeografico,
  };
}
