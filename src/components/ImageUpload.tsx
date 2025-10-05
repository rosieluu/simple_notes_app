import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageUploaded: (imageId: Id<"_storage"> | null) => void;
  currentImageUrl?: string;
}

export function ImageUpload({ onImageUploaded, currentImageUrl }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  
  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Créer une preview locale
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // Générer l'URL d'upload
      const uploadUrl = await generateUploadUrl();
      
      // Upload le fichier
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await response.json();
      
      // Notifier le parent
      onImageUploaded(storageId as Id<"_storage">);
      toast.success('Image uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    onImageUploaded(null); // Signaler la suppression
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          className="border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
          onClick={() => document.getElementById('image-upload')?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : previewUrl ? 'Change Image' : 'Add Image'}
        </Button>
        
        {previewUrl && (
          <Button
            type="button"
            className="border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            onClick={removeImage}
            disabled={isUploading}
          >
            Remove Image
          </Button>
        )}
      </div>

      <input
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200"
          />
        </div>
      )}
    </div>
  );
}