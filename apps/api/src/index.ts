import { crearApp } from './app';

const app = crearApp();
const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`API ejecutándose en http://localhost:${port}`);
});
