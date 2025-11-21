export type ImageStatus = 'pending' | 'loading' | 'success' | 'error' | 'cancelled';

export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  status: ImageStatus;
  error?: string;
}
