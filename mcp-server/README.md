# 📝 Simple Notes MCP Server

## 🎯 Description
Serveur MCP (Model Context Protocol) pour l'application Simple Notes avec backend Convex.
Permet aux assistants IA d'interagir directement avec vos notes via des outils standardisés.

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- Backend Convex déployé
- URL Convex configurée

### Installation et lancement
```bash
cd mcp-server
npm install
npm run build
npm start
```

## 🛠️ Outils disponibles

### 1. `list_notes`
Liste toutes les notes d'un utilisateur
```json
{
  "name": "list_notes",
  "arguments": {
    "userId": "user_id_here"
  }
}
```

### 2. `get_note` 
Récupère une note spécifique par son ID
```json
{
  "name": "get_note", 
  "arguments": {
    "noteId": "note_id_here"
  }
}
```

### 3. `create_note`
Crée une nouvelle note
```json
{
  "name": "create_note",
  "arguments": {
    "userId": "user_id_here",
    "title": "Titre de la note",
    "content": "Contenu de la note",
    "tags": ["tag1", "tag2"]
  }
}
```

## 🔧 Configuration

### Variables d'environnement
```env
CONVEX_URL=https://your-deployment.convex.cloud
```

### Configuration VS Code
Ajoutez dans votre configuration MCP :
```json
{
  "mcpServers": {
    "simple-notes": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "CONVEX_URL": "https://valiant-marlin-732.convex.cloud"
      }
    }
  }
}
```

## 📊 État du serveur
- ✅ Serveur MCP configuré
- ✅ Connexion Convex établie
- ✅ 3 outils enregistrés
- ✅ Transport Stdio actif

## 🔍 Test manuel

Pour tester les outils, vous pouvez utiliser n'importe quel client MCP compatible ou l'intégration VS Code.

Exemple de test avec un userId valide :
1. `list_notes` avec votre userId
2. `create_note` pour créer une note de test
3. `get_note` avec l'ID de la note créée

## 🐛 Troubleshooting

### Erreur "CONVEX_URL not found"
- Vérifiez que le fichier `.env` existe
- Confirmez que l'URL Convex est correcte

### Erreur de connexion
- Vérifiez que votre backend Convex est déployé
- Testez l'URL Convex dans votre application web

### Erreur de compilation
```bash
npm run build
```

## 📈 Prochaines étapes possibles

1. **Outils avancés** :
   - `search_notes` : Recherche dans les notes
   - `update_note` : Modifier une note
   - `delete_note` : Supprimer une note
   - `add_tags` : Gérer les tags

2. **Fonctionnalités** :
   - Support des images
   - Génération automatique de contenu
   - Export/Import de notes

3. **Transport alternatifs** :
   - HTTP transport pour API REST
   - WebSocket pour temps réel