# Notifications

Agent Monitor can notify you when an agent needs human interaction (e.g., permission prompts, errors, or waiting for input). Three notification channels are supported: **Email**, **WhatsApp**, and **Slack**.

## Email Notifications

Email notifications are sent via SMTP using [nodemailer](https://nodemailer.com/).

### Configuration

Add the following environment variables to your `.env` file (copy from `.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | Yes | _(none)_ | SMTP server hostname (e.g., `smtp.gmail.com`, `smtp.mailgun.org`, `smtp.qq.com`) |
| `SMTP_PORT` | No | `587` | SMTP server port. Use `587` for STARTTLS, `465` for TLS |
| `SMTP_SECURE` | No | `false` | Set to `true` for port 465 (direct TLS), `false` for port 587 (STARTTLS) |
| `SMTP_USER` | Yes | _(none)_ | SMTP authentication username (usually your email address) |
| `SMTP_PASS` | Yes | _(none)_ | SMTP authentication password. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) |
| `SMTP_FROM` | No | `agent-monitor@localhost` | "From" address shown in notification emails |

If `SMTP_HOST` is not set, email notifications are disabled and events are logged to the server console instead.

Example `.env` configuration:

```bash
# Gmail example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=agent-monitor@gmail.com

# QQ Mail example
# SMTP_HOST=smtp.qq.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=you@qq.com
# SMTP_PASS=your-authorization-code
# SMTP_FROM=you@qq.com

# Mailgun example
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=postmaster@your-domain.mailgun.org
# SMTP_PASS=your-mailgun-password
# SMTP_FROM=agent-monitor@your-domain.com
```

### Gmail Setup

1. Enable [2-Step Verification](https://myaccount.google.com/security) on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords) (select "Mail" as the app)
3. Use the 16-character App Password as `SMTP_PASS` (not your regular Gmail password)

### Usage

When creating an agent, enter your email in the **Admin Email** field. The agent will send an email whenever it enters a `waiting_input` state.

## WhatsApp Notifications

WhatsApp notifications are sent via the [Twilio API](https://www.twilio.com/docs/whatsapp).

### Configuration

Add the following environment variables to your `.env` file:

| Variable | Required | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Yes | Your Account SID from the [Twilio Console](https://console.twilio.com/) |
| `TWILIO_AUTH_TOKEN` | Yes | Your Auth Token from the Twilio Console |
| `TWILIO_WHATSAPP_FROM` | Yes | Your WhatsApp-enabled Twilio phone number (e.g., `+14155238886`) |

If any of these variables are missing, WhatsApp notifications are disabled and events are logged to the server console instead.

Example `.env` configuration:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=+14155238886
```

### Twilio Setup

1. Create a [Twilio account](https://www.twilio.com/try-twilio)
2. From the Twilio Console, navigate to **Messaging > Try it out > Send a WhatsApp message**
3. Follow the instructions to join the WhatsApp sandbox (send a message from your phone to the Twilio number)
4. Note your **Account SID** and **Auth Token** from the [Twilio Console dashboard](https://console.twilio.com/)
5. Set the environment variables listed above
6. For production use, register a WhatsApp sender through Twilio instead of using the sandbox

### Usage

When creating an agent, enter your phone number (with country code, e.g. `+1234567890`) in the **WhatsApp Phone** field. The agent will send a WhatsApp message whenever it needs human interaction.

## Slack Notifications

Slack notifications are sent via [Incoming Webhooks](https://api.slack.com/messaging/webhooks).

### Configuration

Add the following environment variable to your `.env` file:

| Variable | Required | Description |
|---|---|---|
| `SLACK_WEBHOOK_URL` | No | Default Slack Incoming Webhook URL for notifications |

If `SLACK_WEBHOOK_URL` is not set globally, you can still configure a per-agent or per-pipeline webhook URL via the UI.

Example `.env` configuration:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Slack Setup

1. Go to your Slack workspace and open [Slack App Management](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. Name your app (e.g., "Agent Monitor") and select your workspace
4. Navigate to **Incoming Webhooks** and toggle it **On**
5. Click **Add New Webhook to Workspace** and select the channel for notifications
6. Copy the **Webhook URL** (starts with `https://hooks.slack.com/services/...`)
7. Set it as `SLACK_WEBHOOK_URL` in your `.env` file, or paste it into the **Slack Webhook URL** field when creating an agent

### Usage

You can configure Slack notifications in two ways:

- **Global default**: Set the `SLACK_WEBHOOK_URL` environment variable. All agents and the Agent Manager will use this webhook unless overridden.
- **Per-agent / per-pipeline**: When creating an agent or configuring the Agent Manager, enter a Slack Webhook URL in the corresponding field. This overrides the global default.

The agent will post a message to the configured Slack channel whenever it needs human interaction.

## Agent Manager (Pipeline) Notifications

The Agent Manager supports its own notification settings, separate from individual agent notifications. Configure these in **Agent Manager > Configure**:

| Field | Description |
|---|---|
| **Admin Email** | Email address to receive pipeline notifications |
| **WhatsApp Phone** | Phone number for WhatsApp pipeline notifications |
| **Slack Webhook URL** | Slack Incoming Webhook URL for pipeline notifications |
| **Stuck Agent Timeout** | Minutes before a `waiting_input` agent triggers a stuck notification (default: 5) |

The Agent Manager sends notifications for:

- **Stuck agents** — When an agent has been in `waiting_input` state longer than the timeout, the manager sends a notification. Duplicate notifications are suppressed until the timeout elapses again.
- **Failed tasks** — When a task transitions to `failed`, the manager notifies the admin immediately.
- **Pipeline complete** — When all tasks finish (completed or failed), the manager sends a summary and auto-stops. Agent worktrees are automatically cleaned up.

These notifications use the same SMTP, Twilio, and Slack infrastructure as individual agent notifications (see above for environment variable setup).

## Using Multiple Channels

You can configure any combination of Email, WhatsApp, and Slack for the same agent or for the Agent Manager. When attention is needed, notifications will be sent through all configured channels simultaneously.

## Troubleshooting

### Email not sending
- Check server logs for `[EmailNotifier]` messages
- Verify `SMTP_HOST` is reachable from your server (`telnet smtp.gmail.com 587`)
- For Gmail, make sure you're using an App Password, not your regular password
- For port 465, set `SMTP_SECURE=true`; for port 587, set `SMTP_SECURE=false`

### WhatsApp not sending
- Check server logs for `[WhatsAppNotifier]` messages
- Verify your Twilio credentials are correct
- Make sure the recipient has joined the Twilio WhatsApp sandbox (for sandbox mode)
- Ensure the phone number includes the country code (e.g., `+1` for US)

### Slack not sending
- Check server logs for `[SlackNotifier]` messages
- Verify the webhook URL starts with `https://hooks.slack.com/services/`
- Ensure the Slack app is still installed in your workspace
- Check that the webhook has not been revoked (regenerate if needed)
- Test the webhook manually: `curl -X POST -H 'Content-Type: application/json' -d '{"text":"test"}' YOUR_WEBHOOK_URL`
