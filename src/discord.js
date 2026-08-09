const {Client,GatewayIntentBits,ChannelType,PermissionsBitField,REST,Routes,SlashCommandBuilder,EmbedBuilder} = require('discord.js');
const cfg=require('./config'); const store=require('./store');
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
let forum,tags={}; const tickets=new Map(); const byThread=new Map(); const claims=new Map(); const priorities=new Map();
const parseTitle=n=>{const m=n.match(/ticket-(\d+)・tg-(-?\d+)/i);return m?{ticketNumber:+m[1],chatId:m[2]}:null};
async function setup(){
 forum=await client.channels.fetch(cfg.forumId); if(!forum || forum.type!==ChannelType.GuildForum) throw Error('DISCORD_FORUM_CHANNEL_ID must be a Forum Channel');
 for(const [name,key] of [['🆕 NEW','new'],['🔧 WORKING','working'],['🔒 CLOSED','closed']]){
   let t=forum.availableTags.find(x=>x.name===name);
   if(!t){ await forum.setAvailableTags([...forum.availableTags,{name}],`Create ${name} ticket tag`); forum=await client.channels.fetch(cfg.forumId); t=forum.availableTags.find(x=>x.name===name); }
   tags[key]=t;
 }
 store.init(cfg.startNumber);
 // Active posts are enough to reconstruct live Telegram mappings after restart.
 const active=await forum.threads.fetchActive();
 for(const th of active.threads.values()){ const p=parseTitle(th.name); if(!p) continue; const ticket={threadId:th.id,ticketNumber:p.ticketNumber,chatId:p.chatId,status:'active'}; tickets.set(p.chatId,ticket); byThread.set(th.id,ticket); }
}
function isStaff(member){return !!member && (member.permissions.has(PermissionsBitField.Flags.ManageThreads) || (cfg.supportRoleId && member.roles.cache.has(cfg.supportRoleId)));}
async function status(thread,key){ await thread.setAppliedTags([tags[key].id]); if(key==='closed'){await thread.setLocked(true).catch(()=>{});await thread.setArchived(true).catch(()=>{});} else {await thread.setLocked(false).catch(()=>{});await thread.setArchived(false).catch(()=>{});} }
async function createTicket(chatId,name,first){
 const n=store.allocate(); const title=`🎫・ticket-${n}・tg-${chatId}`;
 const content=`**Telegram Ticket #${n}**\n**User:** ${name||'Telegram user'}\n**Telegram Chat ID:** \`${chatId}\`\n\n━━━━━━━━━━━━━━━━━━━━\n\n${first?`**User:**\n${first}`:'_Ticket opened._'}`;
 const th=await forum.threads.create({name:title,message:{content},appliedTags:[tags.new.id],reason:`Telegram ticket #${n}`});
 const t={threadId:th.id,ticketNumber:n,chatId:String(chatId),status:'active'}; tickets.set(String(chatId),t);byThread.set(th.id,t);
 if(cfg.supportRoleId) await th.send(`<@&${cfg.supportRoleId}> 🆕 **New Telegram ticket #${n}**`).catch(()=>{});
 return t;
}
async function sendToThread(t,text,files=[]){const th=await client.channels.fetch(t.threadId);if(text) for(const c of split(text)) await th.send({content:c}); for(const f of files) await th.send({content:f.caption?`📎 ${f.caption}`:'📎 Telegram attachment',files:[f.url]});}
function split(s){const a=[];s=String(s||'');while(s.length>cfg.maxLen){let i=s.lastIndexOf('\n',cfg.maxLen);if(i<500)i=s.lastIndexOf(' ',cfg.maxLen);if(i<1)i=cfg.maxLen;a.push(s.slice(0,i));s=s.slice(i).trimStart();}if(s)a.push(s);return a;}
async function register(){const cmds=[new SlashCommandBuilder().setName('ticket').setDescription('Manage Telegram ticket').addSubcommand(s=>s.setName('close').setDescription('Close ticket')).addSubcommand(s=>s.setName('reopen').setDescription('Reopen ticket')).addSubcommand(s=>s.setName('claim').setDescription('Claim ticket')).addSubcommand(s=>s.setName('unclaim').setDescription('Unclaim ticket')).addSubcommand(s=>s.setName('priority').setDescription('Set priority').addStringOption(o=>o.setName('level').setRequired(true).addChoices({name:'Normal',value:'normal'},{name:'High',value:'high'},{name:'Urgent',value:'urgent'}))).addSubcommand(s=>s.setName('status').setDescription('Set status').addStringOption(o=>o.setName('status').setRequired(true).addChoices({name:'New',value:'new'},{name:'Working',value:'working'},{name:'Closed',value:'closed'}))).addSubcommand(s=>s.setName('info').setDescription('Ticket info'))].map(x=>x.toJSON());const rest=new REST({version:'10'}).setToken(cfg.discordToken);await rest.put(Routes.applicationGuildCommands(client.user.id,cfg.guildId),{body:cmds});}
client.once('ready',async()=>{console.log(`Discord: ${client.user.tag}`);await setup();await register();console.log(`Active tickets loaded: ${tickets.size}`);});
client.on('messageCreate',async m=>{try{if(m.author.bot||!m.guild)return;const t=byThread.get(m.channelId);if(!t||!isStaff(m.member))return;if((m.channel.appliedTags||[]).includes(tags.new.id)) await status(m.channel,'working');client.emit('staffReply',{ticket:t,message:m});}catch(e){console.error(e);}});
client.on('interactionCreate',async i=>{try{if(!i.isChatInputCommand()||i.commandName!=='ticket')return;if(!isStaff(i.member))return i.reply({content:'You do not have ticket staff permissions.',ephemeral:true});const t=byThread.get(i.channelId);if(!t)return i.reply({content:'Use this inside a Telegram ticket.',ephemeral:true});const s=i.options.getSubcommand();
 if(s==='close'){await status(i.channel,'closed');t.status='closed';tickets.delete(t.chatId);client.emit('ticketClosed',t);return i.reply(`🔒 Ticket #${t.ticketNumber} closed.`)}
 if(s==='reopen'){await status(i.channel,'working');t.status='active';tickets.set(t.chatId,t);return i.reply(`🔧 Ticket #${t.ticketNumber} reopened.`)}
 if(s==='claim'){claims.set(t.threadId,i.user.id);return i.reply(`👤 <@${i.user.id}> claimed ticket #${t.ticketNumber}.`)}
 if(s==='unclaim'){claims.delete(t.threadId);return i.reply(`👤 Ticket #${t.ticketNumber} is unclaimed.`)}
 if(s==='priority'){const p=i.options.getString('level');priorities.set(t.threadId,p);return i.reply(`⚑ Ticket #${t.ticketNumber}: **${p}** priority.`)}
 if(s==='status'){const x=i.options.getString('status');await status(i.channel,x);if(x==='closed'){t.status='closed';tickets.delete(t.chatId);client.emit('ticketClosed',t)}else{t.status='active';tickets.set(t.chatId,t)}return i.reply(`Ticket #${t.ticketNumber}: **${x}**.`)}
 if(s==='info'){const e=new EmbedBuilder().setTitle(`Ticket #${t.ticketNumber}`).addFields({name:'Telegram Chat ID',value:`\`${t.chatId}\``,inline:true},{name:'Priority',value:priorities.get(t.threadId)||'normal',inline:true},{name:'Claimed by',value:claims.has(t.threadId)?`<@${claims.get(t.threadId)}>`:'Unclaimed',inline:true});return i.reply({embeds:[e],ephemeral:true})}
}catch(e){console.error(e);if(!i.replied)await i.reply({content:'Ticket command failed.',ephemeral:true}).catch(()=>{});}});
module.exports={client,start:()=>client.login(cfg.discordToken),createTicket,sendToThread,getActive:chatId=>tickets.get(String(chatId))};
