require('dotenv').config();
const required = n => { if (!process.env[n]) throw new Error(`Missing ${n}`); return process.env[n]; };
module.exports = {
  telegramToken: required('TELEGRAM_BOT_TOKEN'),
  discordToken: required('DISCORD_BOT_TOKEN'),
  guildId: required('DISCORD_GUILD_ID'),
  forumId: required('DISCORD_FORUM_CHANNEL_ID'),
  supportRoleId: process.env.DISCORD_SUPPORT_ROLE_ID || '',
  startNumber: Number(process.env.TICKET_START_NUMBER || 1000),
  maxLen: Number(process.env.MAX_MESSAGE_LENGTH || 1900)
};
