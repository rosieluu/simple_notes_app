import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  notes: defineTable({
    title: v.optional(v.string()), // Titre optionnel
    content: v.optional(v.string()), // Contenu optionnel
    tags: v.array(v.string()),
    userId: v.id("users"),
    
    // Support multiple images (max 3)
    imageIds: v.optional(v.array(v.id("_storage"))), // Array d'IDs d'images
    imageUrls: v.optional(v.array(v.string())), // Array d'URLs d'images
    hasImages: v.optional(v.boolean()), // Flag pour savoir s'il y a des images
    
    // Prompt par défaut si contenu vide
    defaultPrompt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_with_images", ["userId", "hasImages"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    })
    .searchIndex("search_title", {
      searchField: "title", 
      filterFields: ["userId"],
    }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
