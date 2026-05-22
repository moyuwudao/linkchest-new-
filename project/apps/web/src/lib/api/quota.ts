import { api } from './client';

export function getQuota() {
  return api.get('/quota');
}
