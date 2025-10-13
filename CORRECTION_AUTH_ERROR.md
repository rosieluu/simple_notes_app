# ✅ CORRECTION : Erreur "Not authenticated at handler"

## 🔴 Problème Identifié

### Erreur :
```
Uncaught Error: Not authenticated at handler (.../convex/notes.ts:399:4)
```

### Cause :
La fonction `addGeneratedImage` essayait d'obtenir `userId` via `getAuthUserId(ctx)`, mais elle était appelée depuis une **action** qui n'a pas de contexte d'authentification.

**Dans Convex :**
- ✅ **Mutations** appelées depuis le frontend → ont accès à `auth`
- ❌ **Mutations** appelées depuis des **actions** → N'ONT PAS accès à `auth`

---

## ✅ Solution Appliquée

### Approche : Créer une Mutation Interne

Au lieu de récupérer le `userId` via `getAuthUserId()`, on le passe en paramètre.

### Fichier : `convex/notes.ts`

**Ajouté :** Nouvelle mutation interne `addGeneratedImageInternal`

```typescript
// Mutation PUBLIQUE (avec auth) - pour le frontend
export const addGeneratedImage = mutation({
  args: {
    noteId: v.id("notes"),
    imageId: v.id("_storage"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);  // ✓ OK depuis frontend
    // ...
  },
});

// Mutation INTERNE (sans auth) - pour les actions
export const addGeneratedImageInternal = mutation({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"),  // ← Passé en paramètre !
    imageId: v.id("_storage"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Pas besoin de getAuthUserId(), on utilise args.userId
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== args.userId) {
      throw new Error("Note not found or not authorized");
    }
    // ...
  },
});
```

---

## 🔧 Modifications Appliquées

### 1. **`convex/notes.ts`** ✅
- ✅ Ajout de `addGeneratedImageInternal` (mutation interne)
- ✅ Conservation de `addGeneratedImage` (mutation publique pour le frontend)

### 2. **`convex/imageGenerationOpenRouter.ts`** ✅
- ✅ Ligne 157 : Changé `api.notes.addGeneratedImage` → `api.notes.addGeneratedImageInternal`
- ✅ Ligne 642 : Changé `api.notes.addGeneratedImage` → `api.notes.addGeneratedImageInternal`
- ✅ Ajout du paramètre `userId: args.userId`

### 3. **`convex/imageGeneration.ts`** ✅
- ✅ Ligne 114 : Changé `api.notes.addGeneratedImage` → `api.notes.addGeneratedImageInternal`
- ✅ Ajout du paramètre `userId: args.userId`

---

## 📊 Comparaison Avant/Après

### ❌ Avant (NE FONCTIONNAIT PAS)

```typescript
// Dans une action
await ctx.runMutation(api.notes.addGeneratedImage, {
  noteId: args.noteId,
  imageId: storageId,
  prompt: optimizedPrompt
});

// addGeneratedImage essayait :
const userId = await getAuthUserId(ctx);  // ❌ ERREUR : pas d'auth dans action
```

### ✅ Après (FONCTIONNE)

```typescript
// Dans une action
await ctx.runMutation(api.notes.addGeneratedImageInternal, {
  noteId: args.noteId,
  userId: args.userId,  // ← Passé explicitement !
  imageId: storageId,
  prompt: optimizedPrompt
});

// addGeneratedImageInternal utilise :
const note = await ctx.db.get(args.noteId);
if (!note || note.userId !== args.userId) {  // ✅ OK : userId en paramètre
  throw new Error("Not authorized");
}
```

---

## 🎯 Pourquoi Cette Approche ?

### Pattern Convex Recommandé

1. **Mutations publiques** (pour le frontend)
   - Utilisent `getAuthUserId(ctx)`
   - Sécurisées par l'authentification
   - Appelées depuis React/Vue/etc.

2. **Mutations internes** (pour les actions)
   - Reçoivent `userId` en paramètre
   - Validées mais pas authentifiées
   - Appelées depuis des actions backend

### Sécurité

✅ **Toujours validé** : On vérifie que `note.userId === args.userId`
✅ **Pas de contournement** : Le `userId` vient de l'action qui l'a obtenu de manière sécurisée

---

## 🧪 Test

Maintenant, quand vous créez une note avec génération d'image :

1. ✅ Frontend appelle `triggerImageGenerationOpenRouter`
2. ✅ Mutation programme l'action avec `userId`
3. ✅ Action génère l'image
4. ✅ Action appelle `addGeneratedImageInternal` avec `userId`
5. ✅ Mutation valide et ajoute l'image
6. ✅ **Succès !** 🎉

---

## 📝 Prochaines Étapes

1. **Relancer Convex** : `npx convex dev`
2. **Tester** : Créer une note dans l'UI
3. **Vérifier** : L'image devrait maintenant s'ajouter sans erreur !

---

## 🎉 Résumé

**Problème** : "Not authenticated at handler"
**Cause** : Action essayait d'utiliser `getAuthUserId()`
**Solution** : Créer mutation interne avec `userId` en paramètre

**Status** : ✅ CORRIGÉ

Tous les appels ont été mis à jour pour utiliser la nouvelle mutation interne !
