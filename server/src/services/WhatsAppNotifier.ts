import { config } from '../config.js';

export class WhatsAppNotifier {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = config.whatsapp.accountSid;
    this.authToken = config.whatsapp.authToken;
    this.fromNumber = config.whatsapp.fromNumber;
  }

  async sendNotification(
    to: string,
    body: string,
  ): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.log(`[WhatsAppNotifier] No WhatsApp configured. Would send to ${to}: ${body}`);
      return false;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const params = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${this.fromNumber}`,
        Body: body,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[WhatsAppNotifier] Twilio API error:', response.status, errorBody);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[WhatsAppNotifier] Failed to send WhatsApp message:', err);
      return false;
    }
  }

  async notifyHumanNeeded(
    to: string,
    agentName: string,
    message: string,
  ): Promise<boolean> {
    return this.sendNotification(
      to,
      `[Agent Monitor] ${agentName} needs your attention:\n\n${message}`,
    );
  }
}
