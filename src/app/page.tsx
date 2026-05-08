'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, Download, Trash2, CheckCircle, AlertCircle, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageFile {
  id: string;
  file: File;
  name: string;
  url?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function AlibabaImagePreparer() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: ImageFile[] = acceptedFiles.map(file => {
      return {
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        status: 'pending'
      };
    });
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    }
  });

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const uploadToCloudinary = async (image: ImageFile) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Configuración de Cloudinary faltante en .env.local');
    }

    const formData = new FormData();
    formData.append('file', image.file);
    formData.append('upload_preset', uploadPreset);
    
    // Optional: Use filename as public_id (sanitized)
    const publicId = image.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
    formData.append('public_id', publicId);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error en la carga');
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleBulkUpload = async () => {
    setIsUploading(true);
    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      if (updatedImages[i].status === 'success') continue;

      updatedImages[i].status = 'uploading';
      setImages([...updatedImages]);

      try {
        const url = await uploadToCloudinary(updatedImages[i]);
        updatedImages[i].url = url;
        updatedImages[i].status = 'success';
      } catch (error: any) {
        updatedImages[i].status = 'error';
        updatedImages[i].error = error.message;
      }
      setImages([...updatedImages]);
    }
    setIsUploading(false);
  };

  const downloadExcel = () => {
    const data = images
      .filter(img => img.status === 'success')
      .map(img => ({
        'Producto': img.name,
        'URL de Imagen': img.url
      }));

    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alibaba Products");
    
    // Auto-size columns
    worksheet['!cols'] = [
      { wch: 40 }, // Producto
      { wch: 60 }  // URL de Imagen
    ];

    XLSX.writeFile(workbook, `alibaba_fotos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Preparador de Fotos para Alibaba</h1>
            <p className="text-slate-500 mt-1">Sube tus imágenes a Cloudinary y genera el Excel para carga masiva.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Cloudinary: {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
          </div>
        </header>

        {/* Dropzone Area */}
        <div 
          {...getRootProps()} 
          className={cn(
            "relative overflow-hidden border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer",
            isDragActive 
              ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-50" 
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center relative z-10">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-xl font-semibold text-slate-900">
              {isDragActive ? "Suelta las imágenes aquí" : "Arrastra y suelta tus imágenes"}
            </p>
            <p className="text-slate-500 mt-2 max-w-sm mx-auto">
              Sube múltiples archivos a la vez. Compatible con JPG, PNG y WebP.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        {images.length > 0 && (
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-slate-100 rounded-full text-sm font-semibold text-slate-600">
                {images.length} {images.length === 1 ? 'imagen' : 'imágenes'}
              </div>
              {images.some(img => img.status === 'success') && (
                <div className="px-3 py-1 bg-green-100 rounded-full text-sm font-semibold text-green-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {images.filter(img => img.status === 'success').length} listas
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setImages([])}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                disabled={isUploading}
              >
                <Trash2 className="w-4 h-4" /> Limpiar
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={isUploading || images.every(img => img.status === 'success')}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Iniciar Carga
                  </>
                )}
              </button>
              <button
                onClick={downloadExcel}
                disabled={isUploading || !images.some(img => img.status === 'success')}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                <Download className="w-4 h-4" /> Descargar Excel
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        {images.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vista Previa</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Producto</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {images.map((img) => (
                    <tr key={img.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                          {img.file ? (
                            <img 
                              src={URL.createObjectURL(img.file)} 
                              alt={img.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900 truncate max-w-[240px]">
                          {img.name}
                        </div>
                        {img.url && (
                          <div className="text-xs text-blue-600 font-medium truncate max-w-[320px] mt-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {img.url}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {img.status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            Pendiente
                          </span>
                        )}
                        {img.status === 'uploading' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 animate-pulse">
                            Subiendo...
                          </span>
                        )}
                        {img.status === 'success' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Completado
                          </span>
                        )}
                        {img.status === 'error' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700" title={img.error}>
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {img.status === 'success' && img.url && (
                            <>
                              <button
                                onClick={() => copyToClipboard(img.url!)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Copiar URL"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <a
                                href={img.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Ver Imagen"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => removeImage(img.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            disabled={isUploading}
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <footer className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest">
            Alibaba Bulk Upload Optimized
          </div>
        </footer>
      </div>
    </div>
  );
}
