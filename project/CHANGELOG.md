# LinkChest Changelog

## [1.1.0] - 2026-05-02

### Features
- **Payment Integration (Stripe)**
  - Web tier upgrade page with Stripe Checkout integration
  - Mobile tier upgrade with Stripe payment via expo-web-browser
  - Backend `/payments/stripe/checkout` API for creating Checkout Sessions
  - Backend `/payments/stripe/webhook` for handling Stripe webhook events
  - Backend `/payments/stripe/portal` for Customer Portal access
- **Payment Integration (Google Play)**
  - Mobile payment method selection (Stripe / Google Play)
  - Backend `/payments/google/verify` for server-side purchase token validation
  - Support for `GOOGLE_PLAY_SKIP_VERIFY` in development environments
- **Payment Service Layer**
  - Unified `processPaymentSuccess()` for handling post-payment tier upgrades
  - `validatePurchaseEligibility()` to prevent downgrades or duplicate purchases
  - `getPaymentDetails()` for price and expiry calculations
- **Firebase Analytics & Notifications**
  - Conditional Firebase Analytics initialization with graceful fallback
  - Push notification support with FCM token management
  - Safe initialization prevents crashes when Firebase is unconfigured

### Translations
- Added `payment` translation block to all locale files (zh, en) for Web and Mobile
- Added missing `referralCode` translations to Mobile zh/en locale files

### Fixes
- Fixed Next.js `useSearchParams()` Suspense CSR bailout in `tier/upgrade/page.tsx`
- Fixed missing `prisma` import in Stripe payment routes
- Fixed incorrect error code usage (`VALIDATION_ERROR` → `VALIDATION_FAILED`)
- Fixed function name with space `validatePurchase eligibility` → `validatePurchaseEligibility`

### Version Updates
- Root package: `1.0.0` → `1.1.0`
- API package: `1.0.0` → `1.1.0`
- Web package: `1.0.0` → `1.1.0`
- Mobile package: `1.0.0` → `1.1.0`

## [1.0.0] - 2026-04-07

### Features
- Cross-platform bookmark manager supporting 91+ platforms
- Group and tag organization system
- Share link generation with password protection and expiry
- Tiered subscription system (Medium / Heavy / Super)
- Google OAuth login
- Email login with verification codes
- Referral system with invite codes
- Trash and restore functionality
- Auto backup (CSV / HTML / JSON)
- Duplicate detection and merge
- Dark mode support
- PWA support for Web
