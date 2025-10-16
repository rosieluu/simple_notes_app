import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";

// Note: Nous devrons configurer les fonctions Convex directement
// car le chemin vers api.js dépend de votre déploiement

// Charger les variables d'environnement
dotenv.config();

export class ConvexClientManager {
  private client: ConvexHttpClient;

  constructor() {
    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) {
      throw new Error("CONVEX_URL environment variable is required");
    }
    
    this.client = new ConvexHttpClient(convexUrl);
  }

  getClient(): ConvexHttpClient {
    return this.client;
  }

  // Méthodes pour les notes
  async listNotes(userId: string) {
    try {
      // Appel direct à la fonction Convex
      return await this.client.query("notes:list" as any, { userId });
    } catch (error) {
      console.error("Error listing notes:", error);
      throw error;
    }
  }

  async getNote(noteId: string) {
    try {
      return await this.client.query("notes:get" as any, { id: noteId });
    } catch (error) {
      console.error("Error getting note:", error);
      throw error;
    }
  }

  async createNote(userId: string, title?: string, content?: string, tags: string[] = []) {
    try {
      return await this.client.mutation("notes:create" as any, {
        userId,
        title,
        content, 
        tags
      });
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }
}