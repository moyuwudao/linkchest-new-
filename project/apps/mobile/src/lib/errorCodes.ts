// 错误码定义 - 前后端统一使用错误码进行错误处理
// 错误码格式: ERR_XXX_YYY

export const AuthErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: 'ERR_UNKNOWN',
  SERVER_ERROR: 'ERR_SERVER',

  // 验证码相关 (1000-1099)
  VERIFICATION_SEND_TOO_FREQUENT: 'ERR_VERIFICATION_SEND_TOO_FREQUENT',
  VERIFICATION_EXPIRED: 'ERR_VERIFICATION_EXPIRED',
  VERIFICATION_INVALID: 'ERR_VERIFICATION_INVALID',
  VERIFICATION_ATTEMPTS_EXCEEDED: 'ERR_VERIFICATION_ATTEMPTS_EXCEEDED',

  // 登录相关 (2000-2099)
  ACCOUNT_NOT_FOUND: 'ERR_ACCOUNT_NOT_FOUND',
  PASSWORD_INCORRECT: 'ERR_PASSWORD_INCORRECT',
  ACCOUNT_NOT_SET_PASSWORD: 'ERR_ACCOUNT_NOT_SET_PASSWORD',
  ACCOUNT_GOOGLE_NO_PASSWORD: 'ERR_ACCOUNT_GOOGLE_NO_PASSWORD',

  // 注册相关 (3000-3099)
  EMAIL_ALREADY_REGISTERED: 'ERR_EMAIL_ALREADY_REGISTERED',
  USERNAME_ALREADY_EXISTS: 'ERR_USERNAME_ALREADY_EXISTS',
  USERNAME_CONTAINS_BANNED_WORDS: 'ERR_USERNAME_CONTAINS_BANNED_WORDS',

  // 输入验证相关 (4000-4099)
  INVALID_EMAIL_FORMAT: 'ERR_INVALID_EMAIL_FORMAT',
  INVALID_PASSWORD_FORMAT: 'ERR_INVALID_PASSWORD_FORMAT',
  PASSWORD_MISMATCH: 'ERR_PASSWORD_MISMATCH',
  USERNAME_INVALID_FORMAT: 'ERR_USERNAME_INVALID_FORMAT',

  // Token相关 (5000-5099)
  TOKEN_INVALID: 'ERR_TOKEN_INVALID',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED',
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',

  // 第三方登录相关 (5100-5199)
  INVALID_GOOGLE_TOKEN: 'ERR_INVALID_GOOGLE_TOKEN',
  INVALID_WECHAT_TOKEN: 'ERR_INVALID_WECHAT_TOKEN',
  EMAIL_SEND_FAILED: 'ERR_EMAIL_SEND_FAILED',

  // 用户相关 (6000-6099)
  USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',

  // Google 相关 (6000-6099)
  GOOGLE_EMAIL_CANNOT_CHANGE: 'ERR_GOOGLE_EMAIL_CANNOT_CHANGE',

  // 配额相关 (7000-7099)
  QUOTA_EXCEEDED: 'ERR_QUOTA_EXCEEDED',

  // 通用验证错误 (8000-8099)
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',

  // 封面上传相关 (9000-9099)
  UPLOAD_MISSING_IMAGE_DATA: 'ERR_UPLOAD_MISSING_IMAGE_DATA',
  UPLOAD_INVALID_IMAGE_DATA: 'ERR_UPLOAD_INVALID_IMAGE_DATA',
  UPLOAD_INVALID_IMAGE_FORMAT: 'ERR_UPLOAD_INVALID_IMAGE_FORMAT',
  UPLOAD_FILE_TOO_LARGE: 'ERR_UPLOAD_FILE_TOO_LARGE',
  UPLOAD_COVER_FAILED: 'ERR_UPLOAD_COVER_FAILED',

  // 配额详情 (10000-10099)
  QUOTA_FETCH_FAILED: 'ERR_QUOTA_FETCH_FAILED',
  QUOTA_COLLECTIONS_EXCEEDED: 'ERR_QUOTA_COLLECTIONS_EXCEEDED',
  QUOTA_TAGS_EXCEEDED: 'ERR_QUOTA_TAGS_EXCEEDED',
  QUOTA_LISTS_EXCEEDED: 'ERR_QUOTA_LISTS_EXCEEDED',
  QUOTA_SHARES_EXCEEDED: 'ERR_QUOTA_SHARES_EXCEEDED',
  QUOTA_COVER_IMAGES_EXCEEDED: 'ERR_QUOTA_COVER_IMAGES_EXCEEDED',

  // 统计相关 (11000-11099)
  STATS_PLATFORM_FETCH_FAILED: 'ERR_STATS_PLATFORM_FETCH_FAILED',
  STATS_OVERVIEW_FETCH_FAILED: 'ERR_STATS_OVERVIEW_FETCH_FAILED',

  // 订阅/导入相关 (12000-12099)
  SUBSCRIPTION_IMPORT_FAILED: 'ERR_SUBSCRIPTION_IMPORT_FAILED',
  SUBSCRIPTION_SHARE_NOT_FOUND: 'ERR_SUBSCRIPTION_SHARE_NOT_FOUND',
  SUBSCRIPTION_ALREADY_IMPORTED: 'ERR_SUBSCRIPTION_ALREADY_IMPORTED',
} as const;

export type AuthErrorCode = typeof AuthErrorCodes[keyof typeof AuthErrorCodes];

// 错误码到 i18n key 的映射
export const ErrorCodeToI18nKey: Record<AuthErrorCode, string> = {
  [AuthErrorCodes.UNKNOWN_ERROR]: 'error.unknown',
  [AuthErrorCodes.SERVER_ERROR]: 'error.server',

  // 验证码相关
  [AuthErrorCodes.VERIFICATION_SEND_TOO_FREQUENT]: 'error.verificationSendTooFrequent',
  [AuthErrorCodes.VERIFICATION_EXPIRED]: 'error.verificationExpired',
  [AuthErrorCodes.VERIFICATION_INVALID]: 'error.verificationInvalid',
  [AuthErrorCodes.VERIFICATION_ATTEMPTS_EXCEEDED]: 'error.verificationAttemptsExceeded',

  // 登录相关
  [AuthErrorCodes.ACCOUNT_NOT_FOUND]: 'error.accountNotFound',
  [AuthErrorCodes.PASSWORD_INCORRECT]: 'error.passwordIncorrect',
  [AuthErrorCodes.ACCOUNT_NOT_SET_PASSWORD]: 'error.accountNotSetPassword',
  [AuthErrorCodes.ACCOUNT_GOOGLE_NO_PASSWORD]: 'error.accountGoogleNoPassword',

  // 注册相关
  [AuthErrorCodes.EMAIL_ALREADY_REGISTERED]: 'error.emailAlreadyRegistered',
  [AuthErrorCodes.USERNAME_ALREADY_EXISTS]: 'error.usernameAlreadyExists',
  [AuthErrorCodes.USERNAME_CONTAINS_BANNED_WORDS]: 'error.usernameContainsBannedWords',

  // 输入验证相关
  [AuthErrorCodes.INVALID_EMAIL_FORMAT]: 'error.invalidEmailFormat',
  [AuthErrorCodes.INVALID_PASSWORD_FORMAT]: 'error.invalidPasswordFormat',
  [AuthErrorCodes.PASSWORD_MISMATCH]: 'error.passwordMismatch',
  [AuthErrorCodes.USERNAME_INVALID_FORMAT]: 'error.usernameInvalidFormat',

  // Token相关
  [AuthErrorCodes.TOKEN_INVALID]: 'error.tokenInvalid',
  [AuthErrorCodes.TOKEN_EXPIRED]: 'error.tokenExpired',
  [AuthErrorCodes.UNAUTHORIZED]: 'error.unauthorized',

  // 第三方登录相关
  [AuthErrorCodes.INVALID_GOOGLE_TOKEN]: 'error.invalidGoogleToken',
  [AuthErrorCodes.INVALID_WECHAT_TOKEN]: 'error.invalidWechatToken',
  [AuthErrorCodes.EMAIL_SEND_FAILED]: 'error.emailSendFailed',

  // 用户相关
  [AuthErrorCodes.USER_NOT_FOUND]: 'error.userNotFound',

  // Google 相关
  [AuthErrorCodes.GOOGLE_EMAIL_CANNOT_CHANGE]: 'error.googleEmailCannotChange',

  // 配额相关
  [AuthErrorCodes.QUOTA_EXCEEDED]: 'error.quotaExceeded',

  // 通用验证错误
  [AuthErrorCodes.VALIDATION_FAILED]: 'error.validationFailed',

  // 封面上传相关
  [AuthErrorCodes.UPLOAD_MISSING_IMAGE_DATA]: 'error.uploadMissingImageData',
  [AuthErrorCodes.UPLOAD_INVALID_IMAGE_DATA]: 'error.uploadInvalidImageData',
  [AuthErrorCodes.UPLOAD_INVALID_IMAGE_FORMAT]: 'error.uploadInvalidImageFormat',
  [AuthErrorCodes.UPLOAD_FILE_TOO_LARGE]: 'error.uploadFileTooLarge',
  [AuthErrorCodes.UPLOAD_COVER_FAILED]: 'error.uploadCoverFailed',

  // 配额详情
  [AuthErrorCodes.QUOTA_FETCH_FAILED]: 'error.quotaFetchFailed',
  [AuthErrorCodes.QUOTA_COLLECTIONS_EXCEEDED]: 'error.quotaCollectionsExceeded',
  [AuthErrorCodes.QUOTA_TAGS_EXCEEDED]: 'error.quotaTagsExceeded',
  [AuthErrorCodes.QUOTA_LISTS_EXCEEDED]: 'error.quotaListsExceeded',
  [AuthErrorCodes.QUOTA_SHARES_EXCEEDED]: 'error.quotaSharesExceeded',
  [AuthErrorCodes.QUOTA_COVER_IMAGES_EXCEEDED]: 'error.quotaCoverImagesExceeded',

  // 统计相关
  [AuthErrorCodes.STATS_PLATFORM_FETCH_FAILED]: 'error.statsPlatformFetchFailed',
  [AuthErrorCodes.STATS_OVERVIEW_FETCH_FAILED]: 'error.statsOverviewFetchFailed',

  // 订阅/导入相关
  [AuthErrorCodes.SUBSCRIPTION_IMPORT_FAILED]: 'error.subscriptionImportFailed',
  [AuthErrorCodes.SUBSCRIPTION_SHARE_NOT_FOUND]: 'error.subscriptionShareNotFound',
  [AuthErrorCodes.SUBSCRIPTION_ALREADY_IMPORTED]: 'error.subscriptionAlreadyImported',
};
