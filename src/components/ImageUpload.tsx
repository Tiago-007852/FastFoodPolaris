import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (base64: string) => void;
  currentImage?: string;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload, currentImage, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('A imagem é muito grande. Por favor, escolha uma imagem com menos de 1MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</label>}
      <div className="flex items-center space-x-4">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl p-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <div className="flex flex-col items-center space-y-2">
            <Upload size={24} className="text-zinc-400 group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium text-zinc-500 group-hover:text-primary transition-colors">
              Clique para fazer upload
            </span>
          </div>
        </div>

        {currentImage && currentImage !== '' && (
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-black/5 group">
            <img src={currentImage} alt="Preview" className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={() => onUpload('')}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
