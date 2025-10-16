import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { NotesTools } from './tools/notes.js';

export class SimpleNotesMcpServer {
  private server: McpServer;
  private notesTools: NotesTools;

  constructor() {
    // Initialiser le serveur MCP
    this.server = new McpServer({
      name: 'simple-notes-mcp-server',
      version: '1.0.0'
    });

    // Initialiser les outils
    this.notesTools = new NotesTools();

    // Enregistrer les outils
    this.registerTools();
  }

  private registerTools() {
    // Enregistrer l'outil list_notes
    const listNotesTool = this.notesTools.getListNotesTool();
    this.server.registerTool(
      listNotesTool.name,
      listNotesTool.definition,
      listNotesTool.handler
    );

    // Enregistrer l'outil get_note
    const getNoteTool = this.notesTools.getGetNoteTool();
    this.server.registerTool(
      getNoteTool.name,
      getNoteTool.definition,
      getNoteTool.handler
    );

    // Enregistrer l'outil create_note
    const createNoteTool = this.notesTools.getCreateNoteTool();
    this.server.registerTool(
      createNoteTool.name,
      createNoteTool.definition,
      createNoteTool.handler
    );

    console.log('✅ Tous les outils MCP ont été enregistrés:');
    console.log('  - list_notes: Lister les notes d\'un utilisateur');
    console.log('  - get_note: Récupérer une note spécifique');
    console.log('  - create_note: Créer une nouvelle note');
  }

  async start() {
    try {
      // Utiliser le transport Stdio pour la communication
      const transport = new StdioServerTransport();
      
      console.log('🚀 Démarrage du serveur MCP Simple Notes...');
      
      // Connecter le serveur au transport
      await this.server.connect(transport);
      
      console.log('✅ Serveur MCP Simple Notes démarré avec succès!');
      console.log('📝 Prêt à recevoir des requêtes pour gérer les notes...');
      
    } catch (error) {
      console.error('❌ Erreur lors du démarrage du serveur MCP:', error);
      process.exit(1);
    }
  }
}

// Gestionnaire d'erreurs global
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});