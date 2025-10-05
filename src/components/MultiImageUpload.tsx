import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface MultiImageUploadProps {
  onImagesUploaded: (imageIds: Id<"_storage">[]) => void;
  currentImageUrls?: string[];
  maxImages?: number;
}

export function MultiImageUpload({ 
  onImagesUploaded, 
  currentImageUrls = [], 
  maxImages = 3 
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>(currentImageUrls);
  const [uploadedImageIds, setUploadedImageIds] = useState<Id<"_storage">[]>([]);
  
  const generateUploadUrl = useMutation(api.notes.generateUploadUrl);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Vérifier que le nombre total ne dépasse pas la limite
    const totalImages = previewUrls.length + files.length;
    if (totalImages > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Vérifier les types et tailles
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select only image files');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Each image must be less than 5MB');
        return;
      }
    }

    setIsUploading(true);

    try {
      const newImageIds: Id<"_storage">[] = [];
      const newPreviewUrls: string[] = [];

      for (const file of files) {
        // Créer une preview locale
        const localUrl = URL.createObjectURL(file);
        newPreviewUrls.push(localUrl);

        // Générer l'URL d'upload
        const uploadUrl = await generateUploadUrl();
        
        // Upload le fichier
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error('Upload failed for ' + file.name);
        }

        const { storageId } = await response.json();
        newImageIds.push(storageId as Id<"_storage">);
      }

      // Mettre à jour les états
      const updatedPreviewUrls = [...previewUrls, ...newPreviewUrls];
      const updatedImageIds = [...uploadedImageIds, ...newImageIds];
      
      setPreviewUrls(updatedPreviewUrls);
      setUploadedImageIds(updatedImageIds);
      
      // Notifier le parent
      onImagesUploaded(updatedImageIds);
      toast.success(`${files.length} image(s) uploaded successfully!`);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    const newImageIds = uploadedImageIds.filter((_, i) => i !== index);
    
    setPreviewUrls(newPreviewUrls);
    setUploadedImageIds(newImageIds);
    onImagesUploaded(newImageIds);
  };

  const removeAllImages = () => {
    setPreviewUrls([]);
    setUploadedImageIds([]);
    onImagesUploaded([]);
  };

  const canAddMore = previewUrls.length < maxImages;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {canAddMore && (
          <Button
            type="button"
            className="border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            onClick={() => document.getElementById('multi-image-upload')?.click()}
            disabled={isUploading}
          >
            {isUploading 
              ? 'Uploading...' 
              : previewUrls.length === 0 
                ? 'Add Images' 
                : `Add More (${previewUrls.length}/${maxImages})`
            }
          </Button>
        )}
        
        {previewUrls.length > 0 && (
          <Button
            type="button"
            className="border border-red-300 bg-white text-red-700 shadow-sm hover:bg-red-50"
            onClick={removeAllImages}
            disabled={isUploading}
          >
            Remove All
          </Button>
        )}
      </div>

      <input
        id="multi-image-upload"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {previewUrls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isUploading}
              >
                ×
              </button>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {index + 1}/{maxImages}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrls.length === 0 && (
        <div className="text-sm text-gray-500">
          No images selected. You can add up to {maxImages} images.
        </div>
      )}
    </div>
  );
}