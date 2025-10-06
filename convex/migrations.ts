import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

// Initialiser le système de migrations
export const migrations = new Migrations<DataModel>(components.migrations, {
  internalMutation,
});

// Runner générique pour toutes les migrations futures
export const run = migrations.runner();

// ⚠️ MIGRATION OPTIONNELLE ⚠️ 
// Cette migration n'est nécessaire QUE si vous avez des notes existantes en production
// Puisque vous avez supprimé les anciennes notes, cette migration peut être ignorée
export const addImageFieldsToNotes = migrations.define({
  table: "notes",
  migrateOne: async (ctx, doc) => {
    // Vérifier si les champs image existent déjà (pour les nouvelles notes)
    const updates: any = {};
    let needsUpdate = false;

    // Ces champs sont maintenant requis par le nouveau schéma
    if (!doc.imageIds) {
      updates.imageIds = [];
      needsUpdate = true;
    }

    if (!doc.imageUrls) {
      updates.imageUrls = [];
      needsUpdate = true;
    }

    if (doc.hasImages === undefined) {
      updates.hasImages = false;
      needsUpdate = true;
    }

    if (!doc.defaultPrompt) {
      updates.defaultPrompt = "Génère une image créative basée sur cette note";
      needsUpdate = true;
    }

    // Retourner les mises à jour si nécessaire
    if (needsUpdate) {
      console.log(`✅ Mise à jour de la note ${doc._id}:`, updates);
      return updates;
    }
  },
});

// 🚀 DÉPLOIEMENT RECOMMANDÉ 🚀
// Puisque vos anciennes notes sont supprimées, vous pouvez simplement :
// 1. npx convex deploy (le nouveau schéma s'applique automatiquement)
// 2. Les nouvelles notes auront automatiquement les bons champs grace au schéma
export const verifyDeployment = internalMutation({
  args: {},
  handler: async (ctx) => {
    const noteCount = await ctx.db.query("notes").collect();
    console.log(`📊 Nombre total de notes en production: ${noteCount.length}`);
    
    if (noteCount.length === 0) {
      console.log("✅ Aucune note existante - déploiement direct possible sans migration");
      return { status: "ready_for_direct_deployment", noteCount: 0 };
    } else {
      console.log("⚠️ Notes existantes détectées - migration recommandée");
      return { status: "migration_recommended", noteCount: noteCount.length };
    }
  },
});