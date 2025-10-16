import { z } from "zod";
import { ConvexClientManager } from "../convex-client.js";

export class NotesTools {
  private convexClient: ConvexClientManager;

  constructor() {
    this.convexClient = new ConvexClientManager();
  }

  // Outil pour lister les notes
  getListNotesTool() {
    return {
      name: 'list_notes',
      definition: {
        title: 'Lister les notes',
        description: 'Récupère toutes les notes d\'un utilisateur',
        inputSchema: {
          userId: z.string().describe("ID de l'utilisateur pour lister ses notes")
        }
      },
      handler: async (args: { userId: string }) => {
        try {
          const notes = await this.convexClient.listNotes(args.userId);
          
          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ ${notes.length} note(s) trouvée(s) pour l'utilisateur ${args.userId}`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Erreur lors de la récupération des notes: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
              }
            ],
            isError: true
          };
        }
      }
    };
  }

  // Outil pour récupérer une note spécifique
  getGetNoteTool() {
    return {
      name: 'get_note',
      definition: {
        title: 'Récupérer une note',
        description: 'Récupère une note spécifique par son ID',
        inputSchema: {
          noteId: z.string().describe("ID de la note à récupérer")
        }
      },
      handler: async (args: { noteId: string }) => {
        try {
          const note = await this.convexClient.getNote(args.noteId);
          
          if (!note) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `❌ Note avec l'ID ${args.noteId} non trouvée`
                }
              ],
              isError: false
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Note récupérée: "${note.title || 'Sans titre'}" (${note.tags?.length || 0} tag(s))`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Erreur lors de la récupération de la note: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
              }
            ],
            isError: true
          };
        }
      }
    };
  }

  // Outil pour créer une nouvelle note
  getCreateNoteTool() {
    return {
      name: 'create_note',
      definition: {
        title: 'Créer une note',
        description: 'Crée une nouvelle note pour un utilisateur',
        inputSchema: {
          userId: z.string().describe("ID de l'utilisateur propriétaire de la note"),
          title: z.string().optional().describe("Titre de la note (optionnel)"),
          content: z.string().optional().describe("Contenu de la note (optionnel)"),
          tags: z.array(z.string()).optional().default([]).describe("Tags de la note")
        }
      },
      handler: async (args: { userId: string; title?: string; content?: string; tags?: string[] }) => {
        try {
          const noteId = await this.convexClient.createNote(
            args.userId,
            args.title,
            args.content,
            args.tags || []
          );

          return {
            content: [
              {
                type: 'text' as const,
                text: `✅ Note créée avec succès! ID: ${noteId}\nTitre: "${args.title || 'Sans titre'}"\nTags: [${(args.tags || []).join(', ')}]`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ Erreur lors de la création de la note: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
              }
            ],
            isError: true
          };
        }
      }
    };
  }
}