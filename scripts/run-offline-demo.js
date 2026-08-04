const http = require('http');

const payload = JSON.stringify({
  tipo: 'registro-campo',
  payload: { lote: 'Lote demo', estado: 'pendiente' }
});

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/sincronizacion',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error('No se pudo contactar al backend:', error.message);
});

req.write(payload);
req.end();
