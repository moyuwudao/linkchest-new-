/**
 * Admin API 封装
 * 复用现有的 api 实例，所有请求自动携带 Bearer Token
 */
import { api } from './api';
import type {
  LogQueryParams,
  ErrorQueryParams,
  AlertRuleInput,
  UserQueryParams,
  TierConfigInput,
} from './types';

// ===== Dashboard =====

export function getDashboard() {
  return api.get('/admin/dashboard');
}

// ===== Logs =====

export function getLogs(params?: LogQueryParams) {
  return api.get('/admin/logs', { params });
}

export function getLogFiles() {
  return api.get('/admin/logs/files');
}

// ===== Errors =====

export function getErrors(params?: ErrorQueryParams) {
  return api.get('/admin/errors', { params });
}

export function getErrorDetail(id: string) {
  return api.get(`/admin/errors/${id}`);
}

export function updateErrorStatus(id: string, status: string) {
  return api.patch(`/admin/errors/${id}`, { status });
}

// ===== Metrics =====

export function getMetrics(windowMinutes?: number) {
  return api.get('/admin/metrics', { params: { window: windowMinutes } });
}

// ===== Alert Rules =====

export function getAlertRules() {
  return api.get('/admin/alerts');
}

export function createAlertRule(data: AlertRuleInput) {
  return api.post('/admin/alerts', data);
}

export function updateAlertRule(id: string, data: Partial<AlertRuleInput>) {
  return api.patch(`/admin/alerts/${id}`, data);
}

export function deleteAlertRule(id: string) {
  return api.delete(`/admin/alerts/${id}`);
}

export function testAlertRule(id: string) {
  return api.post(`/admin/alerts/${id}/test`);
}

// ===== Alert History =====

export function getAlertHistory(params?: { page?: number; pageSize?: number; ruleId?: string }) {
  return api.get('/admin/alerts/history', { params });
}

// ===== Users =====

export function getUsers(params?: UserQueryParams) {
  return api.get('/admin/users', { params });
}

export function getUserDetail(id: string) {
  return api.get(`/admin/users/${id}`);
}

export function updateUser(id: string, data: { status?: string; userTier?: string; bannedReason?: string }) {
  return api.patch(`/admin/users/${id}`, data);
}

// ===== Tiers =====

export function getTierConfigs() {
  return api.get('/admin/tiers');
}

export function createTierConfig(data: TierConfigInput) {
  return api.post('/admin/tiers', data);
}

export function updateTierConfig(id: string, data: Partial<TierConfigInput>) {
  return api.patch(`/admin/tiers/${id}`, data);
}

export function deleteTierConfig(id: string) {
  return api.delete(`/admin/tiers/${id}`);
}

export function getTierStats() {
  return api.get('/admin/tiers/stats');
}

export function syncTierConfigs() {
  return api.post('/admin/tiers/sync');
}
