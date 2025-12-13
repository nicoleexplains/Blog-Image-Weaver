
import React from 'react';
import type { GeneratedImage } from '../types';

interface ImageCardProps {
  image: GeneratedImage;
  onPromptChange: (newPrompt: string) => void;
  onGenerate: () => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onPromptChange, onGenerate }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    const fileName = image.prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50) || 'generated-image';
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col rounded-lg bg-gray-800 shadow-lg overflow-hidden transition-transform duration-300 ease-in-out ${image.status === 'success' ? 'hover:scale-105' : ''}`}>
      <div className="group relative h-64 w-full">
        {(() => {
          switch (image.status) {
            case 'pending':
              return (
                <div className="flex h-full w-full flex-col bg-gray-700/50 p-4 justify-between">
                  <div>
                    <label htmlFor={`prompt-${image.prompt.slice(0, 10)}`} className="block text-sm font-medium text-gray-300 mb-2">
                      Edit Prompt
                    </label>
                    <textarea
                      id={`prompt-${image.prompt.slice(0, 10)}`}
                      value={image.prompt}
                      onChange={(e) => onPromptChange(e.target.value)}
                      rows={5}
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-200 placeholder-gray-500 text-sm"
                    />
                  </div>
                  <button
                    onClick={onGenerate}
                    className="w-full flex items-center justify-center mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                    </svg>
                    Generate
                  </button>
                </div>
              );
            case 'error':
              return (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-700 p-4 border-2 border-dashed border-red-500/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-3 text-sm text-center text-red-400 font-medium px-2">{image.error || "Image generation failed."}</p>
                  <p className="mt-2 text-xs text-center text-gray-500 italic max-w-full truncate px-4">
                    "{image.prompt}"
                  </p>
                </div>
              );
            case 'loading':
              return (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-700 animate-pulse p-4">
                  <svg className="h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-3 text-sm text-center text-gray-400">Generating image for:</p>
                  <p className="mt-1 text-xs text-center text-gray-500 italic max-w-full truncate">
                    "{image.prompt}"
                  </p>
                </div>
              );
            case 'cancelled':
              return (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-700/50 p-4 border-2 border-dashed border-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="mt-3 text-sm text-center text-gray-400">Cancelled</p>
                   <p className="mt-1 text-xs text-center text-gray-500 italic max-w-full truncate">
                    "{image.prompt}"
                  </p>
                </div>
              );
            case 'success':
              return (
                <>
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-75"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="text-sm font-medium text-white">
                      {image.prompt}
                    </p>
                  </div>
                </>
              );
            default:
              return null;
          }
        })()}
      </div>
      {(image.status === 'success' || image.status === 'error') && (
        <div className="p-4 bg-gray-800">
          {image.status === 'success' ? (
            <button
              onClick={handleDownload}
              aria-label={`Download image: ${image.prompt}`}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download
            </button>
          ) : (
            <button
              onClick={onGenerate}
              aria-label={`Retry generating image: ${image.prompt}`}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m-5 2a9 9 0 0014.95 4.05m-4.05-14.95A9 9 0 005.05 13" />
              </svg>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};
