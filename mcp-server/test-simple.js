#!/usr/bin/env node

// Test simple et direct du serveur MCP
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Test Simple du Serveur MCP\n');

async function testServerBasic() {
  console.log('1️⃣ Test de démarrage du serveur...');
  
  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, CONVEX_URL: 'https://valiant-marlin-732.convex.cloud' }
  });

  let output = '';
  let errorOutput = '';

  server.stdout.on('data', (data) => {
    output += data.toString();
    console.log('📤 Stdout:', data.toString().trim());
  });

  server.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log('📝 Stderr:', data.toString().trim());
  });

  // Test simple : envoyer juste l'initialisation
  setTimeout(() => {
    console.log('\n2️⃣ Envoi de l\'initialisation...');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };
    
    console.log('📤 Requête:', JSON.stringify(initRequest));
    server.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 1000);

  // Arrêter le test après 5 secondes
  setTimeout(() => {
    console.log('\n3️⃣ Arrêt du test...');
    server.kill();
    
    console.log('\n📊 RÉSULTATS:');
    console.log('- Stdout reçu:', output ? '✅' : '❌');
    console.log('- Stderr reçu:', errorOutput ? '✅' : '❌');
    
    if (errorOutput.includes('Serveur MCP Simple Notes démarré')) {
      console.log('✅ Le serveur démarre correctement !');
    } else {
      console.log('❌ Problème de démarrage du serveur');
    }
    
    process.exit(0);
  }, 5000);

  server.on('error', (err) => {
    console.error('❌ Erreur serveur:', err);
  });

  server.on('exit', (code) => {
    console.log(`\n🛑 Serveur fermé avec le code: ${code}`);
  });
}

testServerBasic();