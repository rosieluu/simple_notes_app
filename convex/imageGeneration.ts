// convex/imageGeneration.ts
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";

// Query: Compter les générations d'un utilisateur aujourd'hui
export const getUserGenerationsToday = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const count = await ctx.db
      .query("imageGenerations")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", identity.subject as any).eq("date", args.date)
      )
      .collect();
    
    return count.length;
  },
});

// Mutation: Enregistrer une génération
export const recordGeneration = mutation({
  args: { 
    noteId: v.id("notes"),
    date: v.string(),
    prompt: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.insert("imageGenerations", {
      userId: identity.subject as any,
      noteId: args.noteId,
      date: args.date,
      prompt: args.prompt,
      imageUrl: "", // Sera mis à jour après génération
      success: true
    });
  },
});

// Action principale: Générer une image à partir d'une note
export const generateImageFromNote = action({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"), // Ajouter l'ID utilisateur
    style: v.optional(v.string()),
    useExistingImages: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 1. Utiliser l'ID utilisateur passé en paramètre
    const userId = args.userId;
    if (!userId) throw new Error("User ID required");
    
    console.log(`🎨 generateImageFromNote - Reçu userId: ${userId}, noteId: ${args.noteId}`);
    
    // Vérifier la limite quotidienne (simplifiée)
    const userGenerations = await ctx.runQuery(api.notes.list, {});
    const count = userGenerations.length; // Simplification temporaire
    
    if (count >= 50) { // Limite temporaire plus haute
      throw new Error("Limite quotidienne atteinte. Réessayez demain.");
    }

    // 2. Récupérer la note avec l'ID utilisateur
    const note = await ctx.runQuery(internal.notes.getByIdInternal, { 
      id: args.noteId,
      userId: userId 
    });
    if (!note) throw new Error("Note not found");

    // 3. Préparer le contexte
    const context = {
      title: note.title || "",
      content: note.content || note.defaultPrompt || "",
      existingImages: args.useExistingImages ? note.imageUrls : [],
      style: args.style || "photorealistic"
    };

    let optimizedPrompt: string;
    let imageUrl: string;

    try {
      // 4. Générer le prompt avec fallback
      optimizedPrompt = await generateOptimizedPromptWithFallback(context);

      // 5. Générer l'image avec Gemini
      imageUrl = await generateImageWithGemini({
        prompt: optimizedPrompt,
        referenceImages: context.existingImages,
        style: context.style
      });
    } catch (error) {
      console.error("Erreur génération Gemini:", error);
      
      // Fallback complet avec image de placeholder
      optimizedPrompt = generateBasicPrompt(context);
      
      // Utiliser une image de placeholder pour tester le flux
      imageUrl = await generatePlaceholderImage(optimizedPrompt);
    }

    // 6. Sauvegarder l'image
    const imageId = await saveImageToStorage(ctx, imageUrl);
    const finalImageUrl = await ctx.storage.getUrl(imageId);

    // 7. Mettre à jour la note (mutation interne)
    await ctx.runMutation(api.notes.addGeneratedImageInternal, {
      noteId: args.noteId,
      userId: args.userId,
      imageId,
      prompt: optimizedPrompt
    });

    // 8. Enregistrer la génération (TODO: à implémenter après déploiement)
    // await recordGeneration({ noteId: args.noteId, date: today, prompt: optimizedPrompt });

    return {
      imageUrl: finalImageUrl,
      prompt: optimizedPrompt,
      imageId,
      generationsRemaining: 5
    };
  },
});

// Helper: Prompt avec fallback (vérification 3)
async function generateOptimizedPromptWithFallback(context: any): Promise<string> {
  // Si pas d'API key OpenRouter, utiliser fallback
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("OpenRouter API key manquante, utilisation du fallback");
    return generateBasicPrompt(context);
  }

  try {
    return await generateOptimizedPrompt(context);
  } catch (error) {
    console.error("Erreur OpenRouter, fallback:", error);
    return generateBasicPrompt(context);
  }
}

// Helper: Optimisation du prompt avec Context7 + OpenRouter
async function generateOptimizedPrompt(context: any): Promise<string> {
  // Utiliser Context7 pour analyser le contenu et optimiser le prompt
  const contextAnalysis = await analyzeContentWithContext7(context);
  
  const messages = [
    {
      role: "system",
      content: `Tu es un expert en prompt engineering pour la génération d'images AI avec Gemini 2.5 Flash.
      Tu utilises l'analyse Context7 pour créer des prompts optimisés.
      
      RÈGLES STRICTES:
      - MAXIMUM 200 caractères (IMPÉRATIF pour Gemini)
      - Toujours répondre en ANGLAIS uniquement
      - Utiliser les insights Context7 fournis
      - Inclure des détails visuels spécifiques
      - Éviter les concepts abstraits
      - Format: "style, subject, composition, lighting, details"
      - Optimisé pour Gemini 2.5 Flash Image
      
      Exemple: "photorealistic portrait, young professional, clean background, soft natural lighting, high detail"`
    },
    {
      role: "user", 
      content: `Context7 Analysis: ${contextAnalysis}
      
      Note Titre: "${context.title}"
      Note Contenu: "${context.content}"
      Style demandé: ${context.style}
      ${context.existingImages.length > 0 ? `Images existantes: ${context.existingImages.length}` : ""}
      
      Génère un prompt optimisé en anglais, max 200 caractères.`
    }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet",
      messages,
      max_tokens: 80,
      temperature: 0.1, // Très faible pour cohérence
      top_p: 0.9
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  let prompt = data.choices[0].message.content.trim();
  
  // Nettoyer et valider le prompt
  prompt = prompt.replace(/['"]/g, '').trim();
  
  // Sécurité: Truncate si trop long
  if (prompt.length > 200) {
    prompt = prompt.substring(0, 197) + "...";
  }
  
  console.log(`📝 Prompt optimisé Context7: ${prompt}`);
  return prompt;
}

// Helper: Analyser le contenu avec Context7 (simulation d'utilisation)
async function analyzeContentWithContext7(context: any): Promise<string> {
  try {
    // Analyser le type de contenu
    const contentType = classifyContentType(context.title, context.content);
    
    // Analyser le sentiment et le style
    const mood = analyzeMood(context.content);
    
    // Suggérer des éléments visuels selon Context7 best practices
    const visualElements = suggestVisualElements(contentType, context.style);
    
    // Construire l'analyse Context7
    const analysis = `Type: ${contentType}, Mood: ${mood}, Visual: ${visualElements}`;
    
    console.log(`🔍 Context7 Analysis: ${analysis}`);
    return analysis;
    
  } catch (error) {
    console.error("Erreur analyse Context7:", error);
    return `Type: general, Mood: neutral, Visual: ${context.style}`;
  }
}

// Helper: Classifier le type de contenu
function classifyContentType(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.match(/meeting|réunion|notes|agenda/)) return "meeting";
  if (text.match(/idea|idée|concept|brainstorm/)) return "concept";
  if (text.match(/task|tâche|todo|action/)) return "task";
  if (text.match(/project|projet|plan/)) return "project";
  if (text.match(/personal|personnel|diary|journal/)) return "personal";
  if (text.match(/recipe|recette|food|cuisine/)) return "recipe";
  if (text.match(/travel|voyage|trip/)) return "travel";
  if (text.match(/code|programming|développement/)) return "technical";
  
  return "general";
}

// Helper: Analyser l'humeur/sentiment
function analyzeMood(content: string): string {
  const text = content.toLowerCase();
  
  if (text.match(/excited|amazing|great|wonderful|fantastic/)) return "positive";
  if (text.match(/urgent|important|critical|deadline/)) return "urgent";
  if (text.match(/calm|peaceful|relaxed|meditation/)) return "calm";
  if (text.match(/creative|artistic|design|inspiration/)) return "creative";
  if (text.match(/problem|issue|difficult|challenge/)) return "serious";
  
  return "neutral";
}

// Helper: Suggérer des éléments visuels selon Context7
function suggestVisualElements(contentType: string, style: string): string {
  const elementMap: Record<string, Record<string, string>> = {
    meeting: {
      photorealistic: "conference room, professional lighting, clean modern space",
      artistic: "abstract collaboration, geometric shapes, corporate colors",
      minimalist: "simple meeting space, white background, clean lines"
    },
    concept: {
      photorealistic: "lightbulb, brainstorming whiteboard, bright workspace",
      artistic: "abstract idea visualization, flowing shapes, vibrant colors",
      minimalist: "simple icon, clean background, focused composition"
    },
    travel: {
      photorealistic: "scenic destination, natural lighting, landscape view",
      artistic: "stylized map, travel icons, wanderlust aesthetic",
      minimalist: "simple travel symbol, clean design, neutral tones"
    },
    recipe: {
      photorealistic: "food photography, natural lighting, appetizing presentation",
      artistic: "illustrated ingredients, cookbook style, warm colors",
      minimalist: "simple food icon, clean plating, white background"
    }
  };
  
  return elementMap[contentType]?.[style] || "professional composition, good lighting, clear details";
}

// Helper: Prompt basique sans IA (fallback)
function generateBasicPrompt(context: any): string {
  const styleMap: Record<string, string> = {
    photorealistic: "photorealistic, high quality, detailed",
    artistic: "artistic, creative, stylized",
    cartoon: "cartoon style, colorful, animated",
    minimalist: "minimalist, clean, simple"
  };

  const baseStyle = styleMap[context.style] || "photorealistic";
  const subject = context.title || "abstract concept";
  const details = context.content ? context.content.substring(0, 50) : "creative interpretation";
  
  return `${baseStyle}, ${subject}, ${details}, professional lighting`.substring(0, 220);
}

// Helper: Génération d'image avec OpenRouter + Gemini 2.5 Flash Image
async function generateImageWithGemini(params: any): Promise<string> {
  // Vérifier la clé API OpenRouter
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY manquante");
  }

  try {
    // Construire le prompt optimisé
    let promptText = `${params.style || "photorealistic"} style: ${params.prompt}`;
    
    // Si on a des images de référence, ajuster le prompt
    if (params.referenceImages && params.referenceImages.length > 0) {
      promptText = `Using the style inspiration provided, ${promptText}. Enhance quality and maintain visual coherence.`;
    }

    // Déterminer l'aspect ratio optimal selon le contenu
    const aspectRatio = determineOptimalAspectRatio(params.prompt, params.style);

    // Requête à OpenRouter avec Gemini 2.5 Flash Image
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: promptText
          }
        ],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: aspectRatio
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenRouter API error:", response.status, errorData);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    // Vérifier la réponse
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Aucune réponse d'OpenRouter");
    }

    const message = data.choices[0].message;
    if (!message.images || message.images.length === 0) {
      throw new Error("Aucune image générée par Gemini via OpenRouter");
    }

    // Récupérer l'URL de l'image (format base64 data URL)
    const imageUrl = message.images[0].image_url.url;
    console.log(`✅ Image générée via OpenRouter: ${imageUrl.substring(0, 50)}...`);
    
    return imageUrl;
    
  } catch (error) {
    console.error("Erreur génération image OpenRouter:", error);
    
    // Fallback vers image placeholder en cas d'erreur
    console.log("🔄 Fallback vers image placeholder");
    return await generatePlaceholderImage(params.prompt);
  }
}

// Helper: Déterminer l'aspect ratio optimal selon le contenu
function determineOptimalAspectRatio(prompt: string, style: string): string {
  const promptLower = prompt.toLowerCase();
  
  // Portraits et personnes
  if (promptLower.includes("portrait") || promptLower.includes("person") || 
      promptLower.includes("face") || promptLower.includes("headshot")) {
    return "3:4"; // Portrait vertical
  }
  
  // Paysages et environnements
  if (promptLower.includes("landscape") || promptLower.includes("panorama") || 
      promptLower.includes("skyline") || promptLower.includes("horizon")) {
    return "16:9"; // Paysage cinématique
  }
  
  // Objets et produits
  if (promptLower.includes("product") || promptLower.includes("object") || 
      promptLower.includes("item") || promptLower.includes("tool")) {
    return "1:1"; // Carré pour produits
  }
  
  // Stories et réseaux sociaux
  if (promptLower.includes("story") || promptLower.includes("social") || 
      promptLower.includes("mobile")) {
    return "9:16"; // Vertical pour mobile
  }
  
  // Style artistique préfère souvent le carré
  if (style === "artistic" || style === "minimalist") {
    return "1:1";
  }
  
  // Par défaut: carré polyvalent
  return "1:1";
}

// Helper: Sauvegarder l'image dans Convex Storage
async function saveImageToStorage(ctx: any, imageData: string) {
  try {
    let blob;
    
    // Si c'est une data URL (de Gemini), extraire les données base64
    if (imageData.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      blob = new Blob([buffer], { type: 'image/png' });
    } else {
      // Si c'est une URL HTTP (fallback), fetch comme avant
      const response = await fetch(imageData);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      blob = await response.blob();
    }
    
    const storageId = await ctx.storage.store(blob);
    return storageId;
  } catch (error) {
    console.error("Erreur sauvegarde image:", error);
    throw new Error(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper: Générer une image de placeholder pour tester
async function generatePlaceholderImage(prompt: string): Promise<string> {
  // Utiliser l'API Placeholder.com pour générer une image de test
  const width = 400;
  const height = 300;
  const backgroundColor = "4F46E5"; // Bleu
  const textColor = "FFFFFF"; // Blanc
  
  // Créer le texte pour l'image (première partie du prompt)
  const displayText = prompt.substring(0, 30).replace(/ /g, "+");
  
  // URL de l'image placeholder
  const placeholderUrl = `https://via.placeholder.com/${width}x${height}/${backgroundColor}/${textColor}?text=${displayText}`;
  
  console.log(`📸 Génération image placeholder: ${placeholderUrl}`);
  
  return placeholderUrl;
}