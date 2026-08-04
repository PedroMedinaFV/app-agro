import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import homeRuta from './routes/home';
import usuariosRuta from './routes/usuarios';
import authRuta from './routes/auth';
import paisesRuta from './routes/paises';
import cultivosRuta from './routes/cultivos';
import camposRuta from './routes/campos';
import lotesRuta from './routes/lotes';
import laboresRuta from './routes/labores';
import analisisSueloRuta from './routes/analisisSuelo';
import avancesSiembraRuta from './routes/avancesSiembra';
import avancesCosechaRuta from './routes/avancesCosecha';
import monitoreosRuta from './routes/monitoreos';
import sincronizacionRuta from './routes/sincronizacion';
import { manejadorErrores } from './middleware/manejadorErrores';
import { autenticacionBasica } from './middleware/autenticacion';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/home', homeRuta);
app.use('/auth', authRuta);
app.use('/usuarios', autenticacionBasica, usuariosRuta);
app.use('/paises', autenticacionBasica, paisesRuta);
app.use('/cultivos', autenticacionBasica, cultivosRuta);
app.use('/campos', autenticacionBasica, camposRuta);
app.use('/lotes', autenticacionBasica, lotesRuta);
app.use('/labores', autenticacionBasica, laboresRuta);
app.use('/analisis-suelo', autenticacionBasica, analisisSueloRuta);
app.use('/avances-siembra', autenticacionBasica, avancesSiembraRuta);
app.use('/avances-cosecha', autenticacionBasica, avancesCosechaRuta);
app.use('/monitoreos', autenticacionBasica, monitoreosRuta);
app.use('/sincronizacion', sincronizacionRuta);

app.use(manejadorErrores);

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`API ejecutándose en http://localhost:${port}`);
});
