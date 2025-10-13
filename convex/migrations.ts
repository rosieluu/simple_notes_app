import { Migrations } from "@convex-dev/migrations";
import { DataModel } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

// Temporaire : désactiver les migrations jusqu'à ce que components soit disponible
// import { components } from "./_generated/api.js";

// Temporaire : désactiver les migrations jusqu'à configuration complète
// export const migrations = new Migrations<DataModel>(components.migrations, {
//   internalMutation,
// });

// Temporaire : désactiver jusqu'à configuration complète
// export const run = migrations.runner();
// export const addImageFieldsToNotes = migrations.define({
//   table: "notes",
//   migrateOne: async (ctx, doc) => {
//     // Migration logic here
//   },
// });

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