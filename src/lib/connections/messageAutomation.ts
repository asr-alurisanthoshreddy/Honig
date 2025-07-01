import { connectionsService } from './connectionsService';

interface ParsedCommand {
  action: 'send_whatsapp' | 'send_email' | 'unknown';
  recipient: string;
  message?: string;
  subject?: string;
  email?: string;
  confidence: number;
}

class MessageAutomationService {
  private geminiApiKey: string;

  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  async parseCommand(userInput: string): Promise<ParsedCommand> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
You are a message automation parser. Analyze the user's command and extract messaging intent.

User command: "${userInput}"

Parse this command and respond with ONLY a JSON object in this exact format:
{
  "action": "send_whatsapp" | "send_email" | "unknown",
  "recipient": "extracted recipient name",
  "message": "extracted message content (for WhatsApp)",
  "subject": "extracted email subject (for email)",
  "email": "extracted email address (for email)",
  "confidence": 0.0-1.0
}

Rules:
1. If the command mentions "WhatsApp", "send to [name]", or similar → action: "send_whatsapp"
2. If the command mentions "email", "mail", "write a mail", or contains "@" → action: "send_email"
3. Extract the recipient name from the command
4. For WhatsApp: extract the message content
5. For email: extract subject and email address if provided
6. Set confidence based on how clear the intent is

Examples:
- "Send hi to John on WhatsApp" → {"action": "send_whatsapp", "recipient": "John", "message": "hi", "confidence": 0.9}
- "Write a mail to invite John for New Year at Times Square. Email is john@gmail.com" → {"action": "send_email", "recipient": "John", "subject": "New Year Invitation", "email": "john@gmail.com", "confidence": 0.9}
- "Tell me about the weather" → {"action": "unknown", "recipient": "", "confidence": 0.1}

Respond with ONLY the JSON object, no other text.
`;

      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const text = response.text().trim();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error) {
      console.error('Failed to parse command:', error);
      return {
        action: 'unknown',
        recipient: '',
        confidence: 0
      };
    }
  }

  async executeCommand(command: ParsedCommand): Promise<{ success: boolean; message: string }> {
    try {
      if (command.confidence < 0.7) {
        return {
          success: false,
          message: 'Command not clear enough. Please be more specific about what you want to send and to whom.'
        };
      }

      switch (command.action) {
        case 'send_whatsapp':
          return await this.executeWhatsAppCommand(command);
        case 'send_email':
          return await this.executeEmailCommand(command);
        default:
          return {
            success: false,
            message: 'I didn\'t understand that as a messaging command. Try something like "Send hi to John on WhatsApp" or "Write an email to john@gmail.com".'
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to execute command: ${errorMessage}`
      };
    }
  }

  private async executeWhatsAppCommand(command: ParsedCommand): Promise<{ success: boolean; message: string }> {
    if (!connectionsService.isWhatsAppConnected()) {
      return {
        success: false,
        message: 'WhatsApp is not connected. Please connect WhatsApp first using the connections panel.'
      };
    }

    if (!command.recipient || !command.message) {
      return {
        success: false,
        message: 'Please specify both the recipient and message for WhatsApp. Example: "Send hi to John on WhatsApp"'
      };
    }

    try {
      // In a real implementation, you'd need to resolve the recipient name to a phone number
      // For demo purposes, we'll use a placeholder phone number
      const phoneNumber = this.resolvePhoneNumber(command.recipient);
      
      await connectionsService.sendWhatsAppMessage({
        to: phoneNumber,
        message: command.message
      });

      return {
        success: true,
        message: `✅ WhatsApp message sent to ${command.recipient}: "${command.message}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to send WhatsApp message: ${errorMessage}`
      };
    }
  }

  private async executeEmailCommand(command: ParsedCommand): Promise<{ success: boolean; message: string }> {
    if (!connectionsService.isGmailConnected()) {
      return {
        success: false,
        message: 'Gmail is not connected. Please connect Gmail first using the connections panel.'
      };
    }

    if (!command.recipient) {
      return {
        success: false,
        message: 'Please specify the recipient for the email.'
      };
    }

    // Use provided email or try to resolve from recipient name
    const emailAddress = command.email || this.resolveEmailAddress(command.recipient);
    if (!emailAddress) {
      return {
        success: false,
        message: `Please provide an email address for ${command.recipient}. Example: "Send email to john@gmail.com"`
      };
    }

    try {
      const subject = command.subject || `Message from Honig`;
      const body = this.generateEmailBody(command);

      await connectionsService.sendGmailMessage({
        to: emailAddress,
        subject: subject,
        body: body
      });

      return {
        success: true,
        message: `✅ Email sent to ${command.recipient} (${emailAddress}) with subject: "${subject}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to send email: ${errorMessage}`
      };
    }
  }

  private resolvePhoneNumber(recipientName: string): string {
    // In a real implementation, this would:
    // 1. Look up the contact in the user's WhatsApp contacts
    // 2. Use a contacts database
    // 3. Ask the user to provide the phone number
    
    // For demo purposes, return a placeholder
    return '+1234567890';
  }

  private resolveEmailAddress(recipientName: string): string | null {
    // In a real implementation, this would:
    // 1. Look up the contact in the user's Gmail contacts
    // 2. Use a contacts database
    // 3. Try common email patterns (firstname.lastname@domain.com)
    
    // For demo purposes, return null to force user to provide email
    return null;
  }

  private generateEmailBody(command: ParsedCommand): string {
    // Generate a basic email body based on the command
    // In a real implementation, this could be more sophisticated
    
    if (command.message) {
      return command.message;
    }

    return `Hello ${command.recipient},

I hope this email finds you well.

Best regards,
Sent via Honig AI Assistant`;
  }

  async processUserMessage(userInput: string): Promise<{ isAutomationCommand: boolean; result?: { success: boolean; message: string } }> {
    const command = await this.parseCommand(userInput);
    
    if (command.action === 'unknown' || command.confidence < 0.6) {
      return { isAutomationCommand: false };
    }

    const result = await this.executeCommand(command);
    return { isAutomationCommand: true, result };
  }
}

export const messageAutomationService = new MessageAutomationService();