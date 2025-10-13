import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignOutButton } from "./SignOutButton";
import { Button } from "./components/ui/button";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { MultiImageUpload } from "./components/MultiImageUpload";

export function NotesApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Id<"notes"> | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploadedImageIds, setUploadedImageIds] = useState<Id<"_storage">[]>([]);
  
  // États pour la génération d'images avec OpenRouter
  const [useOpenRouter, setUseOpenRouter] = useState(true); // Par défaut: utiliser OpenRouter
  const [imageStyle, setImageStyle] = useState("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [useContext7, setUseContext7] = useState(true);

  const notes = useQuery(api.notes.search, { 
    query: searchQuery, 
    tag: selectedTag || undefined 
  }) || [];
  const allTags = useQuery(api.notes.getAllTags) || [];
  const currentUser = useQuery(api.notes.getCurrentUser); // Ajouter les infos utilisateur
  
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const deleteNote = useMutation(api.notes.remove);
  const triggerImageGenerationOpenRouter = useMutation(api.notes.triggerImageGenerationOpenRouter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Allow empty title and content now

    try {
      if (editingNote) {
        await updateNote({
          id: editingNote,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          tags,
          imageIds: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
        });
        toast.success("Note updated!");
      } else {
        // Créer la note d'abord
        const noteId = await createNote({
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          tags,
          imageIds: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
          autoGenerateImage: true, // Activer la génération automatique
        });
        
        toast.success("Note created! 🎨 Generating AI image...");
        
        // Déclencher la génération d'image avec la nouvelle API OpenRouter
        try {
          if (useOpenRouter) {
            await triggerImageGenerationOpenRouter({
              noteId,
              style: imageStyle,
              aspectRatio: aspectRatio,
              useContext7: useContext7,
            });
            toast.success(`🎨 OpenRouter + Gemini 2.5 Flash generation started! (${useContext7 ? 'avec Context7' : 'sans Context7'})`);
          } else {
            // Fallback vers OpenRouter avec paramètres de base
            await triggerImageGenerationOpenRouter({
              noteId,
              style: imageStyle,
              aspectRatio: aspectRatio,
              useContext7: false,
            });
            toast.success("🎨 AI image generation started (basic mode)!");
          }
        } catch (genError) {
          console.error("Image generation failed:", genError);
          toast.error("Note created but image generation failed");
        }
      }
      resetForm();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleEdit = (note: any) => {
    setEditingNote(note._id);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setUploadedImageIds(note.imageIds || []);
    setIsCreating(true);
  };

  const handleDelete = async (id: Id<"notes">) => {
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteNote({ id });
        toast.success("Note deleted!");
      } catch (error) {
        toast.error("Failed to delete note");
      }
    }
  };

  // Nouvelle fonction: Régénérer une image pour une note existante
  const handleRegenerateImage = async (noteId: Id<"notes">) => {
    try {
      if (useOpenRouter) {
        await triggerImageGenerationOpenRouter({
          noteId,
          style: imageStyle,
          aspectRatio: aspectRatio,
          useContext7: useContext7,
        });
        toast.success(`🎨 Régénération OpenRouter lancée! (${useContext7 ? 'avec Context7' : 'sans Context7'})`);
      } else {
        await triggerImageGenerationOpenRouter({
          noteId,
          style: imageStyle,
          aspectRatio: aspectRatio,
          useContext7: false,
        });
        toast.success("🎨 Régénération lancée (basic mode)!");
      }
    } catch (error) {
      console.error("Regeneration failed:", error);
      toast.error("Failed to regenerate image");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setTagInput("");
    setUploadedImageIds([]);
    setIsCreating(false);
    setEditingNote(null);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <SignOutButton />
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag("")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedTag === "" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag: string) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Note Button */}
      {!isCreating && (
        <Button
          onClick={() => setIsCreating(true)}
          className="w-full mb-6 border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg 
            className="w-4 h-4 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
          ✨ Create & Generate Photo
        </Button>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (Optional)
            </label>
            <textarea
              placeholder="Write your note here... Leave empty to use default real estate prompt."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Images (Optional) - Max 3
            </label>
            <MultiImageUpload
              onImagesUploaded={setUploadedImageIds}
              currentImageUrls={
                uploadedImageIds.length > 0 && editingNote 
                  ? notes.find((n: any) => n._id === editingNote)?.imageUrls || []
                  : []
              }
              maxImages={3}
            />
          </div>

          {/* Tags Input */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Add
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Configuration de génération d'images OpenRouter */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">🎨 Configuration génération d'images</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* API Selection */}
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">API</label>
                <select
                  value={useOpenRouter ? "openrouter" : "legacy"}
                  onChange={(e) => setUseOpenRouter(e.target.value === "openrouter")}
                  className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="openrouter">🚀 OpenRouter + Gemini 2.5 Flash</option>
                  <option value="legacy">📱 Legacy API</option>
                </select>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Style</label>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="photorealistic">📸 Photorealistic</option>
                  <option value="artistic">🎨 Artistic</option>
                  <option value="minimalist">⚪ Minimalist</option>
                  <option value="cartoon">🎪 Cartoon</option>
                </select>
              </div>
            </div>

            {useOpenRouter && (
              <div className="grid grid-cols-2 gap-4">
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="1:1">⬜ Carré (1:1)</option>
                    <option value="16:9">📺 Paysage (16:9)</option>
                    <option value="9:16">📱 Portrait (9:16)</option>
                    <option value="3:4">📷 Photo (3:4)</option>
                    <option value="4:3">🖥️ Écran (4:3)</option>
                  </select>
                </div>

                {/* Context7 Toggle */}
                <div className="flex items-center">
                  <label className="flex items-center text-xs font-medium text-blue-700">
                    <input
                      type="checkbox"
                      checked={useContext7}
                      onChange={(e) => setUseContext7(e.target.checked)}
                      className="mr-2"
                    />
                    🔍 Utiliser Context7
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              {editingNote ? "Update" : "🎨 Create & Generate Photo"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || selectedTag ? "No notes found" : "No notes yet. Create your first note!"}
          </div>
        ) : (
          notes.map((note: any) => (
            <div key={note._id} className="p-6 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow bg-white">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">{note.title}</h3>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleRegenerateImage(note._id)}
                    className="text-green-500 hover:text-green-700 text-sm font-medium"
                    title="Régénérer image avec OpenRouter"
                  >
                    🎨 Regen
                  </button>
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{note.content}</p>
              
              {/* Display attached images if exist */}
              {note.imageUrls && note.imageUrls.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {note.imageUrls.map((imageUrl: string, index: number) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Note attachment ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {note.imageUrls.length} image(s) attached
                  </div>
                </div>
              )}
              
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {note.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm cursor-pointer hover:bg-gray-200"
                      onClick={() => setSelectedTag(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Affichage du statut de génération et du prompt */}
              {note.generatedPrompt && (
                <div className="mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                  <div className="text-xs font-medium text-purple-700 mb-1">
                    🤖 Prompt de génération:
                  </div>
                  <div className="text-xs text-purple-600 italic">
                    {note.generatedPrompt}
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                {new Date(note._creationTime).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
