import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

export const create = mutation({
  args: {
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

    return await ctx.db.insert("notes", {
      title: args.title || "Untitled Note",
      content: finalContent,
      tags: args.tags,
      userId,
      imageIds: args.imageIds?.slice(0, 3), // Limiter à 3 images
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      hasImages: args.imageIds && args.imageIds.length > 0,
      defaultPrompt,
    });
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
