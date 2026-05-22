import { api } from './client';

export function recordShareView(shareId: string) {
  return api.post(`/shares/${shareId}/view`);
}

export function importShare(shareId: string) {
  return api.post('/subscriptions/import', { shareId });
}
