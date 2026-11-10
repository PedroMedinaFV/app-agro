import { resolverAliasesPadrones } from './middleware/aliasesPadrones';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import homeRuta from './routes/home';
import usuariosRuta from './routes/usuarios';
import authRuta from './routes/auth';
import sincronizacionRuta from './routes/sincronizacion';
import erpRuta from './routes/erp';
import adminIntegracionErpRuta from './routes/adminIntegracionErp';
import adminUsuariosCamposRuta from './routes/adminUsuariosCampos';
import adminEmpresasErpRuta from './routes/adminEmpresasErp';
import planificacionRuta from './routes/planificacion';
import preciosReferenciaRuta from './routes/preciosReferencia';
import gastosComercialesReferenciaRuta from './routes/gastosComercialesReferencia';
import conceptosGastosComercialesRuta from './routes/conceptosGastosComerciales';
import destinosVentaRuta from './routes/destinosVenta';
import serviciosAppRuta from './routes/serviciosApp';
import insumosAppRuta from './routes/insumosApp';
import especiesAppRuta from './routes/especiesApp';
import actividadesAppRuta from './routes/actividadesApp';
import zonasAppRuta from './routes/zonasApp';
import camposAppRuta from './routes/camposApp';
import lotesAppRuta from './routes/lotesApp';
import notificacionesRuta from './routes/notificaciones';
import precipitacionesRuta from './routes/precipitaciones';
import observacionesRuta from './routes/observaciones';
import recorridasRuta from './routes/recorridas';
import operativoRuta from './routes/operativo';
import ndviRuta from './routes/ndvi';
import auditoriaRuta from './routes/auditoria';
import { manejadorErrores } from './middleware/manejadorErrores';
import { autenticacionBasica } from './middleware/autenticacion';
import { requierePermiso } from './middleware/permisos';
import { obtenerConfiguracionJwt } from './config/jwt';
import { obtenerDuracionBloqueoErp } from './config/bloqueoErp';

export function crearApp() {
  // Validar antes de abrir el puerto; el entorno raiz ya fue cargado por prisma.ts.
  obtenerConfiguracionJwt();
  obtenerDuracionBloqueoErp();
  const app = express();
  app.use(cors());
  // La planilla de planificacion puede enviar cientos de lineas en un unico borrador.
  // Mantenemos un limite acotado para no aceptar cargas arbitrariamente grandes.
  app.use(bodyParser.json({ limit: process.env.API_JSON_LIMIT || '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: process.env.API_JSON_LIMIT || '1mb' }));

  app.use('/home', homeRuta);
  app.use('/auth', authRuta);
  app.use('/usuarios', autenticacionBasica, resolverAliasesPadrones, usuariosRuta);
  app.use('/sincronizacion', autenticacionBasica, resolverAliasesPadrones, requierePermiso('registros:sincronizar'), sincronizacionRuta);
  app.use('/erp', autenticacionBasica, resolverAliasesPadrones, requierePermiso('erp:leer'), erpRuta);
  app.use('/admin/integracion-erp', autenticacionBasica, resolverAliasesPadrones, requierePermiso('erp:configurar'), adminIntegracionErpRuta);
  app.use('/admin/asignaciones', autenticacionBasica, resolverAliasesPadrones, requierePermiso('usuarios:asignar-campos'), adminUsuariosCamposRuta);
  app.use('/admin/empresas-erp', autenticacionBasica, resolverAliasesPadrones, requierePermiso('erp:configurar'), adminEmpresasErpRuta);
  app.use('/planificacion', autenticacionBasica, resolverAliasesPadrones, planificacionRuta);
  app.use('/precios-app', autenticacionBasica, resolverAliasesPadrones, preciosReferenciaRuta);
  app.use('/precios-referencia', autenticacionBasica, resolverAliasesPadrones, preciosReferenciaRuta);
  app.use('/gastos-comerciales-app', autenticacionBasica, resolverAliasesPadrones, gastosComercialesReferenciaRuta);
  app.use('/gastos-comerciales-referencia', autenticacionBasica, resolverAliasesPadrones, gastosComercialesReferenciaRuta);
  app.use('/conceptos-gastos-comerciales-app', autenticacionBasica, resolverAliasesPadrones, conceptosGastosComercialesRuta);
  app.use('/conceptos-gastos-comerciales', autenticacionBasica, resolverAliasesPadrones, conceptosGastosComercialesRuta);
  app.use('/destinos-venta', autenticacionBasica, resolverAliasesPadrones, destinosVentaRuta);
  app.use('/servicios-app', autenticacionBasica, resolverAliasesPadrones, serviciosAppRuta);
  app.use('/insumos-app', autenticacionBasica, resolverAliasesPadrones, insumosAppRuta);
  app.use('/especies-app', autenticacionBasica, resolverAliasesPadrones, especiesAppRuta);
  app.use('/actividades-app', autenticacionBasica, resolverAliasesPadrones, actividadesAppRuta);
  app.use('/zonas-app', autenticacionBasica, resolverAliasesPadrones, zonasAppRuta);
  app.use('/campos-app', autenticacionBasica, resolverAliasesPadrones, camposAppRuta);
  app.use('/lotes-app', autenticacionBasica, resolverAliasesPadrones, lotesAppRuta);
  app.use('/notificaciones', autenticacionBasica, resolverAliasesPadrones, notificacionesRuta);
  app.use('/precipitaciones', autenticacionBasica, resolverAliasesPadrones, precipitacionesRuta);
  app.use('/observaciones', autenticacionBasica, resolverAliasesPadrones, observacionesRuta);
  app.use('/recorridas', autenticacionBasica, resolverAliasesPadrones, recorridasRuta);
  app.use('/operativo', autenticacionBasica, resolverAliasesPadrones, operativoRuta);
  app.use('/ndvi', autenticacionBasica, resolverAliasesPadrones, ndviRuta);
  app.use('/auditoria', autenticacionBasica, resolverAliasesPadrones, requierePermiso('auditoria:leer'), auditoriaRuta);

  app.use(manejadorErrores);

  return app;
}
