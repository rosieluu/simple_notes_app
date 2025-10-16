#!/bin/bash

# Test interactif des outils MCP
echo "🧪 Test des Outils MCP Simple Notes"
echo "=================================="
echo ""

# Démarrer le serveur en arrière-plan
echo "1️⃣ Démarrage du serveur MCP..."
cd /home/hongluu/dataupskill/aiappcreator/coding/simple_notes_app/mcp-server

# Lancer le serveur et capturer son PID
node dist/index.js &
SERVER_PID=$!
echo "📋 Serveur démarré avec PID: $SERVER_PID"

# Attendre que le serveur soit prêt
sleep 2

echo ""
echo "2️⃣ Test de l'outil create_note..."

# Créer une requête pour créer une note
CREATE_REQUEST='{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_note",
    "arguments": {
      "userId": "test-user-mcp-demo",
      "title": "🚀 Ma première note via MCP",
      "content": "Cette note a été créée via le serveur MCP ! Cela prouve que l'\''intégration fonctionne parfaitement.",
      "tags": ["mcp", "test", "demo", "success"]
    }
  }
}'

echo "📤 Envoi de la requête create_note..."
echo "$CREATE_REQUEST"
echo ""

# Envoyer la requête au serveur
echo "$CREATE_REQUEST" | nc localhost 3000 2>/dev/null || {
  # Si nc ne fonctionne pas, utiliser une autre méthode
  echo "$CREATE_REQUEST" > /tmp/mcp_request.json
  timeout 5s bash -c "echo '$CREATE_REQUEST' | node dist/index.js" 2>&1
}

echo ""
echo "3️⃣ Test de l'outil list_notes..."

LIST_REQUEST='{
  "jsonrpc": "2.0", 
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_notes",
    "arguments": {
      "userId": "test-user-mcp-demo"
    }
  }
}'

echo "📤 Envoi de la requête list_notes..."
echo "$LIST_REQUEST"

# Nettoyer - arrêter le serveur
echo ""
echo "🛑 Arrêt du serveur..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Test terminé !"