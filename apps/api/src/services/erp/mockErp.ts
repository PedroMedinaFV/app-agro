import { ErpSnapshot } from '@agro/tipos';
import { mapearRespuestaAgriculturaActividades } from './mappers/agriculturaActividades';
import { mapearRespuestaAgriculturaEspecies } from './mappers/agriculturaEspecies';
import { mapearRespuestaPadronesCampos } from './mappers/padronesCampos';
import { mapearRespuestaPadronesLotes } from './mappers/padronesLotes';
import { mapearRespuestaPadronesZonas } from './mappers/padronesZonas';
import { mapearRespuestaSistemaEmpresas } from './mappers/sistemaEmpresas';

const ahora = '2026-08-11T12:00:00.000Z';

const respuestaPadronesCamposMock = {
  succeeded: true,
  message: null,
  errors: [],
  pagination: {
    pageNumber: 1,
    pageSize: 3,
    totalPages: 1,
    totalRecords: 3,
  },
  data: [
    {
      idCampo: 241,
      idZona: 34,
      idSubZona: 107,
      codigo: '00006',
      nombre: 'LA PROVIDENCIA ',
      activo: true,
      admiteGanaderia: true,
      domicilio: null,
      codigoSima: 34942,
      idLocalidad: null,
      fechaUltimaActualizacion: '2026-04-30T14:00:38',
    },
    {
      idCampo: 242,
      idZona: 33,
      idSubZona: 106,
      codigo: '00007',
      nombre: 'PIERES RUTA 88',
      activo: true,
      admiteGanaderia: true,
      domicilio: null,
      codigoSima: null,
      idLocalidad: null,
      fechaUltimaActualizacion: '2024-06-07T11:53:01',
    },
    {
      idCampo: 243,
      idZona: 33,
      idSubZona: 106,
      codigo: '00008',
      nombre: 'PIERES RUTA 227',
      activo: true,
      admiteGanaderia: false,
      domicilio: null,
      codigoSima: null,
      idLocalidad: null,
      fechaUltimaActualizacion: null,
    },
  ],
};

const respuestaPadronesZonasMock = {
  succeeded: true,
  message: null,
  errors: [],
  pagination: {
    pageNumber: 1,
    pageSize: 6,
    totalPages: 1,
    totalRecords: 6,
  },
  data: [
    { idZona: 33, codigo: '00000', nombre: 'ZONA PIERES', activo: true },
    { idZona: 34, codigo: '00001', nombre: 'ZONA LA PROVIDENCIA ', activo: true },
    { idZona: 35, codigo: '00002', nombre: 'ZONA SANTA NICOLASA', activo: true },
    { idZona: 36, codigo: '00003', nombre: 'ZONA SANTA MARGARITA', activo: true },
    { idZona: 37, codigo: '00004', nombre: 'ZONA HERRERA VEGAS', activo: true },
    { idZona: 38, codigo: '00005', nombre: 'ZONA OLAVARRIA', activo: true },
  ],
};

const respuestaPadronesLotesMock = {
  succeeded: true,
  message: null,
  errors: [],
  pagination: {
    pageNumber: 1,
    pageSize: 5,
    totalPages: 1,
    totalRecords: 5,
  },
  data: [
    {
      idLote: 724,
      idCampo: 241,
      codigo: 'CL1',
      nombre: 'CABALLO LOCO 1',
      activo: true,
      admiteGanaderia: true,
      admiteLecheria: false,
      codigoSima: 78998,
      hectareas: 60,
      hectareasProductivas: 60,
      fechaUltimaActualizacion: '2026-04-28T16:55:10',
    },
    {
      idLote: 725,
      idCampo: 241,
      codigo: 'CAR1',
      nombre: 'CARDALITO 1',
      activo: true,
      admiteGanaderia: true,
      admiteLecheria: false,
      codigoSima: 129693,
      hectareas: 123,
      hectareasProductivas: 123,
      fechaUltimaActualizacion: '2026-04-28T16:55:10',
    },
    {
      idLote: 765,
      idCampo: 242,
      codigo: '0042',
      nombre: 'DE ANTON',
      activo: true,
      admiteGanaderia: false,
      admiteLecheria: false,
      codigoSima: null,
      hectareas: 339,
      hectareasProductivas: 339,
      fechaUltimaActualizacion: '2024-06-07T11:53:01',
    },
    {
      idLote: 783,
      idCampo: 243,
      codigo: '0060',
      nombre: 'LA MARCHA',
      activo: true,
      admiteGanaderia: false,
      admiteLecheria: false,
      codigoSima: null,
      hectareas: 1466.2,
      hectareasProductivas: 1466.2,
      fechaUltimaActualizacion: null,
    },
    {
      idLote: 2008,
      idCampo: 256,
      codigo: '0260',
      nombre: 'LG 2',
      activo: true,
      admiteGanaderia: true,
      admiteLecheria: false,
      codigoSima: null,
      hectareas: 63,
      hectareasProductivas: 63,
      fechaUltimaActualizacion: '2026-04-29T08:45:10',
    },
  ],
};

const respuestaAgriculturaActividadesMock = {
  succeeded: true,
  message: null,
  errors: [],
  pagination: {
    pageNumber: 1,
    pageSize: 3,
    totalPages: 1,
    totalRecords: 3,
  },
  data: [
    {
      idActividad: 48,
      codigo: '011',
      descripcion: 'GIRASOL',
      activo: true,
      habilitadoExportacionCrea: true,
      idEspecie: 33,
      idTipoActividad: 1,
      fechaUltimaActualizacion: '2025-05-16T15:46:06',
    },
    {
      idActividad: 49,
      codigo: '012',
      descripcion: 'SOJA',
      activo: true,
      habilitadoExportacionCrea: true,
      idEspecie: 34,
      idTipoActividad: 1,
      fechaUltimaActualizacion: '2025-05-16T15:46:06',
    },
    {
      idActividad: 50,
      codigo: '013',
      descripcion: 'TRIGO',
      activo: true,
      habilitadoExportacionCrea: true,
      idEspecie: 35,
      idTipoActividad: 1,
      fechaUltimaActualizacion: null,
    },
  ],
};

const respuestaAgriculturaEspeciesMock = {
  succeeded: true,
  message: null,
  errors: [],
  pagination: {
    pageNumber: 1,
    pageSize: 3,
    totalPages: 1,
    totalRecords: 3,
  },
  data: [
    {
      idEspecie: 33,
      codigo: '01',
      nombre: 'GIRASOL',
      activo: true,
      codigoCot: null,
      codigoAfip: 2,
      fechaUltimaActualizacion: '2023-07-31T20:48:19',
      precios: [],
    },
    {
      idEspecie: 34,
      codigo: '02',
      nombre: 'SOJA',
      activo: true,
      codigoCot: null,
      codigoAfip: 23,
      fechaUltimaActualizacion: '2023-07-31T20:48:19',
      precios: [],
    },
    {
      idEspecie: 35,
      codigo: '03',
      nombre: 'TRIGO',
      activo: true,
      codigoCot: null,
      codigoAfip: 1,
      fechaUltimaActualizacion: null,
      precios: [],
    },
  ],
};

const respuestaSistemaEmpresasMock = {
  succeeded: true,
  message: null,
  errors: [],
  pagination: {
    pageNumber: 1,
    pageSize: 2,
    totalPages: 1,
    totalRecords: 2,
  },
  data: [
    {
      idEmpresa: 1,
      codigo: '001',
      nombre: 'SOLMAT',
      activo: true,
      cuit: '30-70796234-4',
      razonSocial: 'SOLMAT AGROPECUARIA S.A.',
      email: null,
      fechaUltimaActualizacion: '2026-06-29T16:40:15',
    },
    {
      idEmpresa: 2,
      codigo: '002',
      nombre: 'AGRO DEMO',
      activo: true,
      cuit: null,
      razonSocial: 'AGRO DEMO S.A.',
      email: 'admin@agroapp.local',
      fechaUltimaActualizacion: null,
    },
  ],
};

// Mock de contrato ERP. Reemplazar esta funcion por llamadas HTTP cuando tengamos credenciales reales.
export async function obtenerSnapshotErpMock(): Promise<ErpSnapshot> {
  const campos = mapearRespuestaPadronesCampos(respuestaPadronesCamposMock);
  const zonas = mapearRespuestaPadronesZonas(respuestaPadronesZonasMock);
  const lotes = mapearRespuestaPadronesLotes(respuestaPadronesLotesMock);
  const actividades = mapearRespuestaAgriculturaActividades(respuestaAgriculturaActividadesMock);
  const especies = mapearRespuestaAgriculturaEspecies(respuestaAgriculturaEspeciesMock);
  const empresas = mapearRespuestaSistemaEmpresas(respuestaSistemaEmpresasMock);

  return {
    sincronizadoEn: ahora,
    zonas,
    campos,
    lotes,
    actividades,
    especies,
    empresas,
  };
}
