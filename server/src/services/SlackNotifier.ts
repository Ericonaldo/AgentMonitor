import { config } from '../config.js';

export class SlackNotifier {
  private defaultWebhookUrl: string;

  constructor() {
    this.defaultWebhookUrl = config.slack.webhookUrl;
  }

  async sendNotification(
    body: string,
    webhookUrl?: string,
  ): Promise<boolean> {
    const url = webhookUrl || this.defaultWebhookUrl;
    if (!url) {
      console.log(`[SlackNotifier] No Slack webhook configured. Would send: ${body}`);
      return false;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: body }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[SlackNotifier] Slack webhook error:', response.status, errorBody);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[SlackNotifier] Failed to send Slack message:', err);
      return false;
    }
  }

  async notifyHumanNeeded(
    agentName: string,
    message: string,
    webhookUrl?: string,
  ): Promise<boolean> {
    return this.sendNotification(
      `[Agent Monitor] *${agentName}* needs your attention:\n\n${message}`,
      webhookUrl,
    );
  }
}
