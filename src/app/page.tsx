"use client";
import React, { useState, ChangeEvent } from 'react';
import { Upload, FileText, CheckCircle, Image as ImageIcon, Trash2 } from 'lucide-react';

interface ImageObject {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url: string;
}

export default function Page() {
  const [images, setImages] = useState<ImageObject[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (images.length === 0) return;
    setUploading(true);
    const updatedImages = [...images];
    
    for (let i = 0; i < updatedImages.length; i++) {
      if (updatedImages[i].status === 'completed') continue;
      
      const formData = new FormData();
      formData.append('file', updatedImages[i].file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.secure_url) {
          updatedImages[i].url = data.secure_url;
          updatedImages[i].status = 'completed';
        } else {
          updatedImages[i].status = 'error';
        }
        setImages([...updatedImages]);
      } catch (err) {
        updatedImages[i].status = 'error';
        setImages([...updatedImages]);
      }
    }
    setUploading(false);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newImages: ImageObject[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file as Blob),
      status: 'pending',
      url: ''
    }));
    setImages([...images, ...newImages]);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 py-4 px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Upload className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Alibaba <span className="text-orange-500">Bulk Photo Pro</span></h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon size={20} className="text-orange-500" /> Cargar Imágenes
              </h2>
              <label className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-orange-50 hover:border-orange-300 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic</span> o arrastra</p>
                  <p className="text-xs text-gray-400">JPG, PNG o WebP</p>
                </div>
                <input type="file" className="hidden" multiple onChange={onFileChange} />
              </label>

              <div className="mt-6">
                <button 
                  onClick={handleUpload}
                  disabled={uploading || images.length === 0}
                  className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${uploading || images.length === 0 ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600 active:scale-95'}`}
                >
                  {uploading ? 'Subiendo...' : 'Iniciar Carga'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText size={20} className="text-orange-500" /> Lista de Archivos ({images.length})
                </h2>
                <button onClick={() => setImages([])} className="text-sm text-red-500 hover:underline flex items-center gap-1">
                  <Trash2 size={14} /> Limpiar todo
                </button>
              </div>

              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
                  <ImageIcon size={48} className="mb-2 opacity-20" />
                  <p>No hay imágenes seleccionadas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50 group hover:border-orange-200 transition-all">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                        <img src={img.preview} className="w-full h-full object-cover" alt="preview" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium truncate text-gray-700">{img.file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {img.status === 'completed' ? (
                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                              <CheckCircle size={10} /> LISTO
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                              {img.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
