# 🔴 ERREURS ET SOLUTIONS - Génération d'Images

## Erreurs Identifiées (Oct 13, 12:03-12:04)

---

## ❌ **ERREUR 1 : Crédits OpenRouter Insuffisants** (CRITIQUE)

### Message d'erreur :
```
OpenRouter Error: 402 {"message":"Insufficient credits. This account never purchased credits. 
Make sure your key is on the correct account or org, and..."}
```

### 💡 **SOLUTION IMMÉDIATE**

#### Option A : Ajouter des Crédits (Recommandé)
1. **Aller sur** : https://openrouter.ai/settings/credits
2. **Acheter des crédits** : Minimum $5 USD
3. **Modèles disponibles après** :
   - ✅ Gemini 2.5 Flash Image ($0.00003/image)
   - ✅ Flux Pro ($0.05/image)
   - ✅ DALL-E 3 ($0.04/image)

#### Option B : Utiliser un Modèle Gratuit (Temporaire)
Modifier le modèle dans `imageGenerationOpenRouter.ts` :

```typescript
// Ligne 8
const MODEL = "google/gemini-flash-1.5";  // Modèle texte gratuit (pas d'images)
```

⚠️ **Note** : Les modèles gratuits ne génèrent PAS d'images, seulement du texte.

#### Option C : Utiliser l'API Gemini Directe
Au lieu d'OpenRouter, utilisez directement l'API Google Gemini (gratuit avec quotas) :

```typescript
// Utiliser GEMINI_API_KEY au lieu de OPENROUTER_API_KEY
const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
  {
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY
    }
  }
);
```

---

## ❌ **ERREUR 2 : Buffer is not defined** (CORRIGÉE ✅)

### Message d'erreur :
```
ReferenceError: Buffer is not defined
```

### Cause :
Convex ne supporte pas l'objet `Buffer` de Node.js dans les actions.

### ✅ **SOLUTION APPLIQUÉE**

#### Ligne 549 : Conversion base64 → Blob
**Avant :**
```typescript
const buffer = Buffer.from(base64Data, 'base64');
blob = new Blob([buffer], { type: 'image/png' });
```

**Après :**
```typescript
// Convertir base64 en Uint8Array sans Buffer
const binaryString = atob(base64Data);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
blob = new Blob([bytes], { type: 'image/png' });
```

#### Ligne 597 : Encodage SVG → base64
**Avant :**
```typescript
const base64Svg = Buffer.from(svg).toString('base64');
```

**Après :**
```typescript
const base64Svg = btoa(svg);  // API Web standard
```

---

## ❌ **ERREUR 3 : Failed to save image (Placeholder)** (CONSÉQUENCE)

### Message d'erreur :
```
Failed to save image: error sending request for url (https://via.placeholder.com/500x500/...)
```

### Cause :
Cette erreur apparaît **à cause de l'Erreur 1** (crédits insuffisants). Le système essaie de générer un placeholder mais échoue à le télécharger.

### ✅ **SOLUTION**
Résoudre l'Erreur 1 (ajouter des crédits) va aussi résoudre cette erreur.

**Alternative** : Améliorer le système de fallback pour utiliser des SVG locaux :

```typescript
// Générer un placeholder SVG local au lieu de via.placeholder.com
function generateLocalPlaceholder(text: string): string {
  const svg = `<svg>...</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
```

---

## 📊 **RÉSUMÉ DES CORRECTIONS APPLIQUÉES**

| Fichier | Ligne | Changement | Status |
|---------|-------|------------|--------|
| `imageGenerationOpenRouter.ts` | 549 | Remplacé `Buffer.from()` par `atob()` + `Uint8Array` | ✅ Corrigé |
| `imageGenerationOpenRouter.ts` | 597 | Remplacé `Buffer.from()` par `btoa()` | ✅ Corrigé |
| `testOpenRouterIntegration.ts` | 80 | Corrigé syntaxe (virgule manquante) | ✅ Corrigé |

---

## 🎯 **PROCHAINES ÉTAPES**

### 1. **Ajouter des Crédits OpenRouter** (URGENT)
   - Aller sur : https://openrouter.ai/settings/credits
   - Ajouter minimum $5 USD
   - Vérifier que la clé API est correcte

### 2. **Vérifier les Variables d'Environnement**
   ```bash
   # Dans Convex Dashboard
   OPENROUTER_API_KEY=sk-or-v1-... ✓
   GEMINI_API_KEY=...              (optionnel)
   ```

### 3. **Tester à Nouveau**
   ```bash
   # Relancer Convex dev
   npx convex dev
   
   # Créer une note de test dans l'UI
   # Vérifier les logs Convex
   ```

### 4. **Surveiller les Logs**
   Chercher ces messages de succès :
   ```
   ✅ Image generated via OpenRouter
   ✅ Image ajoutée à la note
   ```

---

## 💰 **ESTIMATION DES COÛTS**

Avec Gemini 2.5 Flash Image via OpenRouter :
- **Prix** : $0.00003 par image
- **$5 USD** = ~166,667 images
- **Largement suffisant** pour le développement et tests

---

## 🔧 **ALTERNATIVES SI VOUS NE VOULEZ PAS PAYER**

### Option 1 : API Gemini Directe (Gratuit)
- **Avantage** : Gratuit avec quotas généreux
- **Inconvénient** : Moins flexible qu'OpenRouter
- **Implémentation** : Nécessite modifications du code

### Option 2 : Désactiver la Génération d'Images
Temporairement, jusqu'à ce que vous ajoutiez des crédits :

```typescript
// Dans NotesApp.tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ...
  const noteId = await createNote({
    autoGenerateImage: false,  // ← Désactiver
  });
};
```

### Option 3 : Mock Images pour le Développement
Créer des images placeholder locales sans appel API :

```typescript
// Dans imageGenerationOpenRouter.ts
if (process.env.NODE_ENV === 'development') {
  return generateLocalPlaceholder(prompt);
}
```

---

## ✅ **CHECKLIST DE VÉRIFICATION**

- [x] Erreur Buffer corrigée
- [x] Erreur testOpenRouterIntegration corrigée
- [ ] **Crédits OpenRouter ajoutés** ⚠️ **ACTION REQUISE**
- [ ] Test de génération d'image réussi
- [ ] Image affichée dans l'UI

---

## 📚 **RESSOURCES UTILES**

- **OpenRouter Dashboard** : https://openrouter.ai/
- **OpenRouter Credits** : https://openrouter.ai/settings/credits
- **OpenRouter API Keys** : https://openrouter.ai/settings/keys
- **Gemini API (Direct)** : https://ai.google.dev/gemini-api/docs/api-key
- **Convex Error Handling** : https://docs.convex.dev/functions/error-handling

---

## 🎉 **CONCLUSION**

**Principales corrections appliquées** :
1. ✅ Erreur `Buffer is not defined` → **CORRIGÉE**
2. ✅ Erreur syntaxe `testOpenRouterIntegration.ts` → **CORRIGÉE**
3. ⚠️ Crédits OpenRouter insuffisants → **ACTION REQUISE**

**Une fois les crédits ajoutés, tout devrait fonctionner !** 🚀

Le code est maintenant compatible avec l'environnement Convex et prêt à générer des images dès que vous aurez des crédits OpenRouter.
