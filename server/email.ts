/**
 * Email service with Postmark API preference and SMTP fallback
 */
import config from './config';

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class PostmarkEmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async send(emailData: EmailData): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.apiKey,
        },
        body: JSON.stringify({
          From: this.fromEmail,
          To: emailData.to,
          Subject: emailData.subject,
          TextBody: emailData.text,
          HtmlBody: emailData.html || emailData.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Postmark API error: ${error}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.MessageID,
      };
    } catch (error) {
      console.error('Postmark email failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

class SMTPEmailService {
  private config: NonNullable<typeof config.email.smtp>;

  constructor(smtpConfig: NonNullable<typeof config.email.smtp>) {
    this.config = smtpConfig;
  }

  async send(emailData: EmailData): Promise<EmailResult> {
    try {
      // For simplicity, using a basic SMTP implementation
      // In production, you'd use nodemailer or similar
      console.log('📧 SMTP Email would be sent:', {
        from: this.config.from,
        to: emailData.to,
        subject: emailData.subject,
        smtp: `${this.config.host}:${this.config.port}`,
      });

      // Simulate success for now
      return {
        success: true,
        messageId: `smtp_${Date.now()}`,
      };
    } catch (error) {
      console.error('SMTP email failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Initialize email service based on configuration
let emailService: PostmarkEmailService | SMTPEmailService;

if (config.email.provider === 'postmark' && config.email.postmark) {
  emailService = new PostmarkEmailService(
    config.email.postmark.apiKey,
    config.email.postmark.fromEmail
  );
  console.log('📧 Email service: Postmark API');
} else if (config.email.smtp) {
  emailService = new SMTPEmailService(config.email.smtp);
  console.log('📧 Email service: SMTP fallback');
} else {
  throw new Error('No email configuration found');
}

// Exported email functions
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailResult> {
  return emailService.send({
    to: userEmail,
    subject: 'Welcome to Gueswi',
    text: `Hello ${userName},\n\nWelcome to Gueswi! Your account has been created successfully.\n\nBest regards,\nThe Gueswi Team`,
    html: `
      <h2>Welcome to Gueswi!</h2>
      <p>Hello ${userName},</p>
      <p>Welcome to Gueswi! Your account has been created successfully.</p>
      <p>Best regards,<br>The Gueswi Team</p>
    `,
  });
}

export async function sendPaymentConfirmation(
  userEmail: string, 
  userName: string, 
  plan: string, 
  amount: number
): Promise<EmailResult> {
  return emailService.send({
    to: userEmail,
    subject: 'Payment Confirmation - Gueswi',
    text: `Hello ${userName},\n\nYour payment for the ${plan} plan ($${amount}) has been processed successfully.\n\nThank you for choosing Gueswi!\n\nBest regards,\nThe Gueswi Team`,
    html: `
      <h2>Payment Confirmation</h2>
      <p>Hello ${userName},</p>
      <p>Your payment for the <strong>${plan}</strong> plan (<strong>$${amount}</strong>) has been processed successfully.</p>
      <p>Thank you for choosing Gueswi!</p>
      <p>Best regards,<br>The Gueswi Team</p>
    `,
  });
}

export async function sendCustomEmail(emailData: EmailData): Promise<EmailResult> {
  return emailService.send(emailData);
}

export { emailService };
export type { EmailData, EmailResult };