
import React, { useState, useCallback, useMemo } from 'react';
import { generatePromptsFromArticle, generateImageFromPrompt } from './services/geminiService';
import type { GeneratedImage } from './types';
import { ImageCard } from './components/ImageCard';
import { Loader } from './components/Loader';

const App: React.FC = () => {
  const [articleText, setArticleText] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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

  const handleGenerateSingleImage = useCallback(async (index: number) => {
    const imageToGenerate = generatedImages[index];
    if (!imageToGenerate || (imageToGenerate.status !== 'pending' && imageToGenerate.status !== 'error')) return;

    setGeneratedImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index].status = 'loading';
      return newImages;
    });

    try {
      const imageUrl = await generateImageFromPrompt(imageToGenerate.prompt);
      setGeneratedImages(prevImages => {
        const newImages = [...prevImages];
        newImages[index] = { ...newImages[index], imageUrl, status: 'success' };
        return newImages;
      });
    } catch (imageGenError) {
      console.error(`Failed to generate image for prompt: "${imageToGenerate.prompt}"`, imageGenError);
      const errorMessage = imageGenError instanceof Error ? imageGenError.message : 'An unknown error occurred.';

      setGeneratedImages(prevImages => {
        const newImages = [...prevImages];
        newImages[index] = { ...newImages[index], error: "Generation Failed", status: 'error' };
        return newImages;
      });

      if (errorMessage.includes('API key') || errorMessage.includes('quota')) {
        setError(`A critical error occurred (quota limit or API key issue). Some images may have failed.`);
      }
    }
  }, [generatedImages]);

  const handleGenerateAllImages = useCallback(async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      // Use a function to get the latest status before deciding to generate
      let shouldGenerate = false;
      setGeneratedImages(prev => {
        shouldGenerate = prev[i]?.status === 'pending';
        return prev;
      });

      if (shouldGenerate) {
        await handleGenerateSingleImage(i);
      }
    }
  }, [generatedImages.length, handleGenerateSingleImage]);

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
      const initialImages: GeneratedImage[] = prompts.map(prompt => ({ prompt, imageUrl: '', status: 'pending' }));
      setGeneratedImages(initialImages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
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
      const newImages: GeneratedImage[] = prompts.map(prompt => ({ prompt, imageUrl: '', status: 'pending' }));
      setGeneratedImages(prev => [...prev, ...newImages]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate more prompts: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsGeneratingMore(false);
    }
  }, [articleText, generatedImages]);

  return (
    <div className="min-h-screen bg-gray-900 text-white antialiased">
      <div className="container mx-auto px-4 py-8 md:py-12">
        
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Blog Image Weaver
          </h1>
          <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
            Paste your article, generate prompts, then edit and weave them into a stunning visual gallery.
          </p>
        </header>

        <main>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-2xl border border-gray-700 backdrop-blur-sm">
              <textarea
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                placeholder="Paste your full blog article here..."
                className="w-full h-48 p-4 bg-gray-900 border border-gray-600 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-200 placeholder-gray-500"
                disabled={isLoading || isGeneratingMore || (generatedImages.length > 0 && isGenerating)}
              />
              <div className="mt-4 flex w-full items-center space-x-4">
                 {generatedImages.length === 0 ? (
                    <button
                      onClick={handleGeneratePrompts}
                      disabled={isLoading || !articleText.trim()}
                      className="w-full flex items-center justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing...
                        </>
                      ) : 'Generate Prompts'}
                    </button>
                 ) : (
                    <>
                      <button
                        onClick={handleGenerateAllImages}
                        disabled={isGenerating || !hasPendingImages || isGeneratingMore}
                        className="flex-grow flex items-center justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
                      >
                         {isGenerating ? (
                           <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Working...
                           </>
                         ) : 'Generate All'}
                      </button>

                      <button
                        onClick={handleGenerateMorePrompts}
                        disabled={isGenerating || isGeneratingMore}
                        className="flex-grow-0 whitespace-nowrap flex items-center justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {isGeneratingMore ? (
                          <>
                             <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            + 5 More
                          </>
                        ) : '+ 5 More'}
                      </button>

                      <button
                        onClick={handleReset}
                        disabled={isGenerating || isGeneratingMore}
                        aria-label="Start over with a new article"
                        className="shrink-0 flex items-center justify-center py-3 px-6 border border-gray-600 rounded-md shadow-sm text-base font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-colors disabled:opacity-50"
                      >
                        Start Over
                      </button>
                    </>
                 )}
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            {error && (
              <div className="max-w-4xl mx-auto bg-red-900/50 text-red-200 border border-red-700 p-4 rounded-lg text-center mb-8">
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center mt-8">
                <Loader message={loadingMessage} />
              </div>
            )}

            {generatedImages.length === 0 && !isLoading && !error && (
               <div className="text-center text-gray-500 mt-16">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 <p className="mt-4 text-lg">Your generated images will appear here.</p>
               </div>
            )}

            {generatedImages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 mt-8">
                {generatedImages.map((image, index) => (
                  <ImageCard
                    key={index}
                    image={image}
                    onPromptChange={(newPrompt) => handlePromptChange(index, newPrompt)}
                    onGenerate={() => handleGenerateSingleImage(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

      </div>
    </div>
  );
};

export default App;
