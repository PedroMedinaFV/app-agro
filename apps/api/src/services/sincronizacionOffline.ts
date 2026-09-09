import type { CrearPrecipitacionRequest } from '@agro/tipos';
import { crearPrecipitacionPersistida } from './precipitaciones/precipitacionesPrisma';

export type RegistroParaSincronizar = {
  id: string;
  tipo: string;
  payload: unknown;
  sincronizado?: boolean;
};

type UsuarioSincronizacion = {
  id?: string;
  email?: string;
  rol?: string;
  clienteId?: string;
};

type RegistroSincronizado = RegistroParaSincronizar & {
  sincronizado: boolean;
  error?: string;
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esPayloadPrecipitacion(payload: unknown): payload is CrearPrecipitacionRequest {
  if (!esObjeto(payload)) {
    return false;
  }

  return (
    typeof payload.campoAppId === 'string' &&
    typeof payload.milimetros === 'number' &&
    typeof payload.fechaEvento === 'string'
  );
}

async function procesarRegistro(registro: RegistroParaSincronizar, usuario: UsuarioSincronizacion): Promise<RegistroSincronizado> {
  if (registro.tipo !== 'precipitacion') {
    return {
      ...registro,
      sincronizado: false,
      error: `Tipo de registro no soportado: ${registro.tipo}`,
    };
  }

  if (!esPayloadPrecipitacion(registro.payload)) {
    return {
      ...registro,
      sincronizado: false,
      error: 'Payload de precipitacion invalido.',
    };
  }

  // El id local de mobile evita duplicados si la app reintenta la misma sincronizacion.
  await crearPrecipitacionPersistida(
    {
      ...registro.payload,
      origen: 'mobile',
      registroMovilId: registro.id,
    },
    usuario,
  );

  return {
    ...registro,
    sincronizado: true,
  };
}

export async function procesarSincronizacion(registros: RegistroParaSincronizar[], usuario: UsuarioSincronizacion) {
  const actualizados: RegistroSincronizado[] = [];

  for (const registro of registros) {
    try {
      actualizados.push(await procesarRegistro(registro, usuario));
    } catch (error) {
      actualizados.push({
        ...registro,
        sincronizado: false,
        error: error instanceof Error ? error.message : 'No se pudo sincronizar el registro.',
      });
    }
  }

  return {
    sincronizados: actualizados.filter((registro) => registro.sincronizado).length,
    pendientes: actualizados.filter((registro) => !registro.sincronizado).length,
    registros: actualizados,
  };
}
