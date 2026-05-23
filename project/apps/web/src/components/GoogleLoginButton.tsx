'use client';

import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
  clientId?: string;
}

export default function GoogleLoginButton({ onSuccess, onError, clientId }: GoogleLoginButtonProps) {
  const googleClientId = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  
  if (!googleClientId) {
    console.warn('[GoogleLoginButton] No clientId provided');
    return null;
  }
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        type="icon"
        theme="outline"
        size="large"
        shape="circle"
      />
    </GoogleOAuthProvider>
  );
}
