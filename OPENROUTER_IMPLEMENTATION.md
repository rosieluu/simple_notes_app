# 🎨 OpenRouter + Gemini 2.5 Flash Image Integration

Cette implémentation intègre OpenRouter avec Gemini 2.5 Flash Image et Context7 pour générer automatiquement des images à partir de vos notes.

## 🚀 Fonctionnalités

### ✅ Implémenté
- **OpenRouter API** avec Gemini 2.5 Flash Image
- **Context7** pour l'optimisation des prompts
- **Aspect ratios configurables** (1:1, 16:9, 9:16, 3:4, 4:3)
- **Styles multiples** (photorealistic, artistic, minimalist, cartoon)
- **Génération automatique** lors de la création de notes
- **Régénération d'images** pour les notes existantes
- **Interface de configuration** intuitive

### 🔄 En cours
- **Migration API** : Transition vers OpenRouter (actuellement en fallback)
- **Optimisation stockage** : Compression des images base64
- **Analytics** : Tracking des générations par utilisateur

## 🛠️ Configuration

### 1. Clé API OpenRouter
```bash
# Ajoutez dans .env.local
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Obtenez votre clé sur : https://openrouter.ai/keys

### 2. Lancement de l'application
```bash
# Terminal 1: Backend Convex
npm run dev:backend

# Terminal 2: Frontend React
npm run dev:frontend
```

## 🎯 Utilisation

### Création de note avec génération d'image
1. Cliquez sur "✨ Create & Generate Photo"
2. Configurez les paramètres de génération :
   - **API** : OpenRouter + Gemini 2.5 Flash (recommandé)
   - **Style** : photorealistic, artistic, minimalist, cartoon
   - **Aspect Ratio** : 1:1, 16:9, 9:16, 3:4, 4:3
   - **Context7** : Optimisation automatique des prompts
3. Écrivez votre note (titre et contenu optionnels)
4. Soumettez : l'image sera générée automatiquement

### Régénération d'images
- Cliquez sur le bouton "🎨 Regen" sur une note existante
- L'image sera régénérée avec les paramètres actuels

## 🔍 Context7 Intelligence

Context7 analyse automatiquement :
- **Type de contenu** : meeting, concept, travel, recipe, etc.
- **Sentiment** : positive, urgent, calm, creative, serious
- **Éléments visuels** : suggestions optimisées par type et style

### Exemples d'optimisation
```
Input: "Réunion équipe projet marketing"
Context7 → "professional meeting room, modern office space, collaborative atmosphere, clean lighting"

Input: "Recette gâteau chocolat"
Context7 → "food photography, chocolate cake, appetizing presentation, warm lighting, kitchen setting"
```

## 📐 Aspect Ratios Support

| Ratio | Résolution | Usage |
|-------|------------|-------|
| 1:1 | 1024×1024 | Posts, produits, icônes |
| 16:9 | 1344×768 | Paysages, bannières |
| 9:16 | 768×1344 | Stories, mobile |
| 3:4 | 864×1184 | Portraits, photos |
| 4:3 | 1184×864 | Présentations |

## 🎨 Styles Disponibles

- **Photorealistic** : Photos réalistes, haute définition
- **Artistic** : Style artistique, créatif, stylisé
- **Minimalist** : Design épuré, lignes nettes
- **Cartoon** : Style cartoon, coloré, animé

## 🏗️ Architecture Technique

```
Note Content → Context7 Analysis → Prompt Optimization → OpenRouter API → Gemini 2.5 Flash → Base64 Image → Convex Storage
```

### Fichiers principaux
- `convex/imageGenerationOpenRouter.ts` : Nouvelle API OpenRouter
- `convex/imageGeneration.ts` : API legacy (fallback)
- `convex/notes.ts` : Mutations et queries
- `src/NotesApp.tsx` : Interface utilisateur

## 🐛 Debugging

### Vérifier les logs Convex
```bash
npx convex logs
```

### Variables d'environnement
```bash
# Vérifier que la clé est définie
echo $OPENROUTER_API_KEY
```

### Test de l'API OpenRouter
```bash
curl -X POST "https://openrouter.ai/api/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash-image-preview",
    "messages": [{"role": "user", "content": "Test image generation"}],
    "modalities": ["image", "text"]
  }'
```

## 💡 Prochaines étapes

1. **Finaliser migration OpenRouter** une fois l'API générée
2. **Optimiser les prompts Context7** avec des patterns plus avancés
3. **Ajouter cache d'images** pour éviter les régénérations
4. **Implémenter batch processing** pour multiple images
5. **Ajouter analytics** détaillées des générations

## 🆘 Support

En cas de problème :
1. Vérifiez que `OPENROUTER_API_KEY` est définie
2. Consultez les logs Convex : `npx convex logs`
3. Testez l'API OpenRouter directement
4. Utilisez le fallback legacy en cas d'urgence

---

**Status** : ✅ Fonctionnel avec fallback | 🔄 Migration OpenRouter en cours