import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config.js';

export class EmailNotifier {
  private transporter: Transporter | null = null;

  constructor() {
    if (config.smtp.host) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
      });
    }
  }

  async sendNotification(
    to: string,
    subject: string,
    body: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log(`[EmailNotifier] No SMTP configured. Would send to ${to}: ${subject}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        text: body,
      });
      return true;
    } catch (err) {
      console.error('[EmailNotifier] Failed to send email:', err);
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
      `[Agent Monitor] ${agentName} needs your attention`,
      `Agent "${agentName}" requires human interaction:\n\n${message}`,
    );
  }
}
