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
import { manejadorErrores } from './middleware/manejadorErrores';
import { autenticacionBasica } from './middleware/autenticacion';
import { requierePermiso } from './middleware/permisos';

const app = express();
app.use(cors());
// La planilla de planificacion puede enviar cientos de lineas en un unico borrador.
// Mantenemos un limite acotado para no aceptar cargas arbitrariamente grandes.
app.use(bodyParser.json({ limit: process.env.API_JSON_LIMIT || '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: process.env.API_JSON_LIMIT || '1mb' }));

app.use('/home', homeRuta);
app.use('/auth', authRuta);
app.use('/usuarios', autenticacionBasica, usuariosRuta);
app.use('/sincronizacion', autenticacionBasica, requierePermiso('registros:sincronizar'), sincronizacionRuta);
app.use('/erp', autenticacionBasica, requierePermiso('erp:leer'), erpRuta);
app.use('/admin/integracion-erp', autenticacionBasica, requierePermiso('erp:configurar'), adminIntegracionErpRuta);
app.use('/admin/asignaciones', autenticacionBasica, requierePermiso('usuarios:asignar-campos'), adminUsuariosCamposRuta);
app.use('/admin/empresas-erp', autenticacionBasica, requierePermiso('erp:configurar'), adminEmpresasErpRuta);
app.use('/planificacion', autenticacionBasica, planificacionRuta);
app.use('/precios-referencia', autenticacionBasica, preciosReferenciaRuta);
app.use('/gastos-comerciales-referencia', autenticacionBasica, gastosComercialesReferenciaRuta);
app.use('/conceptos-gastos-comerciales', autenticacionBasica, conceptosGastosComercialesRuta);
app.use('/destinos-venta', autenticacionBasica, destinosVentaRuta);
app.use('/servicios-app', autenticacionBasica, serviciosAppRuta);
app.use('/insumos-app', autenticacionBasica, insumosAppRuta);
app.use('/especies-app', autenticacionBasica, especiesAppRuta);
app.use('/actividades-app', autenticacionBasica, actividadesAppRuta);
app.use('/zonas-app', autenticacionBasica, zonasAppRuta);
app.use('/campos-app', autenticacionBasica, camposAppRuta);
app.use('/lotes-app', autenticacionBasica, lotesAppRuta);
app.use('/notificaciones', autenticacionBasica, notificacionesRuta);
app.use('/precipitaciones', autenticacionBasica, precipitacionesRuta);
app.use('/observaciones', autenticacionBasica, observacionesRuta);

app.use(manejadorErrores);

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`API ejecutándose en http://localhost:${port}`);
});
