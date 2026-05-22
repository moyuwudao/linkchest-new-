import { api } from './client';

export function getTiers() {
  return api.get('/tiers');
}

export function getMyTier() {
  return api.get('/tiers/me');
}
