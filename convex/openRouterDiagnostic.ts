// convex/openRouterDiagnostic.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

// Types pour l'analyse d'erreurs Context7
interface ErrorAnalysis {
  errorType: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  rootCause: string;
  solutions: string[];
  fallbackAvailable: boolean;
  estimatedResolution: string;
}

interface OpenRouterStatus {
  apiKeyValid: boolean;
  hasCredits: boolean;
  modelAvailable: boolean;
  lastError?: string;
  requestCount: number;
  successRate: number;
}

// Diagnostic principal avec Context7
export const diagnoseOpenRouterIssues = action({
  args: {
    errorMessage: v.optional(v.string()),
    testGeneration: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    status: OpenRouterStatus;
    analysis: ErrorAnalysis;
    recommendations: string[];
    canProceed: boolean;
  }> => {
    console.log("🔍 Context7: Début diagnostic OpenRouter...");
    
    // 1. Vérifier la configuration
    const configStatus = await checkOpenRouterConfiguration();
    
    // 2. Analyser les erreurs récentes avec Context7
    const errorAnalysis = await analyzeErrorWithContext7(args.errorMessage);
    
    // 3. Tester la connectivité si demandé
    let testResult = null;
    if (args.testGeneration) {
      testResult = await testOpenRouterConnectivity();
    }
    
    // 4. Générer les recommandations Context7
    const recommendations = generateContext7Recommendations(
      configStatus, 
      errorAnalysis, 
      testResult
    );
    
    // 5. Déterminer si on peut continuer
    const canProceed = determineIfCanProceed(configStatus, errorAnalysis);
    
    return {
      status: configStatus,
      analysis: errorAnalysis,
      recommendations,
      canProceed
    };
  },
});

// Vérifier la configuration OpenRouter
async function checkOpenRouterConfiguration(): Promise<OpenRouterStatus> {
  const status: OpenRouterStatus = {
    apiKeyValid: false,
    hasCredits: false,
    modelAvailable: false,
    requestCount: 0,
    successRate: 0
  };

  try {
    // Vérifier si la clé API existe
    if (!process.env.OPENROUTER_API_KEY) {
      status.lastError = "OPENROUTER_API_KEY not found in environment";
      return status;
    }

    status.apiKeyValid = true;

    // Tester la clé avec une requête de status
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      status.hasCredits = data.limit > 0 && data.usage < data.limit;
      status.requestCount = data.usage || 0;
      status.successRate = data.usage > 0 ? (data.usage - (data.errors || 0)) / data.usage : 1;
    } else {
      status.lastError = `API Key validation failed: ${response.status}`;
    }

    // Vérifier la disponibilité du modèle Gemini
    status.modelAvailable = await checkGeminiModelAvailability();

  } catch (error) {
    status.lastError = error instanceof Error ? error.message : "Unknown configuration error";
  }

  return status;
}

// Vérifier la disponibilité du modèle Gemini 2.5 Flash Image
async function checkGeminiModelAvailability(): Promise<boolean> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    const geminiModel = data.data?.find((model: any) => 
      model.id === "google/gemini-2.5-flash-image-preview"
    );

    return !!geminiModel && !geminiModel.disabled;
  } catch {
    return false;
  }
}

// Analyser l'erreur avec l'approche Context7
async function analyzeErrorWithContext7(errorMessage?: string): Promise<ErrorAnalysis> {
  const analysis: ErrorAnalysis = {
    errorType: "unknown",
    severity: "medium",
    category: "general",
    rootCause: "Undefined error",
    solutions: [],
    fallbackAvailable: true,
    estimatedResolution: "5-10 minutes"
  };

  if (!errorMessage) {
    analysis.errorType = "no_error_provided";
    analysis.severity = "low";
    analysis.category = "diagnostic";
    analysis.rootCause = "No specific error to analyze";
    analysis.solutions = ["Run test generation to identify issues"];
    return analysis;
  }

  // Context7 Pattern Recognition
  const errorPatterns = [
    {
      pattern: /insufficient.*credit/i,
      type: "insufficient_credits",
      severity: "high" as const,
      category: "billing",
      rootCause: "OpenRouter account has insufficient credits for image generation",
      solutions: [
        "Add credits to OpenRouter account",
        "Switch to free tier model if available",
        "Use fallback placeholder generation",
        "Implement rate limiting"
      ],
      fallback: true,
      resolution: "Immediate (with credit purchase)"
    },
    {
      pattern: /api.*key.*invalid/i,
      type: "invalid_api_key",
      severity: "critical" as const,
      category: "authentication",
      rootCause: "OpenRouter API key is invalid or expired",
      solutions: [
        "Verify API key in OpenRouter dashboard",
        "Regenerate API key if expired",
        "Check environment variable configuration",
        "Ensure key has image generation permissions"
      ],
      fallback: true,
      resolution: "5 minutes"
    },
    {
      pattern: /model.*not.*available/i,
      type: "model_unavailable",
      severity: "high" as const,
      category: "service",
      rootCause: "Gemini 2.5 Flash Image model is not available",
      solutions: [
        "Check OpenRouter model status page",
        "Switch to alternative image generation model",
        "Wait for model to become available",
        "Use Context7 fallback generation"
      ],
      fallback: true,
      resolution: "Variable (depends on service)"
    },
    {
      pattern: /rate.*limit/i,
      type: "rate_limited",
      severity: "medium" as const,
      category: "throttling",
      rootCause: "API rate limit exceeded",
      solutions: [
        "Implement exponential backoff",
        "Reduce generation frequency",
        "Queue requests for later processing",
        "Upgrade OpenRouter plan"
      ],
      fallback: true,
      resolution: "1-60 minutes"
    },
    {
      pattern: /cannot.*read.*properties.*undefined/i,
      type: "undefined_property",
      severity: "medium" as const,
      category: "code",
      rootCause: "Accessing undefined object properties in response handling",
      solutions: [
        "Add null/undefined checks before property access",
        "Validate API response structure",
        "Implement defensive programming patterns",
        "Add comprehensive error handling"
      ],
      fallback: true,
      resolution: "10-15 minutes"
    },
    {
      pattern: /network.*error|fetch.*failed|connection/i,
      type: "network_error",
      severity: "medium" as const,
      category: "connectivity",
      rootCause: "Network connectivity issues with OpenRouter API",
      solutions: [
        "Check internet connectivity",
        "Implement retry mechanism with exponential backoff",
        "Add timeout configuration",
        "Use fallback placeholder generation during outages"
      ],
      fallback: true,
      resolution: "Variable (depends on network)"
    }
  ];

  // Trouver le pattern correspondant
  const matchedPattern = errorPatterns.find(p => p.pattern.test(errorMessage));
  
  if (matchedPattern) {
    analysis.errorType = matchedPattern.type;
    analysis.severity = matchedPattern.severity;
    analysis.category = matchedPattern.category;
    analysis.rootCause = matchedPattern.rootCause;
    analysis.solutions = matchedPattern.solutions;
    analysis.fallbackAvailable = matchedPattern.fallback;
    analysis.estimatedResolution = matchedPattern.resolution;
  } else {
    // Analyse générique pour erreurs non reconnues
    analysis.errorType = "unrecognized_error";
    analysis.severity = "medium";
    analysis.category = "unknown";
    analysis.rootCause = `Unrecognized error pattern: ${errorMessage.substring(0, 100)}`;
    analysis.solutions = [
      "Check OpenRouter documentation for similar errors",
      "Review recent API changes",
      "Contact OpenRouter support",
      "Use Context7 fallback generation"
    ];
  }

  console.log(`🔍 Context7 Error Analysis: ${analysis.errorType} (${analysis.severity})`);
  return analysis;
}

// Tester la connectivité OpenRouter
async function testOpenRouterConnectivity(): Promise<{
  success: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Test minimal de génération d'image
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
            content: "Generate a simple test image: red circle"
          }
        ],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: "1:1"
        },
        max_tokens: 100
      })
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      
      // Vérifier si l'image a été générée
      const hasImage = data.choices?.[0]?.message?.images?.length > 0;
      
      return {
        success: hasImage,
        latency,
        error: hasImage ? undefined : "No image generated in response"
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        latency,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown test error"
    };
  }
}

// Générer des recommandations basées sur Context7
function generateContext7Recommendations(
  status: OpenRouterStatus,
  analysis: ErrorAnalysis,
  testResult: any
): string[] {
  const recommendations: string[] = [];

  // Recommandations basées sur le status
  if (!status.apiKeyValid) {
    recommendations.push("🔑 CRITIQUE: Configurer OPENROUTER_API_KEY dans les variables d'environnement Convex");
    recommendations.push("📋 Vérifier que la clé API a les permissions pour la génération d'images");
  }

  if (!status.hasCredits) {
    recommendations.push("💳 URGENT: Ajouter des crédits à votre compte OpenRouter");
    recommendations.push("🔄 Activer le fallback placeholder en attendant");
  }

  if (!status.modelAvailable) {
    recommendations.push("🤖 Vérifier la disponibilité du modèle google/gemini-2.5-flash-image-preview");
    recommendations.push("🔄 Considérer un modèle alternatif temporairement");
  }

  // Recommandations spécifiques à l'erreur
  if (analysis.errorType === "insufficient_credits") {
    recommendations.push("💰 Solution immédiate: Acheter des crédits OpenRouter");
    recommendations.push("⚡ Solution temporaire: Utiliser le générateur placeholder");
    recommendations.push("📊 Solution long-terme: Implémenter un système de quota utilisateur");
  }

  if (analysis.errorType === "undefined_property") {
    recommendations.push("🛡️ Ajouter des vérifications null/undefined dans le code");
    recommendations.push("🧪 Tester la structure de réponse OpenRouter");
    recommendations.push("📝 Améliorer la gestion d'erreurs défensive");
  }

  // Recommandations générales Context7
  recommendations.push("🔍 Utiliser Context7 pour l'optimisation continue des prompts");
  recommendations.push("📈 Monitorer les taux de succès et ajuster en conséquence");
  recommendations.push("🎯 Implémenter un système de fallback intelligent");

  // Recommandations basées sur les tests
  if (testResult && !testResult.success) {
    recommendations.push("🔧 Déboguer la connectivité OpenRouter en priorité");
    recommendations.push("⏱️ Implémenter un système de retry avec backoff");
  }

  return recommendations;
}

// Déterminer si on peut continuer l'opération
function determineIfCanProceed(
  status: OpenRouterStatus,
  analysis: ErrorAnalysis
): boolean {
  // Bloqueurs critiques
  if (!status.apiKeyValid) return false;
  if (analysis.severity === "critical") return false;
  
  // Si on a des fallbacks disponibles, on peut continuer
  if (analysis.fallbackAvailable) return true;
  
  // Vérifier le status général
  return status.hasCredits && status.modelAvailable;
}