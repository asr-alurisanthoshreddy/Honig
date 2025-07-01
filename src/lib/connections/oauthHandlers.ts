// OAuth handlers for real-world implementation

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
}

class OAuthService {
  private static readonly GOOGLE_OAUTH_URL = 'https://accounts.google.com/oauth2/v2/auth';
  private static readonly WHATSAPP_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';

  static async initiateGoogleOAuth(): Promise<void> {
    const config: OAuthConfig = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/oauth/google/callback`,
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    };

    if (!config.clientId) {
      throw new Error('Google OAuth client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `${OAuthService.GOOGLE_OAUTH_URL}?${params.toString()}`;
    
    // Open OAuth flow in popup window
    const popup = window.open(
      authUrl,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth flow was cancelled'));
        }
      }, 1000);

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          resolve();
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  static async initiateWhatsAppOAuth(): Promise<void> {
    const config = {
      clientId: import.meta.env.VITE_WHATSAPP_API_KEY || '',
      redirectUri: `${window.location.origin}/oauth/whatsapp/callback`,
      scope: ['whatsapp_business_messaging']
    };

    if (!config.clientId) {
      throw new Error('WhatsApp Business API key not configured');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(','),
      response_type: 'code'
    });

    const authUrl = `${OAuthService.WHATSAPP_OAUTH_URL}?${params.toString()}`;
    
    // Open OAuth flow in popup window
    const popup = window.open(
      authUrl,
      'whatsapp-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth flow was cancelled'));
        }
      }, 1000);

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'WHATSAPP_OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          resolve();
        } else if (event.data.type === 'WHATSAPP_OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  static async exchangeCodeForToken(service: 'google' | 'whatsapp', code: string): Promise<any> {
    // In a real implementation, this would be handled by your backend
    // to securely exchange the authorization code for access tokens
    
    const endpoint = service === 'google' 
      ? 'https://oauth2.googleapis.com/token'
      : 'https://graph.facebook.com/v18.0/oauth/access_token';

    const body = service === 'google' 
      ? {
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET, // Should be on backend
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${window.location.origin}/oauth/google/callback`
        }
      : {
          client_id: import.meta.env.VITE_WHATSAPP_API_KEY,
          client_secret: import.meta.env.VITE_WHATSAPP_CLIENT_SECRET, // Should be on backend
          code,
          redirect_uri: `${window.location.origin}/oauth/whatsapp/callback`
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(body)
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
  }

  static async refreshToken(service: 'google' | 'whatsapp', refreshToken: string): Promise<any> {
    // Handle token refresh for long-lived access
    const endpoint = service === 'google'
      ? 'https://oauth2.googleapis.com/token'
      : 'https://graph.facebook.com/v18.0/oauth/access_token';

    const body = service === 'google'
      ? {
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }
      : {
          grant_type: 'fb_exchange_token',
          client_id: import.meta.env.VITE_WHATSAPP_API_KEY,
          client_secret: import.meta.env.VITE_WHATSAPP_CLIENT_SECRET,
          fb_exchange_token: refreshToken
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(body)
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return response.json();
  }
}

export { OAuthService };