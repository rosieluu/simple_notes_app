#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.requestId = 1;
    this.server = null;
  }

  async startServer() {
    console.log('🚀 Démarrage du serveur MCP...\n');
    
    const serverPath = join(__dirname, 'dist', 'index.js');
    this.server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CONVEX_URL: 'https://valiant-marlin-732.convex.cloud' }
    });

    this.server.stderr.on('data', (data) => {
      console.log('📝 Serveur:', data.toString());
    });

    // Attendre que le serveur soit prêt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params
      };

      console.log('📤 Envoi de la requête:', JSON.stringify(request, null, 2));

      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      this.server.stdout.on('data', (data) => {
        response += data.toString();
        
        try {
          const lines = response.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line);
            if (parsed.id === request.id) {
              clearTimeout(timeout);
              console.log('📥 Réponse reçue:', JSON.stringify(parsed, null, 2));
              resolve(parsed);
              return;
            }
          }
        } catch (e) {
          // Réponse incomplète, on attend plus de données
        }
      });

      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testTools() {
    try {
      console.log('🔍 Test 1: Initialisation du serveur\n');
      await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });

      console.log('\n🔍 Test 2: Liste des outils disponibles\n');
      const toolsResponse = await this.sendRequest('tools/list');
      
      if (toolsResponse.result && toolsResponse.result.tools) {
        console.log(`✅ ${toolsResponse.result.tools.length} outil(s) trouvé(s):`);
        toolsResponse.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
      }

      console.log('\n🔍 Test 3: Test de création d\'une note\n');
      const createResponse = await this.sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          userId: 'test-user-123',
          title: 'Note de test MCP',
          content: 'Cette note a été créée via le serveur MCP pour tester la fonctionnalité.',
          tags: ['test', 'mcp']
        }
      });

      if (createResponse.result) {
        console.log('✅ Note créée avec succès !');
      }

      console.log('\n🔍 Test 4: Liste des notes\n');
      const listResponse = await this.sendRequest('tools/call', {
        name: 'list_notes',
        arguments: {
          userId: 'test-user-123'
        }
      });

      if (listResponse.result) {
        console.log('✅ Notes listées avec succès !');
      }

    } catch (error) {
      console.error('❌ Erreur pendant les tests:', error);
    }
  }

  async stop() {
    if (this.server) {
      this.server.kill();
      console.log('\n🛑 Serveur arrêté');
    }
  }
}

// Lancer les tests
async function main() {
  const tester = new MCPTester();
  
  try {
    await tester.startServer();
    await tester.testTools();
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await tester.stop();
    process.exit(0);
  }
}

// Gestion des signaux
process.on('SIGINT', () => {
  console.log('\n👋 Arrêt des tests...');
  process.exit(0);
});

main();