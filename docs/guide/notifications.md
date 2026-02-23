# Notifications

Agent Monitor can notify you when an agent needs human interaction (e.g., permission prompts). Two notification channels are supported: **Email** and **WhatsApp**.

## Email Notifications

Set an admin email when creating an agent to receive email notifications.

### Configuration

Configure SMTP via environment variables:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=agent-monitor@example.com
```

### Usage

When creating an agent, enter your email in the **Admin Email** field. The agent will send an email whenever it enters a `waiting_input` state.

## WhatsApp Notifications

WhatsApp notifications are sent via the [Twilio API](https://www.twilio.com/docs/whatsapp).

### Configuration

Set these environment variables to enable WhatsApp:

```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=+14155238886
```

### Usage

When creating an agent, enter your phone number (with country code, e.g. `+1234567890`) in the **WhatsApp Phone** field. The agent will send a WhatsApp message whenever it needs human interaction.

### Twilio Setup

1. Create a [Twilio account](https://www.twilio.com/try-twilio)
2. Enable the WhatsApp sandbox or register a WhatsApp sender
3. Note your Account SID and Auth Token from the Twilio Console
4. Set the environment variables listed above

## Using Both Channels

You can configure both email and WhatsApp for the same agent. When the agent needs attention, notifications will be sent through all configured channels simultaneously.
