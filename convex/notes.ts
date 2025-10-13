import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const search = query({
  args: { 
    query: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    if (args.tag) {
      // Filter by tag
      const allNotes = await ctx.db
        .query("notes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      return allNotes.filter(note => 
        note.tags.includes(args.tag!) &&
        (args.query === "" || 
         (note.title && note.title.toLowerCase().includes(args.query.toLowerCase())) ||
         (note.content && note.content.toLowerCase().includes(args.query.toLowerCase())))
      );
    }

    if (args.query === "") {
      return await ctx.db
        .query("notes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    // Search in title and content
    const titleResults = await ctx.db
      .query("notes")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("userId", userId)
      )
      .collect();

    const contentResults = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("userId", userId)
      )
      .collect();

    // Combine and deduplicate results
    const allResults = [...titleResults, ...contentResults];
    const uniqueResults = allResults.filter((note, index, self) =>
      index === self.findIndex(n => n._id === note._id)
    );

    return uniqueResults.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getAllTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const allTags = notes.flatMap(note => note.tags);
    const uniqueTags = [...new Set(allTags)];
    
    return uniqueTags.sort();
  },
});

// Query pour récupérer les informations de l'utilisateur connecté
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Récupérer les informations utilisateur depuis la table users
    const user = await ctx.db.get(userId);
    
    return {
      id: userId,
      name: user?.name || null,
      email: user?.email || null,
      isAnonymous: user?.isAnonymous || false,
    };
  },
});

// Query pour récupérer une note par ID (nécessaire pour l'action de génération d'image)
export const getById = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      return null;
    }

    return note;
  },
});

// Query interne pour récupérer une note par ID sans authentification (pour les actions programmées)
export const getByIdInternal = internalQuery({
  args: { id: v.id("notes"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== args.userId) {
      return null;
    }
    return note;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.array(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    autoGenerateImage: v.optional(v.boolean()), // Nouveau : déclencher auto-génération
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Prompt par défaut si le contenu est vide ou null
    const DEFAULT_PROMPT = "Enhance this real-estate photo to make it look bright, clean, modern and professional";
    
    let finalContent = args.content;
    let defaultPrompt = undefined;
    
    // Si pas de contenu, utiliser le prompt par défaut
    if (!args.content || args.content.trim() === "") {
      finalContent = DEFAULT_PROMPT;
      defaultPrompt = DEFAULT_PROMPT;
    }

    // Générer les URLs des images si des imageIds sont fournis
    let imageUrls: string[] = [];
    if (args.imageIds && args.imageIds.length > 0) {
      // Limiter à 3 images maximum
      const limitedImageIds = args.imageIds.slice(0, 3);
      
      for (const imageId of limitedImageIds) {
        const url = await ctx.storage.getUrl(imageId);
        if (url) {
          imageUrls.push(url);
        }
      }
    }

    // 1. Créer la note d'abord
    const noteId = await ctx.db.insert("notes", {
      title: args.title || "Untitled Note",
      content: finalContent,
      tags: args.tags,
      userId,
      imageIds: args.imageIds?.slice(0, 3), // Limiter à 3 images
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      hasImages: args.imageIds && args.imageIds.length > 0,
      defaultPrompt,
      generatedPrompt: undefined, // Sera rempli après génération
    });

    // 2. Déclencher la génération d'image en arrière-plan (si activée)
    if (args.autoGenerateImage !== false) { // Par défaut = true
      // Programmer la génération d'image de manière asynchrone
      // Note: On utilisera une approche différente pour éviter les erreurs de référence
      console.log(`🎨 Note créée ${noteId} - génération d'image prévue`);
      // TODO: Implémenter la génération automatique via webhook ou action séparée
    }

    return noteId;
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.array(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    // Prompt par défaut si le contenu est vide
    const DEFAULT_PROMPT = "Enhance this real-estate photo to make it look bright, clean, modern and professional";
    
    let finalContent = args.content;
    let defaultPrompt = undefined;
    
    if (!args.content || args.content.trim() === "") {
      finalContent = DEFAULT_PROMPT;
      defaultPrompt = DEFAULT_PROMPT;
    }

    // Générer les URLs des images si des imageIds sont fournis
    let imageUrls: string[] = [];
    if (args.imageIds && args.imageIds.length > 0) {
      const limitedImageIds = args.imageIds.slice(0, 3);
      
      for (const imageId of limitedImageIds) {
        const url = await ctx.storage.getUrl(imageId);
        if (url) {
          imageUrls.push(url);
        }
      }
    }

    return await ctx.db.patch(args.id, {
      title: args.title || "Untitled Note",
      content: finalContent,
      tags: args.tags,
      imageIds: args.imageIds?.slice(0, 3),
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      hasImages: args.imageIds && args.imageIds.length > 0,
      defaultPrompt,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    // Supprimer les images associées si elles existent
    if (note.imageIds && note.imageIds.length > 0) {
      for (const imageId of note.imageIds) {
        await ctx.storage.delete(imageId);
      }
    }

    return await ctx.db.delete(args.id);
  },
});

// Nouvelle fonction pour générer l'URL d'upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Nouvelle fonction pour obtenir l'URL d'une image
export const getImageUrl = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});

// Nouvelle fonction pour lister les notes avec images
export const listWithImages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    return await ctx.db
      .query("notes")
      .withIndex("by_user_with_images", (q) => 
        q.eq("userId", userId).eq("hasImages", true)
      )
      .order("desc")
      .collect();
  },
});

// Mutation pour déclencher la génération d'image après création de note
// Action pour déclencher la génération avec OpenRouter + Context7
export const triggerImageGenerationOpenRouter = mutation({
  args: { 
    noteId: v.id("notes"),
    style: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    useContext7: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log(`🎨 triggerImageGenerationOpenRouter - userId: ${userId}, noteId: ${args.noteId}`);

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    // Marquer que la génération est en cours
    await ctx.db.patch(args.noteId, {
      generatedPrompt: "🎨 Génération en cours avec OpenRouter + Gemini 2.5 Flash...",
    });

    try {
      // Programmer l'action OpenRouter + Gemini 2.5 Flash Image
      await ctx.scheduler.runAfter(0, api.imageGenerationOpenRouter.generateImageFromNoteOpenRouter, {
        noteId: args.noteId,
        userId: userId,
        style: args.style || "photorealistic",
        aspectRatio: args.aspectRatio || "1:1",
        useContext7: args.useContext7 !== false,
      });
      
      console.log(`✅ Génération Gemini 2.5 Flash Image programmée pour note ${args.noteId}`);
      return { 
        success: true, 
        message: "Génération d'image avec Gemini 2.5 Flash Image via OpenRouter programmée",
        useContext7: args.useContext7 !== false
      };
    } catch (error) {
      console.error("Erreur programmation OpenRouter:", error);
      await ctx.db.patch(args.noteId, {
        generatedPrompt: undefined,
      });
      throw error;
    }
  },
});// Mutation pour ajouter une image générée à une note existante
// Mutation publique pour ajouter une image générée (avec auth)
export const addGeneratedImage = mutation({
  args: {
    noteId: v.id("notes"),
    imageId: v.id("_storage"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or not authorized");
    }

    // Générer l'URL pour l'image stockée
    const imageUrl = await ctx.storage.getUrl(args.imageId);
    if (!imageUrl) {
      throw new Error("Failed to generate image URL");
    }

    // Ajouter l'image générée à la note
    const currentImageIds = note.imageIds || [];
    const currentImageUrls = note.imageUrls || [];

    await ctx.db.patch(args.noteId, {
      imageIds: [...currentImageIds, args.imageId],
      imageUrls: [...currentImageUrls, imageUrl],
      hasImages: true,
      generatedPrompt: args.prompt,
    });

    console.log(`✅ Image ajoutée à la note ${args.noteId}: ${imageUrl}`);
  },
});

// Mutation interne pour ajouter une image générée (sans auth, appelée par actions)
export const addGeneratedImageInternal = mutation({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"),
    imageId: v.id("_storage"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== args.userId) {
      throw new Error("Note not found or not authorized");
    }

    // Générer l'URL pour l'image stockée
    const imageUrl = await ctx.storage.getUrl(args.imageId);
    if (!imageUrl) {
      throw new Error("Failed to generate image URL");
    }

    // Ajouter l'image générée à la note
    const currentImageIds = note.imageIds || [];
    const currentImageUrls = note.imageUrls || [];

    await ctx.db.patch(args.noteId, {
      imageIds: [...currentImageIds, args.imageId],
      imageUrls: [...currentImageUrls, imageUrl],
      hasImages: true,
      generatedPrompt: args.prompt,
    });

    console.log(`✅ Image ajoutée à la note ${args.noteId}: ${imageUrl}`);
  },
});
