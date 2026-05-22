import {
  AuthErrorCodes,
  CollectionErrorCodes,
  ListErrorCodes,
  TagErrorCodes,
  ShareErrorCodes,
  PublicErrorCodes,
  UploadErrorCodes,
  QuotaErrorCodes,
  StatsErrorCodes,
  SubscriptionErrorCodes,
  TierErrorCodes,
  ReferralErrorCodes,
  CommonErrorCodes,
  errorMessages,
  getErrorMessage,
  type AuthErrorCode,
  type CollectionErrorCode,
  type ListErrorCode,
  type TagErrorCode,
  type ShareErrorCode,
  type PublicErrorCode,
  type UploadErrorCode,
  type QuotaErrorCode,
  type StatsErrorCode,
  type SubscriptionErrorCode,
  type TierErrorCode,
  type ReferralErrorCode,
  type CommonErrorCode,
  type AllErrorCodes,
} from '@linkchest/i18n';

export {
  AuthErrorCodes,
  CollectionErrorCodes,
  ListErrorCodes,
  TagErrorCodes,
  ShareErrorCodes,
  PublicErrorCodes,
  UploadErrorCodes,
  QuotaErrorCodes,
  StatsErrorCodes,
  SubscriptionErrorCodes,
  TierErrorCodes,
  ReferralErrorCodes,
  CommonErrorCodes,
  errorMessages,
  getErrorMessage,
  type AuthErrorCode,
  type CollectionErrorCode,
  type ListErrorCode,
  type TagErrorCode,
  type ShareErrorCode,
  type PublicErrorCode,
  type UploadErrorCode,
  type QuotaErrorCode,
  type StatsErrorCode,
  type SubscriptionErrorCode,
  type TierErrorCode,
  type ReferralErrorCode,
  type CommonErrorCode,
  type AllErrorCodes,
};

// 错误码到中文消息的映射（用于服务端日志和开发调试）
export const ErrorCodeToMessage: Record<string, string> = errorMessages.zh;

// 统一的错误响应辅助函数
export function errorResponse(res: { status(code: number): { json(data: unknown): unknown } }, statusCode: number, errorCode: AllErrorCodes | CommonErrorCode, details?: unknown) {
  const payload: Record<string, unknown> = { error: errorCode };
  if (details !== undefined) payload.details = details;
  return res.status(statusCode).json(payload);
}
