import React from 'react';
import type { GeneratedImage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  RotateCcw, 
  AlertCircle, 
  Loader2, 
  Edit3, 
  FileText,
  CheckCircle2,
  XCircle,
  Wand2
} from 'lucide-react';

interface ImageCardProps {
  image: GeneratedImage;
  onPromptChange: (newPrompt: string) => void;
  onFileNameChange: (newFileName: string) => void;
  onGenerate: () => void;
}

const MAX_RETRIES = 3;

export const ImageCard: React.FC<ImageCardProps> = ({ image, onPromptChange, onFileNameChange, onGenerate }) => {
  const isPermanentlyFailed = image.status === 'error' && image.retryCount >= MAX_RETRIES;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    const fileName = image.fileName || 'generated-image';
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      layout
      className={`group flex flex-col rounded-2xl bg-gray-900 border border-gray-800 shadow-xl overflow-hidden transition-all duration-500 hover:border-blue-500/50 hover:shadow-blue-500/10`}
    >
      <div className="relative w-full overflow-hidden bg-gray-950 transition-all duration-500">
        <AnimatePresence mode="wait">
          {image.status === 'pending' && (
            <motion.div 
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full p-6 flex flex-col justify-between bg-gray-900/50 min-h-[450px]"
            >
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    <Edit3 className="w-3 h-3" />
                    Refine Prompt
                  </label>
                  <textarea
                    value={image.prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    rows={6}
                    className="w-full p-3 bg-gray-950 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm text-gray-300 placeholder-gray-700 resize-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    <FileText className="w-3 h-3" />
                    Asset Name
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={image.fileName}
                      onChange={(e) => onFileNameChange(e.target.value)}
                      className="flex-1 p-2.5 bg-gray-950 border border-gray-800 rounded-l-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm text-gray-300"
                    />
                    <span className="bg-gray-800 px-3 py-2.5 border border-l-0 border-gray-800 rounded-r-xl text-xs text-gray-500 font-mono">.png</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onGenerate}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Generate Image
              </button>
            </motion.div>
          )}

          {image.status === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col items-center justify-center bg-gray-900 aspect-video"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
              </div>
              <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                Synthesizing...
              </p>
            </motion.div>
          )}

          {image.status === 'error' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-red-500/5 aspect-video"
            >
              <AlertCircle className={`w-10 h-10 mb-4 ${isPermanentlyFailed ? 'text-gray-600' : 'text-red-500'}`} />
              <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isPermanentlyFailed ? 'text-gray-500' : 'text-red-400'}`}>
                {isPermanentlyFailed ? "Process Terminated" : "Synthesis Failed"}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                {image.error || "An unexpected error occurred during generation."}
              </p>
              {!isPermanentlyFailed && (
                <div className="mt-4 text-[10px] font-mono text-gray-600 uppercase">
                  Attempt {image.retryCount} of {MAX_RETRIES}
                </div>
              )}
            </motion.div>
          )}

          {image.status === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full w-full group aspect-video"
            >
              <img
                src={image.imageUrl}
                alt={image.caption || image.prompt}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">
                  <CheckCircle2 className="w-3 h-3" />
                  Generated Caption
                </div>
                <p className="text-sm text-white leading-relaxed line-clamp-3 font-medium">
                  {image.caption || image.prompt}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(image.status === 'success' || image.status === 'error') && (
        <div className="p-5 bg-gray-900/50 border-t border-gray-800/50">
          {image.status === 'success' && (
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-gray-950 border border-gray-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                  <input
                    type="text"
                    value={image.fileName}
                    onChange={(e) => onFileNameChange(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xs text-gray-400 p-2.5"
                  />
                  <span className="pr-3 text-[10px] font-mono text-gray-600">.png</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {image.status === 'success' ? (
              <>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={onGenerate}
                  className="flex items-center justify-center p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-all active:scale-[0.98]"
                  title="Regenerate"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onGenerate}
                disabled={isPermanentlyFailed}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                  isPermanentlyFailed 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-yellow-600/10 text-yellow-500 hover:bg-yellow-600/20 border border-yellow-500/20'
                }`}
              >
                {isPermanentlyFailed ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Failed Permanently
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Retry Generation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
