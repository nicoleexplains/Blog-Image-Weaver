import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generatePromptsFromArticle, generateImageFromPrompt, generateCaptionFromPrompt } from './services/geminiService';
import type { GeneratedImage } from './types';
import { ImageCard } from './components/ImageCard';
import { Loader } from './components/Loader';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, 
  Plus, 
  RotateCcw, 
  LayoutGrid, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon,
  Key,
  ExternalLink
} from 'lucide-react';

const MAX_RETRIES = 3;

// Extend Window interface for AI Studio specific APIs
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [articleText, setArticleText] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Check for API key selection on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success and proceed to app
      setHasApiKey(true);
    }
  };

  const hasPendingImages = useMemo(() =>
    generatedImages.some(img => img.status === 'pending'),
    [generatedImages]
  );

  const isGenerating = useMemo(() =>
    generatedImages.some(img => img.status === 'loading'),
    [generatedImages]
  );

  const handleReset = useCallback(() => {
    setArticleText('');
    setGeneratedImages([]);
    setError(null);
  }, []);

  const handlePromptChange = useCallback((index: number, newPrompt: string) => {
    setGeneratedImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index].prompt = newPrompt;
      return newImages;
    });
  }, []);

  const handleFileNameChange = useCallback((index: number, newFileName: string) => {
    setGeneratedImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index].fileName = newFileName;
      return newImages;
    });
  }, []);

  const handleApiError = useCallback((err: unknown, context: string) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errStr = errorMessage.toLowerCase();
    const isKeyError = errStr.includes('api key') || errStr.includes('expired') || errStr.includes('invalid') || errStr.includes('not found');
    const isQuotaError = errStr.includes('quota') || errStr.includes('429') || errStr.includes('exhausted');

    if (isKeyError) {
      setError(`Your API key has expired or is invalid. Please select a new one.`);
      setHasApiKey(false);
    } else if (isQuotaError) {
      setError(`A critical error occurred (quota limit). Please check your billing details.`);
    } else {
      setError(`${context}: ${errorMessage}`);
    }
    console.error(`${context}:`, err);
  }, []);

  const handleGenerateSingleImage = useCallback(async (index: number) => {
    const imageToGenerate = generatedImages[index];
    if (!imageToGenerate) return;

    const canAttempt = 
      imageToGenerate.status === 'pending' || 
      imageToGenerate.status === 'success' || 
      (imageToGenerate.status === 'error' && imageToGenerate.retryCount < MAX_RETRIES);
    
    if (!canAttempt) return;

    setGeneratedImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index].status = 'loading';
      newImages[index].error = undefined;
      return newImages;
    });

    try {
      const [imageUrl, caption] = await Promise.all([
        generateImageFromPrompt(imageToGenerate.prompt),
        generateCaptionFromPrompt(imageToGenerate.prompt)
      ]);
      setGeneratedImages(prevImages => {
        const newImages = [...prevImages];
        newImages[index] = { ...newImages[index], imageUrl, caption, status: 'success', error: undefined, retryCount: 0 };
        return newImages;
      });
    } catch (imageGenError) {
      handleApiError(imageGenError, `Failed to generate image for index ${index}`);

      setGeneratedImages(prevImages => {
        const newImages = [...prevImages];
        const currentImage = newImages[index];
        const newRetryCount = currentImage.retryCount + 1;
        
        newImages[index] = { 
          ...currentImage, 
          error: imageGenError instanceof Error ? imageGenError.message : String(imageGenError), 
          status: 'error',
          retryCount: newRetryCount
        };
        return newImages;
      });
    }
  }, [generatedImages]);

  const handleGenerateAllImages = useCallback(async () => {
    // Identify all indices that need generation
    const indicesToGenerate = generatedImages.reduce((acc, img, idx) => {
      const canAttempt = 
        img.status === 'pending' || 
        (img.status === 'error' && img.retryCount < MAX_RETRIES);
      if (canAttempt) acc.push(idx);
      return acc;
    }, [] as number[]);

    // Process them in sequence to avoid overwhelming the API and respect rate limits
    for (const index of indicesToGenerate) {
      await handleGenerateSingleImage(index);
    }
  }, [generatedImages, handleGenerateSingleImage]);

  const handleGeneratePrompts = useCallback(async () => {
    if (!articleText.trim()) {
      setError('Please paste an article before generating prompts.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setLoadingMessage('Analyzing article and generating prompts...');

    try {
      const prompts = await generatePromptsFromArticle(articleText);
      const initialImages: GeneratedImage[] = prompts.map(prompt => {
        const defaultFileName = prompt
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50) || 'generated-image';
        
        return { 
          prompt, 
          imageUrl: '', 
          fileName: defaultFileName,
          status: 'pending',
          retryCount: 0 
        };
      });
      setGeneratedImages(initialImages);
    } catch (err) {
      handleApiError(err, 'Failed to generate prompts');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [articleText]);

  const handleGenerateMorePrompts = useCallback(async () => {
    if (!articleText.trim()) return;

    setIsGeneratingMore(true);
    setError(null);
    
    try {
      const currentPrompts = generatedImages.map(img => img.prompt);
      const prompts = await generatePromptsFromArticle(articleText, currentPrompts);
      const newImages: GeneratedImage[] = prompts.map(prompt => {
        const defaultFileName = prompt
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50) || 'generated-image';

        return { 
          prompt, 
          imageUrl: '', 
          fileName: defaultFileName,
          status: 'pending',
          retryCount: 0
        };
      });
      setGeneratedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      handleApiError(err, 'Failed to generate more prompts');
    } finally {
      setIsGeneratingMore(false);
    }
  }, [articleText, generatedImages]);

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
          <p className="text-gray-400 mb-8">
            To generate high-quality images with Gemini 3.1, you need to select a valid API key from a paid Google Cloud project.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            Select API Key
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm text-gray-500 hover:text-gray-300 underline underline-offset-4"
          >
            Learn about Gemini API billing
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
        
        <header className="mb-16 text-center lg:text-left lg:flex lg:items-end lg:justify-between gap-8">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4"
            >
              <Wand2 className="w-3 h-3" />
              AI-Powered Visuals
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[0.9]"
            >
              BLOG IMAGE <span className="text-blue-500">WEAVER</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-400 leading-relaxed"
            >
              Transform your written content into a curated gallery of cinematic visuals. 
              Paste your article below to begin the weaving process.
            </motion.p>
          </div>
          
          <div className="hidden lg:block">
            <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                System Ready
              </div>
              <div className="w-px h-4 bg-gray-800" />
              <div>v3.1 Flash Image</div>
            </div>
          </div>
        </header>

        <main className="space-y-12">
          <section className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-bottom border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Article Input
                </div>
                {articleText && (
                  <div className="text-[10px] font-mono text-gray-500 uppercase">
                    {articleText.length} characters
                  </div>
                )}
              </div>
              <textarea
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                placeholder="Paste your blog article here..."
                className="w-full h-64 p-6 bg-transparent border-none focus:ring-0 text-gray-200 placeholder-gray-600 resize-none text-lg leading-relaxed"
                disabled={isLoading || isGeneratingMore || (generatedImages.length > 0 && isGenerating)}
              />
              <div className="p-6 bg-gray-900/80 border-t border-gray-800 flex flex-wrap gap-4 items-center">
                 {generatedImages.length === 0 ? (
                    <button
                      onClick={handleGeneratePrompts}
                      disabled={isLoading || !articleText.trim()}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-3 py-4 px-8 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <Loader message="Analyzing..." size="sm" />
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          Analyze & Generate Prompts
                        </>
                      )}
                    </button>
                 ) : (
                    <>
                      <button
                        onClick={handleGenerateAllImages}
                        disabled={isGenerating || !hasPendingImages || isGeneratingMore}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-3 py-4 px-8 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-[0.98]"
                      >
                         {isGenerating ? (
                           <Loader message="Weaving..." size="sm" />
                         ) : (
                           <>
                             <ImageIcon className="w-5 h-5" />
                             Generate All Images
                           </>
                         )}
                      </button>

                      <button
                        onClick={handleGenerateMorePrompts}
                        disabled={isGenerating || isGeneratingMore}
                        className="flex items-center justify-center gap-2 py-4 px-6 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                      >
                        {isGeneratingMore ? (
                          <Loader message="" size="sm" />
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            5 More Prompts
                          </>
                        )}
                      </button>

                      <div className="flex-1" />

                      <button
                        onClick={handleReset}
                        disabled={isGenerating || isGeneratingMore}
                        className="flex items-center justify-center gap-2 py-4 px-6 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Reset
                      </button>
                    </>
                 )}
              </div>
            </div>
          </section>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">System Error</h3>
                  <p className="text-red-200/80 text-sm leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <section>
            {generatedImages.length > 0 && (
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-5 h-5 text-blue-500" />
                  <h2 className="text-2xl font-bold text-white tracking-tight">Image Gallery</h2>
                </div>
                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                  {generatedImages.filter(img => img.status === 'success').length} / {generatedImages.length} Completed
                </div>
              </div>
            )}

            {generatedImages.length === 0 && !isLoading && !error && (
               <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-32 text-center border-2 border-dashed border-gray-800 rounded-3xl"
               >
                 <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                   <ImageIcon className="w-10 h-10 text-gray-700" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-400 mb-2">No visuals generated yet</h3>
                 <p className="text-gray-600 max-w-xs mx-auto">
                   Paste an article and generate prompts to see your gallery come to life.
                 </p>
               </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              <AnimatePresence>
                {generatedImages.map((image, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ImageCard
                      image={image}
                      onPromptChange={(newPrompt) => handlePromptChange(index, newPrompt)}
                      onFileNameChange={(newFileName) => handleFileNameChange(index, newFileName)}
                      onGenerate={() => handleGenerateSingleImage(index)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </main>

        <footer className="mt-32 pt-12 border-t border-gray-900 text-center">
          <p className="text-gray-600 text-sm font-medium tracking-widest uppercase">
            Powered by Gemini 3.1 Flash Image
          </p>
        </footer>

      </div>
    </div>
  );
};

export default App;
