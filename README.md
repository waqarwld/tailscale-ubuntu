# Telegram → Discord Ticket Bridge — Final

A database-free support system where **every Telegram ticket becomes a new Discord Forum post**. Staff work from Discord; Telegram users stay in Telegram.

## Architecture

`telegram-tickets` is a **Discord Forum Channel**. Each ticket is one Forum post/thread. Status is represented by tags:

- 🆕 NEW
- 🔧 WORKING
- 🔒 CLOSED

Discord cannot nest threads inside threads, so a Forum Channel is the correct layout for the requested design.

## Behavior

- Every time a user presses **Open Ticket**, a NEW ticket is created.
- Previous tickets are never reused.
- Telegram text/media → its Discord ticket.
- Staff text/attachments → Telegram.
- First staff reply changes NEW → WORKING automatically.
- `/ticket close` closes, locks and archives the Forum post and tells Telegram the ticket is closed.
- `/ticket reopen` reopens it as WORKING.
- `/ticket claim`, `/ticket unclaim`, `/ticket priority`, `/ticket status`, `/ticket info` are available to staff.
- No customer database. The only persistent local state is a numeric ticket counter (`runtime/counter.json`).
- Active ticket mappings are rebuilt from active Discord Forum posts after restart.
- Closed tickets remain in Discord as the archive.

## Requirements

- Node.js 20+
- Telegram bot token from @BotFather
- Discord application/bot
- Discord server with Community enabled
- Discord Forum Channel

## Discord setup

1. Enable Community.
2. Create category `SUPPORT`.
3. Create Forum Channel `telegram-tickets` under it.
4. Add tags exactly: `🆕 NEW`, `🔧 WORKING`, `🔒 CLOSED`.
5. Create a `Support` role and give it to staff.
6. Invite the bot with permissions to view/send messages, send messages in threads, create public threads, manage threads, read history, attach files, and embed links.
7. Enable **Message Content Intent** in Developer Portal.

## Environment

Copy `.env.example` to `.env` and fill the values.

`DISCORD_SUPPORT_ROLE_ID` is optional. If set, new tickets mention that role.

## Local installation

```bash
npm install
npm start
```

## Security

Never share `.env`. Never commit it. If a Telegram or Discord token leaks, rotate it immediately.

Only members with the Support role or Manage Threads permission can execute ticket commands or have messages bridged from Discord to Telegram.

## VPS migration

1. Stop the laptop bot first.
2. Provision Ubuntu/Debian VPS.
3. Install Node.js 20+.
4. Copy the project to `/opt/telegram-discord-ticket-bridge` (do not copy `node_modules`).
5. Copy `.env` securely and copy `runtime/counter.json` if you want the same ticket sequence.
6. Run `npm install`.
7. Test with `npm start`.
8. Create a systemd service so it starts on boot and restarts automatically.

Example `/etc/systemd/system/telegram-discord-ticket.service`:

```ini
[Unit]
Description=Telegram Discord Ticket Bridge
After=network.target

[Service]
Type=simple
User=ticketbot
WorkingDirectory=/opt/telegram-discord-ticket-bridge
ExecStart=/usr/bin/node /opt/telegram-discord-ticket-bridge/src/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now telegram-discord-ticket.service
sudo journalctl -u telegram-discord-ticket.service -f
```

### Important

Do not run the laptop copy and VPS copy simultaneously. Telegram long polling should have one active consumer for the bot's updates.

## Production checklist

- [ ] Tokens stored only in `.env`
- [ ] Support role configured
- [ ] Message Content Intent enabled
- [ ] Forum tags created with exact names
- [ ] Bot permissions tested
- [ ] Telegram → Discord tested
- [ ] Discord → Telegram tested
- [ ] New ticket after closing tested
- [ ] Close/reopen tested
- [ ] Media tested
- [ ] VPS systemd service tested
- [ ] Laptop bot stopped before VPS starts
