import { api } from './client';

export function uploadCover(base64Image: string, originalName?: string) {
  return api.post('/upload/cover', { imageData: base64Image, originalName });
}
