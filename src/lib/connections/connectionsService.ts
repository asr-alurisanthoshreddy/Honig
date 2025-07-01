interface ConnectionStatus {
  whatsapp: {
    connected: boolean;
    phoneNumber?: string;
    businessName?: string;
    lastSync?: string;
  };
  gmail: {
    connected: boolean;
    email?: string;
    name?: string;
    lastSync?: string;
  };
}

interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'media';
}

interface GmailMessage {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

class ConnectionsService {
  private whatsappToken: string | null = null;
  private gmailToken: string | null = null;
  private whatsappBusinessId: string | null = null;

  constructor() {
    this.loadStoredTokens();
  }

  private loadStoredTokens() {
    try {
      const whatsappData = localStorage.getItem('whatsapp_connection');
      const gmailData = localStorage.getItem('gmail_connection');

      if (whatsappData) {
        const parsed = JSON.parse(whatsappData);
        this.whatsappToken = parsed.token;
        this.whatsappBusinessId = parsed.businessId;
      }

      if (gmailData) {
        const parsed = JSON.parse(gmailData);
        this.gmailToken = parsed.token;
      }
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  private saveConnection(service: 'whatsapp' | 'gmail', data: any) {
    try {
      localStorage.setItem(`${service}_connection`, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${service} connection:`, error);
    }
  }

  private removeConnection(service: 'whatsapp' | 'gmail') {
    try {
      localStorage.removeItem(`${service}_connection`);
      if (service === 'whatsapp') {
        this.whatsappToken = null;
        this.whatsappBusinessId = null;
      } else {
        this.gmailToken = null;
      }
    } catch (error) {
      console.error(`Failed to remove ${service} connection:`, error);
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const status: ConnectionStatus = {
      whatsapp: { connected: false },
      gmail: { connected: false }
    };

    // Check WhatsApp connection
    if (this.whatsappToken) {
      try {
        const whatsappData = localStorage.getItem('whatsapp_connection');
        if (whatsappData) {
          const parsed = JSON.parse(whatsappData);
          status.whatsapp = {
            connected: true,
            phoneNumber: parsed.phoneNumber,
            businessName: parsed.businessName,
            lastSync: parsed.lastSync
          };
        }
      } catch (error) {
        console.error('Failed to get WhatsApp status:', error);
      }
    }

    // Check Gmail connection
    if (this.gmailToken) {
      try {
        const gmailData = localStorage.getItem('gmail_connection');
        if (gmailData) {
          const parsed = JSON.parse(gmailData);
          status.gmail = {
            connected: true,
            email: parsed.email,
            name: parsed.name,
            lastSync: parsed.lastSync
          };
        }
      } catch (error) {
        console.error('Failed to get Gmail status:', error);
      }
    }

    return status;
  }

  async connectWhatsApp(): Promise<void> {
    try {
      // Check if WhatsApp Business API credentials are configured
      const whatsappApiKey = import.meta.env.VITE_WHATSAPP_API_KEY;
      const whatsappBusinessId = import.meta.env.VITE_WHATSAPP_BUSINESS_ID;

      if (!whatsappApiKey || !whatsappBusinessId) {
        throw new Error('WhatsApp Business API credentials not configured. Please add VITE_WHATSAPP_API_KEY and VITE_WHATSAPP_BUSINESS_ID to your environment variables.');
      }

      // In a real implementation, this would initiate OAuth flow
      // For demo purposes, we'll simulate a successful connection
      const mockConnectionData = {
        token: whatsappApiKey,
        businessId: whatsappBusinessId,
        phoneNumber: '+1234567890', // This would come from the API
        businessName: 'Your Business', // This would come from the API
        lastSync: new Date().toISOString()
      };

      this.whatsappToken = mockConnectionData.token;
      this.whatsappBusinessId = mockConnectionData.businessId;
      this.saveConnection('whatsapp', mockConnectionData);

      console.log('WhatsApp connected successfully');
    } catch (error) {
      console.error('WhatsApp connection failed:', error);
      throw error;
    }
  }

  async connectGmail(): Promise<void> {
    try {
      // Check if Google OAuth credentials are configured
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        throw new Error('Google OAuth credentials not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.');
      }

      // In a real implementation, this would use Google OAuth2
      // For demo purposes, we'll simulate a successful connection
      const mockConnectionData = {
        token: 'mock_gmail_token',
        email: 'user@gmail.com', // This would come from Google OAuth
        name: 'User Name', // This would come from Google OAuth
        lastSync: new Date().toISOString()
      };

      this.gmailToken = mockConnectionData.token;
      this.saveConnection('gmail', mockConnectionData);

      console.log('Gmail connected successfully');
    } catch (error) {
      console.error('Gmail connection failed:', error);
      throw error;
    }
  }

  async disconnectWhatsApp(): Promise<void> {
    this.removeConnection('whatsapp');
    console.log('WhatsApp disconnected');
  }

  async disconnectGmail(): Promise<void> {
    this.removeConnection('gmail');
    console.log('Gmail disconnected');
  }

  async sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
    if (!this.whatsappToken || !this.whatsappBusinessId) {
      throw new Error('WhatsApp not connected');
    }

    try {
      // In a real implementation, this would call WhatsApp Business API
      console.log('Sending WhatsApp message:', message);
      
      // Mock API call
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.whatsappBusinessId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to,
          type: 'text',
          text: {
            body: message.message
          }
        })
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  async sendGmailMessage(message: GmailMessage): Promise<boolean> {
    if (!this.gmailToken) {
      throw new Error('Gmail not connected');
    }

    try {
      // In a real implementation, this would call Gmail API
      console.log('Sending Gmail message:', message);

      // Create email content
      const emailContent = [
        `To: ${message.to}`,
        `Subject: ${message.subject}`,
        message.cc ? `Cc: ${message.cc.join(', ')}` : '',
        message.bcc ? `Bcc: ${message.bcc.join(', ')}` : '',
        '',
        message.body
      ].filter(Boolean).join('\n');

      // Encode email content
      const encodedMessage = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      // Mock API call
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.gmailToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send Gmail message:', error);
      throw error;
    }
  }

  isWhatsAppConnected(): boolean {
    return !!this.whatsappToken;
  }

  isGmailConnected(): boolean {
    return !!this.gmailToken;
  }
}

export const connectionsService = new ConnectionsService();