export type ImageStatus = 'pending' | 'loading' | 'success' | 'error' | 'cancelled';

export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  caption?: string;
  fileName?: string;
  status: ImageStatus;
  retryCount: number;
  error?: string;
}