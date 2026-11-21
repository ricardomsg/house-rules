import { networkInterfaces } from 'node:os';

const port = process.env.PORT || '3000';
console.log(`\nHouse Rules — neste computador: http://localhost:${port}`);
for (const addresses of Object.values(networkInterfaces())) {
  for (const address of addresses || []) {
    if (address.family === 'IPv4' && !address.internal) {
      console.log(`Na mesma rede Wi-Fi: http://${address.address}:${port}`);
    }
  }
}
console.log('Para convidar telemóveis, abre a sala pela ligação da rede Wi-Fi.\n');
