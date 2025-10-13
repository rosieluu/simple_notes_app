// convex/imageGenerationOpenRouter.ts - Version OpenRouter + Context7
import { action, mutation, query, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Modèle utilisé pour la génération d'images
const MODEL = "google/gemini-2.5-flash-image";

// Query interne: Compter les générations d'un utilisateur aujourd'hui
export const getUserGenerationsTodayInternal = internalQuery({
  args: { 
    userId: v.id("users"),
    date: v.string() 
  },
  handler: async (ctx, args) => {
    const count = await ctx.db
      .query("imageGenerations")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .collect();
    
    return count.length;
  },
});

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
    prompt: v.string(),
    aspectRatio: v.optional(v.string()),
    style: v.optional(v.string()),
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

// Action principale: Générer une image avec OpenRouter + Context7
export const generateImageFromNoteOpenRouter = action({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"),
    style: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    useContext7: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    imageUrl: string;
    prompt: string;
    imageId: string;
    generationsRemaining: number;
  }> => {
    console.log(`🎨 OpenRouter Generation - userId: ${args.userId}, noteId: ${args.noteId}`);
    
    // 🔍 Context7: Diagnostic préliminaire
    // TODO: Activer après déploiement du diagnostic
    // const diagnostic = await ctx.runAction(api.openRouterDiagnostic.diagnoseOpenRouterIssues, {
    //   testGeneration: false
    // });
    
    // if (!diagnostic.canProceed) {
    //   console.error("❌ Context7: Cannot proceed with OpenRouter generation");
    //   console.error(`Reason: ${diagnostic.analysis.rootCause}`);
    //   
    //   // Utiliser le fallback immédiatement
    //   return await generateFallbackImage(ctx, args);
    // }
    
    // console.log(`✅ Context7: OpenRouter diagnostic passed (${diagnostic.analysis.errorType})`);
    
    const userId = args.userId;
    if (!userId) throw new Error("User ID required");
    
    // Vérifier les limites de manière simplifiée pour le développement
    const today = new Date().toISOString().split('T')[0];
    console.log(`📊 Vérification limite pour ${userId} le ${today}`);
    
    // Pour l'instant, pas de limite stricte en développement
    // TODO: Implémenter la vérification des limites une fois l'API générée

    // Récupérer la note
    const note = await ctx.runQuery(internal.notes.getByIdInternal, { 
      id: args.noteId,
      userId: userId 
    });
    
    if (!note) throw new Error("Note not found");

    // ============================================
    // GÉNÉRATION SIMPLE: Texte de la note → Image
    // Pas de Context7, juste Gemini 2.5 Flash Image
    // ============================================
    
    const noteContent = note.content || note.defaultPrompt || "";
    const style = args.style || "photorealistic";
    const aspectRatio = args.aspectRatio || "1:1";
    
    // Construire le prompt directement du contenu de la note
    let prompt = `${style}, ${noteContent}`;
    
    // Limiter à 180 caractères pour Gemini 2.5 Flash Image
    if (prompt.length > 180) {
      prompt = prompt.substring(0, 177) + "...";
    }

    try {
      console.log(`📝 Prompt direct: "${prompt}"`);
      console.log(`📐 Aspect Ratio: ${aspectRatio}`);

      // Générer l'image avec OpenRouter + Gemini 2.5 Flash Image
      const imageUrl = await generateImageWithOpenRouter({
        prompt: prompt,
        style: style,
        aspectRatio: aspectRatio,
        referenceImages: undefined // Pas de photos de référence pour l'instant
      });

      // 3. Sauvegarder l'image dans Convex Storage
      const storageId = await saveImageToStorage(ctx, imageUrl);
      const finalImageUrl = await ctx.storage.getUrl(storageId);
      
      if (!finalImageUrl) {
        throw new Error("Failed to get image URL from storage");
      }

      // 3. Mettre à jour la note avec la nouvelle image (mutation interne)
      await ctx.runMutation(api.notes.addGeneratedImageInternal, {
        noteId: args.noteId,
        userId: args.userId,
        imageId: storageId,
        prompt: prompt
      });

      console.log(`✅ Image générée et sauvegardée: ${storageId}`);
      console.log(`📊 Prompt utilisé: "${prompt}"`);
      
      return {
        imageUrl: finalImageUrl,
        imageId: storageId,
        prompt: prompt,
        generationsRemaining: 5
      };

    } catch (error) {
      console.error("❌ Erreur génération OpenRouter:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Fallback simple: image placeholder
      const fallbackPrompt = prompt;
      
      if (errorMessage.includes("insufficient") || errorMessage.includes("credit")) {
        console.log("💳 Credits insuffisants - utilisation placeholder");
        return await generateFallbackWithPlaceholder(ctx, args, fallbackPrompt, "insufficient_credits");
      } else {
        console.log("🔄 Erreur - utilisation placeholder");
        return await generateFallbackWithPlaceholder(ctx, args, fallbackPrompt, "generic_error");
      }
    }
  },
});

// Helper: Générer prompt optimisé avec Context7 + OpenRouter
async function generateOptimizedPromptContext7(context: {
  title: string;
  content: string;
  existingImages: string[];
  style: string;
  aspectRatio?: string;
}): Promise<string> {
  try {
    // Vérification de sécurité du contexte
    if (!context || typeof context !== 'object') {
      console.warn("Invalid context object, using fallback");
      return generateBasicPrompt({ title: "", content: "", style: "photorealistic" });
    }
    
    // Normaliser les valeurs du contexte
    const safeContext = {
      title: context.title || "",
      content: context.content || "",
      style: context.style || "photorealistic",
      existingImages: Array.isArray(context.existingImages) ? context.existingImages : []
    };
    
    // Analyser le contenu avec Context7
    const contextAnalysis = await analyzeContentWithContext7(safeContext);
    
    const messages = [
      {
        role: "system",
        content: `You are an expert in prompt engineering for Gemini 2.5 Flash Image generation.
        You use Context7 analysis to create optimized prompts.
        
        STRICT RULES:
        - MAX 180 characters (CRITICAL for Gemini)
        - Respond in ENGLISH only
        - Use Context7 insights provided
        - Include specific visual details
        - Avoid abstract concepts
        - Format: "style, subject, composition, lighting, details"
        - Optimized for Gemini 2.5 Flash Image
        
        Example: "photorealistic portrait, young professional, clean background, soft natural lighting, high detail"`
      },
      {
        role: "user", 
        content: `Context7 Analysis: ${contextAnalysis}
        
        Note Title: "${safeContext.title}"
        Note Content: "${safeContext.content}"
        Requested Style: ${safeContext.style}
        ${safeContext.existingImages.length > 0 ? `Existing Images: ${safeContext.existingImages.length}` : ""}
        
        Generate an optimized prompt in English, max 180 characters.`
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
        max_tokens: 60,
        temperature: 0.1,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      console.warn(`OpenRouter prompt optimization failed: ${response.status}`);
      // Fallback vers prompt basique
      return generateBasicPrompt(safeContext);
    }

    const data = await response.json();
    
    // Vérifier la structure de la réponse
    if (!data?.choices?.[0]?.message?.content) {
      console.warn("Invalid OpenRouter response structure, using fallback");
      return generateBasicPrompt(safeContext);
    }
    
    let prompt = data.choices[0].message.content.trim();
    
    // Nettoyer le prompt
    prompt = prompt.replace(/['"]/g, '').trim();
    
    // Sécurité: Truncate si nécessaire
    if (prompt.length > 180) {
      prompt = prompt.substring(0, 177) + "...";
    }
    
    console.log(`📝 Context7 Optimized Prompt: ${prompt}`);
    return prompt;
    
  } catch (error) {
    console.error("Erreur optimisation Context7:", error);
    // Fallback vers prompt basique avec contexte de base
    return generateBasicPrompt({
      title: context.title || "",
      content: context.content || "",
      style: context.style || "photorealistic"
    });
  }
}

// Helper: Analyser le contenu avec Context7
async function analyzeContentWithContext7(context: {
  title: string;
  content: string;
  style: string;
}): Promise<string> {
  try {
    const contentType = classifyContentType(context.title, context.content);
    const mood = analyzeMood(context.content);
    const visualElements = suggestVisualElements(contentType, context.style);
    
    const analysis = `Type: ${contentType}, Mood: ${mood}, Visual: ${visualElements}`;
    console.log(`🔍 Context7 Analysis: ${analysis}`);
    return analysis;
    
  } catch (error) {
    console.error("Erreur analyse Context7:", error);
    return `Type: general, Mood: neutral, Visual: ${context.style}`;
  }
}

// Helper: Générer l'image avec OpenRouter + Gemini 2.5 Flash
async function generateImageWithOpenRouter(params: {
  prompt: string;
  style: string;
  aspectRatio: string;
  referenceImages?: string[];
}): Promise<string> {
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY missing");
  }

  try {
    // Le prompt est déjà construit, on l'utilise directement
    const promptText = params.prompt;

    console.log(`🎨 Generating with OpenRouter/Gemini: "${promptText}"`);
    console.log(`📐 Aspect Ratio: ${params.aspectRatio}`);

    // Requête OpenRouter avec Gemini 2.5 Flash Image
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://simple-notes-app.vercel.app",
        "X-Title": "Simple Notes App",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image", // Version stable (pas preview)
        messages: [
          {
            role: "user",
            content: promptText
          }
        ],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: params.aspectRatio
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenRouter Error:", response.status, errorData);
      
      // Cas spécifique: crédits insuffisants
      if (response.status === 402 || errorData.includes("Insufficient credits")) {
        console.log("💰 Credits insuffisants OpenRouter, fallback vers placeholder");
        return generatePlaceholderImage(params.prompt);
      }
      
      // Autres erreurs API
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error("Invalid OpenRouter response structure:", data);
      throw new Error("No valid response from OpenRouter");
    }

    const message = data.choices[0]?.message;
    if (!message || !message.images || !Array.isArray(message.images) || message.images.length === 0) {
      console.error("No images in OpenRouter response:", message);
      throw new Error("No image generated by Gemini via OpenRouter");
    }

    // Vérifier la structure de l'image
    const imageData = message.images[0];
    if (!imageData?.image_url?.url) {
      console.error("Invalid image structure:", imageData);
      throw new Error("Invalid image URL structure from OpenRouter");
    }

    // Récupérer l'URL de l'image (base64 data URL)
    const imageUrl = imageData.image_url.url;
    console.log(`✅ Image generated via OpenRouter: ${imageUrl.substring(0, 50)}...`);
    
    return imageUrl;
    
  } catch (error) {
    console.error("OpenRouter Generation Error:", error);
    
    // Fallback vers image placeholder
    console.log("🔄 Fallback to placeholder image");
    return generatePlaceholderImage(params.prompt);
  }
}

// Helper: Déterminer l'aspect ratio optimal
function determineOptimalAspectRatio(prompt: string, style: string): string {
  const promptLower = prompt.toLowerCase();
  
  // Portraits et personnes
  if (promptLower.includes("portrait") || promptLower.includes("person") || 
      promptLower.includes("face") || promptLower.includes("headshot")) {
    return "3:4";
  }
  
  // Paysages et environnements
  if (promptLower.includes("landscape") || promptLower.includes("panorama") || 
      promptLower.includes("skyline") || promptLower.includes("horizon")) {
    return "16:9";
  }
  
  // Objets et produits
  if (promptLower.includes("product") || promptLower.includes("object") || 
      promptLower.includes("item") || promptLower.includes("tool")) {
    return "1:1";
  }
  
  // Stories verticales
  if (promptLower.includes("story") || promptLower.includes("mobile")) {
    return "9:16";
  }
  
  // Style artistique carré
  if (style === "artistic" || style === "minimalist") {
    return "1:1";
  }
  
  return "1:1"; // Par défaut
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

// Helper: Analyser l'humeur
function analyzeMood(content: string): string {
  const text = content.toLowerCase();
  
  if (text.match(/excited|amazing|great|wonderful|fantastic/)) return "positive";
  if (text.match(/urgent|important|critical|deadline/)) return "urgent";
  if (text.match(/calm|peaceful|relaxed|meditation/)) return "calm";
  if (text.match(/creative|artistic|design|inspiration/)) return "creative";
  if (text.match(/problem|issue|difficult|challenge/)) return "serious";
  
  return "neutral";
}

// Helper: Suggérer des éléments visuels
function suggestVisualElements(contentType: string, style: string): string {
  const elementMap: Record<string, Record<string, string>> = {
    meeting: {
      photorealistic: "conference room, professional lighting, modern space",
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

// Helper: Prompt basique (fallback)
async function generateBasicPrompt(context: {
  title: string;
  content: string;
  style: string;
}): Promise<string> {
  const styleMap: Record<string, string> = {
    photorealistic: "photorealistic, high quality, detailed",
    artistic: "artistic, creative, stylized",
    cartoon: "cartoon style, colorful, animated",
    minimalist: "minimalist, clean, simple"
  };

  const baseStyle = styleMap[context.style] || "photorealistic";
  const subject = context.title || "abstract concept";
  const details = context.content ? context.content.substring(0, 40) : "creative interpretation";
  
  return `${baseStyle}, ${subject}, ${details}, professional lighting`.substring(0, 180);
}

// Helper: Sauvegarder l'image dans Convex Storage
async function saveImageToStorage(ctx: any, imageData: string): Promise<any> {
  try {
    let blob;
    
    if (imageData.startsWith('data:image')) {
      // Image base64 d'OpenRouter - SANS Buffer (compatible Convex)
      const base64Data = imageData.split(',')[1];
      
      // Convertir base64 en Uint8Array sans utiliser Buffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      blob = new Blob([bytes], { type: 'image/png' });
    } else {
      // URL HTTP (fallback)
      const response = await fetch(imageData);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      blob = await response.blob();
    }
    
    const storageId = await ctx.storage.store(blob);
    return storageId;
    
  } catch (error) {
    console.error("Storage error:", error);
    throw new Error(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper: Image placeholder pour les tests et fallbacks
async function generatePlaceholderImage(prompt: string): Promise<string> {
  try {
    // Créer une image simple en SVG encodée en base64
    const width = 512;
    const height = 512;
    const backgroundColor = "#4F46E5";
    const textColor = "#FFFFFF";
    
    // Nettoyer le prompt pour l'affichage
    const displayText = prompt.substring(0, 30).replace(/[<>&"]/g, ' ').trim();
    
    // Créer un SVG simple
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="${textColor}" text-anchor="middle" dy=".3em">
        ${displayText}
      </text>
    </svg>`;
    
    // Encoder en base64 sans Buffer (compatible Convex)
    const base64Svg = btoa(svg);
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
    
    console.log(`📸 Placeholder SVG généré pour: "${displayText}"`);

    return dataUrl;
    
  } catch (error) {
    console.error("Erreur génération placeholder:", error);
    
    // Fallback ultime: une image basique via placeholder.com
    const fallbackUrl = "https://via.placeholder.com/512x512/4F46E5/FFFFFF?text=Image+Preview";
    console.log(`🆘 Fallback vers: ${fallbackUrl}`);
    return fallbackUrl;
  }
}

// Helper: Génération de fallback avec placeholder intelligent
async function generateFallbackWithPlaceholder(
  ctx: any, 
  args: any, 
  prompt: string, 
  errorType: string
): Promise<{
  imageUrl: string;
  prompt: string;
  imageId: string;
  generationsRemaining: number;
}> {
  console.log(`🔄 Context7: Generating fallback for error type: ${errorType}`);
  
  try {
    // Créer une image placeholder avec Context7 enhanced
    const placeholderUrl = await generateEnhancedPlaceholder(prompt, errorType);
    
    // Sauvegarder le placeholder dans Convex Storage
    const storageId = await saveImageToStorage(ctx, placeholderUrl);
    const finalImageUrl = await ctx.storage.getUrl(storageId);
    
    if (!finalImageUrl) {
      throw new Error("Failed to get placeholder image URL from storage");
    }

    // Mettre à jour la note avec l'image de fallback (mutation interne)
    await ctx.runMutation(api.notes.addGeneratedImageInternal, {
      noteId: args.noteId,
      userId: args.userId,
      imageId: storageId,
      prompt: `[Fallback: ${errorType}] ${prompt}`
    });

    console.log(`✅ Context7: Fallback image generated and saved: ${storageId}`);
    
    return {
      imageUrl: finalImageUrl,
      imageId: storageId,
      prompt: `[Fallback: ${errorType}] ${prompt}`,
      generationsRemaining: 5
    };
    
  } catch (fallbackError) {
    console.error("❌ Erreur lors de la génération de fallback:", fallbackError);
    throw new Error(`Both primary and fallback generation failed: ${fallbackError}`);
  }
}

// Helper: Générer placeholder amélioré avec Context7
async function generateEnhancedPlaceholder(prompt: string, errorType: string): Promise<string> {
  // Créer des couleurs et textes selon le type d'erreur
  const errorConfig = {
    insufficient_credits: {
      bgColor: "FF6B6B", // Rouge
      textColor: "FFFFFF",
      emoji: "💳",
      text: "Credits+Required"
    },
    model_unavailable: {
      bgColor: "4ECDC4", // Turquoise
      textColor: "FFFFFF", 
      emoji: "🤖",
      text: "Model+Offline"
    },
    undefined_properties: {
      bgColor: "45B7D1", // Bleu
      textColor: "FFFFFF",
      emoji: "🛡️", 
      text: "Code+Error"
    },
    generic_error: {
      bgColor: "96CEB4", // Vert
      textColor: "FFFFFF",
      emoji: "🔄",
      text: "Fallback+Mode"
    }
  };

  const config = errorConfig[errorType as keyof typeof errorConfig] || errorConfig.generic_error;
  
  // Extraire les mots clés du prompt pour l'affichage
  const promptKeywords = prompt
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3)
    .slice(0, 3)
    .join('+') || 'Image';

  // Construire l'URL du placeholder avec Context7 optimizations
  const width = 500;
  const height = 500;
  const displayText = `${config.emoji}+${config.text}+${promptKeywords}`;
  
  const placeholderUrl = `https://via.placeholder.com/${width}x${height}/${config.bgColor}/${config.textColor}?text=${displayText}`;
  
  console.log(`📸 Context7 Enhanced Placeholder: ${placeholderUrl}`);
  
  return placeholderUrl;
}

// Action de test: Vérifier que l'API OpenRouter fonctionne
export const testOpenRouterConnection = action({
  args: {
    testPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const testPrompt = args.testPrompt || "photorealistic style: beautiful sunset over mountains";
    
    console.log(`🧪 Test OpenRouter avec: ${testPrompt}`);
    
    try {
      // Test simple de génération d'image
      const result = await generateImageWithOpenRouter({
        prompt: testPrompt,
        style: "photorealistic",
        aspectRatio: "1:1",
        referenceImages: []
      });
      
      console.log(`✅ Test réussi! Image générée: ${result.substring(0, 100)}...`);
      
      return {
        success: true,
        message: "OpenRouter + Gemini 2.5 Flash fonctionne!",
        imageUrl: result.substring(0, 100) + "...",
        fullResponse: result.startsWith('data:image') ? 'Base64 Image Data' : result
      };
      
    } catch (error) {
      console.error("❌ Test échoué:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erreur inconnue",
        error: String(error)
      };
    }
  },
});