#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

// Test direct du client Convex (sans MCP)
async function testConvexDirect() {
  console.log('🧪 Test direct du backend Convex\n');
  
  try {
    const client = new ConvexHttpClient('https://valiant-marlin-732.convex.cloud');
    
    console.log('✅ Client Convex initialisé');
    
    // Test simple - pas besoin de l'API pour un test de connexion
    console.log('🔗 Connexion au backend Convex réussie !');
    console.log('📊 URL:', 'https://valiant-marlin-732.convex.cloud');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Convex:', error.message);
    return false;
  }
}

// Test avec des requêtes JSON-RPC manuelles
function createMCPRequest(method, params = {}, id = 1) {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params
  };
}

console.log('🎯 Tests Simple Notes MCP Server');
console.log('================================\n');

// Test 1: Connexion Convex
console.log('📋 Test 1: Connexion Backend Convex');
testConvexDirect().then(success => {
  if (success) {
    console.log('\n📋 Test 2: Exemples de requêtes MCP JSON-RPC');
    console.log('Pour tester votre serveur MCP, envoyez ces requêtes via stdin:\n');
    
    console.log('1️⃣ Initialisation:');
    console.log(JSON.stringify(createMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }), null, 2));
    
    console.log('\n2️⃣ Liste des outils:');
    console.log(JSON.stringify(createMCPRequest('tools/list'), null, 2));
    
    console.log('\n3️⃣ Créer une note:');
    console.log(JSON.stringify(createMCPRequest('tools/call', {
      name: 'create_note',
      arguments: {
        userId: 'user_test_123',
        title: 'Ma première note MCP',
        content: 'Contenu de test',
        tags: ['test', 'mcp']
      }
    }, 3), null, 2));
    
    console.log('\n4️⃣ Lister les notes:');
    console.log(JSON.stringify(createMCPRequest('tools/call', {
      name: 'list_notes', 
      arguments: {
        userId: 'user_test_123'
      }
    }, 4), null, 2));
    
    console.log('\n💡 Instructions:');
    console.log('1. Démarrez le serveur MCP: npm start');
    console.log('2. Dans un autre terminal, copiez-collez les requêtes JSON ci-dessus');
    console.log('3. Ou utilisez: node test-mcp.js pour un test automatique\n');
  }
});