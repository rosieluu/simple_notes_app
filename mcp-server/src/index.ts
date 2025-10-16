#!/usr/bin/env node

import { SimpleNotesMcpServer } from './server.js';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function main() {
  console.log('🔧 Simple Notes MCP Server v1.0.0');
  console.log('📋 Serveur MCP pour l\'application Simple Notes avec backend Convex');
  console.log('');

  // Vérifier les variables d'environnement requises
  if (!process.env.CONVEX_URL) {
    console.error('❌ ERREUR: La variable d\'environnement CONVEX_URL est requise');
    console.error('💡 Veuillez créer un fichier .env avec votre URL Convex');
    console.error('   Exemple: CONVEX_URL=https://your-deployment.convex.cloud');
    process.exit(1);
  }

  try {
    // Créer et démarrer le serveur
    const server = new SimpleNotesMcpServer();
    await server.start();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Point d'entrée
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}