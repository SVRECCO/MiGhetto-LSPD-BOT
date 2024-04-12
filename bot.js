const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ChannelType, PermissionFlagsBits, VoiceState, VoiceStateManager } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const axios = require('axios');
const moment = require('moment-timezone'); 
const clientId = 'CLIENT_HERE';
const token = 'TOKEN_HERE';
const roleIdToTag = 'ROLE_HERE';
const guildId = 'GUILD_HERE';


const headers = {
    Authorization: `Bot ${token}`,
};

const removeAllGuildCommands = async () => {
    try {
        const response = await axios.get(
            `https://discord.com/api/v9/applications/${clientId}/guilds/${guildId}/commands`,
            { headers }
        );

        const commandsToDelete = response.data;

        for (const command of commandsToDelete) {
            await axios.delete(
                `https://discord.com/api/v9/applications/${clientId}/guilds/${guildId}/commands/${command.id}`,
                { headers }
            );

            console.log(`Command deleted: ${command.name}`);
        }

        console.log('All old commands removed.');
    } catch (error) {
        console.error('Error removing old commands:', error.response.data);
    }
};

removeAllGuildCommands();

const commands = [
    {
      name: 'clock-in',
      description: 'Clock in as PD',
    },
    {
      name: 'clock-out',
      description: 'Clock out as PD',
    },
    {
      name: 'paperwork',
      description: 'Open the Police Paperwork Modal',
    },
    {
      name: 'stats',
      description: 'Display your stats',
    },
    {
      name: 'register',
      description: 'Register a user in the API',
      options: [
        {
          name: 'user',
          type: 6, 
          description: 'The user to register',
          required: true,
        },
      ],
    },
    {
      name: 'warrant',
      description: 'Issue a warrant for an individual',
      options: [
        {
          name: 'screenshot',
          description: 'The screenshot of the individual',
          type: 11, 
          required: true,
        },
        {
          name: 'id',
          description: 'The ID of the individual',
          type: 3, 
          required: true,
        },
        {
          name: 'reason',
          description: 'The reason for the warrant',
          type: 3, 
          required: true,
        },
        {
          name: 'reward',
          description: 'The reward for the warrant',
          type: 10, 
          required: true,
        },
      ],
    },
    {
      name: 'mugshot',
      description: 'Process a mugshot',
      options: [
        {
          name: 'screenshot',
          description: 'The screenshot of the mugshot',
          type: 11, 
          required: true,
        },
        {
          name: 'reason',
          description: 'The reason for the arrest?',
          type: 3, 
          required: true,
          choices: [
            { name: 'Caught robbing a store', value: 'Caught robbing a store' },
            { name: 'Caught robbing mini banks', value: 'Caught robbing mini banks' },
            { name: 'Caught robbing big bank', value: 'Caught robbing big bank' },
            { name: 'Caught speeding / civ threats', value: 'Caught speeding / civ threats' },
            { name: 'Cop Baiting', value: 'Cop Baiting' },
            { name: 'Attempted Murder on civ', value: 'Attempted Murder on civ' },
            { name: 'Murder on PD', value: 'Murder on PD' },
            { name: 'Assault on PD', value: 'Assault on PD' },
          ],
        },
      ],
    },
    {
      name: 'vote',
      description: 'Start a vote with custom buttons',
      options: [
        {
          name: 'title',
          type: 3, 
          description: 'The title of the vote',
          required: true,
        },
        {
          name: 'description',
          type: 3, 
          description: 'The description of the vote',
          required: true,
        },
      ],
    },
    {
      name: 'verify-stats',
      description: 'Verify the stats of a tagged user',
      options: [
        {
          name: 'user',
          type: 6,
          description: 'The user to verify stats for',
          required: true,
        },
      ],
    },
    {
      name: 'info',
      description: 'Show the stats of a targeted user',
      options: [
        {
          name: 'user',
          type: 6, 
          description: 'The user to retrieve stats for',
          required: true,
        },
      ],
    },
  ];

  const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});
const userData = {}; 
const APIuserData = {};
const timers = {}; 
let userStrikes = {};

const registerGlobalCommands = async () => {
    try {
        console.log('Started refreshing global (/) commands.');
        
        const rest = new REST({ version: '9' }).setToken(token);
        
        await rest.put(Routes.applicationCommands(clientId), {
            body: commands,
        });
        
        console.log('Successfully reloaded global (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    registerGlobalCommands();
});

const fetchUserDataFromAPI = async (discordId) => {
    try {
        const apiUrl = `https://api.svrecco.com:3000/api/PD/${discordId}`;
        const response = await axios.get(apiUrl);
        APIuserData[discordId] = response.data;
        console.log(`User data fetched for Discord ID ${discordId}:`, response.data);
    } catch (error) {
        console.error('Error fetching user data from the API:', error);
    }
};

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

const voiceChannelUsers = {};

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.member.id;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (oldChannelId && !newChannelId) {
    delete voiceChannelUsers[userId];
    console.log(`User ${userId} left voice channel ${oldChannelId}`);
  } else if (!oldChannelId && newChannelId) {
    voiceChannelUsers[userId] = newChannelId;
    console.log(`User ${userId} joined voice channel ${newChannelId}`);
  } else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
    voiceChannelUsers[userId] = newChannelId;
    console.log(`User ${userId} moved from voice channel ${oldChannelId} to ${newChannelId}`);
  }
});

client.on('guildMemberAdd', (member) => {
  console.log(`Member ${member.id} joined the guild`);
});

client.on('guildMemberRemove', (member) => {
  const userId = member.id;
  if (voiceChannelUsers[userId]) {
    delete voiceChannelUsers[userId];
    console.log(`Member ${userId} left the guild and was removed from voice channel`);
  } else {
    console.log(`Member ${userId} left the guild`);
  }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() && !interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
    const { commandName, options, user, guild } = interaction;
    const discordId = user.id;

    try {
        if (commandName === 'stats') {
            await fetchUserDataFromAPI(discordId);
        }

        if (commandName === 'register') {
            const requiredRoles = ['1076540420378603711', '1132235609772138517', '1098362701710893169', '1076550211087912960', '1128389456026685521'];
            const hasRequiredRole = interaction.member.roles.cache.some(role => requiredRoles.includes(role.id));
        
            if (!hasRequiredRole) {
              return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
        
            const taggedUser = interaction.options.getUser('user');
            const discordId = taggedUser.id;
        
            const apiUrl = `https://api.svrecco.com:3000/api/PD/${discordId}`;
        
            try {
              const response = await axios.get(apiUrl);
              if (response.status === 200) {
                interaction.reply({ content: `User <@${discordId}> already exists in the API.`, ephemeral: true });
              }
            } catch (error) {
              if (error.response && error.response.status === 404) {
                const newUserData = {
                  discordId,
                  policeRank: "Use /setrank",
                  discordName: taggedUser.username,
                  robberies: 0,
                  arrests: 0,
                  raids: 0,
                  timeAsPD: "00:00",
                  tickets: 0,
                  strikes: 0,
                  events: 0,
                };
        
                try {
                  await axios.post(apiUrl, newUserData);
                  interaction.reply({ content: `User <@${discordId}> registered successfully in the API.`, ephemeral: true });
                } catch (error) {
                  console.error('Error registering user in the API:', error);
                  interaction.reply({ content: 'An error occurred while registering the user.', ephemeral: true });
                }
              } else {
                console.error('Error checking user existence in the API:', error);
                interaction.reply({ content: 'An error occurred while checking user existence.', ephemeral: true });
              }
            }
          }

          if (commandName === 'info') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.roles.cache.has('1093774727769772032')) {
              return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
          
            const targetUser = interaction.options.getUser('user');
            const targetDiscordId = targetUser.id;
          
            try {
              await fetchUserDataFromAPI(targetDiscordId);
          
              const targetUserData = APIuserData[targetDiscordId];
          
              if (!targetUserData) {
                return interaction.reply({ content: 'No data found for the specified user.', ephemeral: true });
              }
          
              const formattedStats3 = `${targetUserData.robberies}`;
              const formattedStats4 = `${targetUserData.arrests}`;
              const formattedStats5 = `${targetUserData.raids}`;
              const formattedStats6 = `${targetUserData.timeAsPD}`;
              const formattedStats7 = `${targetUserData.tickets}`;
              const formattedStats8 = `${targetUserData.strikes}`;
              const formattedStats9 = `${targetUserData.events}`;
              
              const targetMember = guild.members.cache.get(targetDiscordId);
              const targetNickname = targetMember?.displayName || 'N/A';
              const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

              const joinedServerAt = moment(targetMember.joinedAt).tz('America/Chicago').format('MMMM D, YYYY');
              const joinedDiscordAt = moment(targetUser.createdAt).tz('America/Chicago').format('MMMM D, YYYY');

              const targetUserRoles = targetMember.roles.cache
                .filter(role => role.id !== guild.id)
                .map(role => role.toString())
                .join(', ');
          
              const infoEmbed = new EmbedBuilder()
                .setColor(0xec0c0d)
                .setAuthor({ name: 'MGRP PD', iconURL: 'https://techstarwebsolutions.com/Icons/LSPD.png', url: 'https://discord.js.org' })
                .setTitle(`__Statistics Report For ${targetNickname}__`)
                .setDescription('*Auto-generated by LSPD BOT version 2.0*')
                .addFields(
                  { name: '─────────────────────────────────', value: ' ', inline: false },
                  { name: '👮‍♂️ **Police Rank**', value: `🛡️‎ ‎${targetUserData?.policeRank || 'N/A'}`, inline: true },
                  { name: '⏰ **Time as PD** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats6}\``, inline: true },
                  { name: '─────────────────────────────────', value: ' ', inline: false },
                  { name: '🏦 **Robberies** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats3}\``, inline: true },
                  { name: ':police_car: **Arrests** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats4}\``, inline: true },
                  { name: ':crossed_swords: **Raids** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats5}\``, inline: true },
                  { name: '─────────────────────────────────', value: ' ', inline: false },
                  { name: ':tada: **Events** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats9}\``, inline: true },
                  { name: ':ticket: **Tickets** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats7}\``, inline: true },
                  { name: ':anger: **Strikes** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats8}\``, inline: true },
                  { name: '─────────────────────────────────', value: ' ', inline: false },
                  { name: '📅 **Joined Server**', value: `⏳‎ ‎${joinedServerAt}`, inline: true },
                  { name: '📆 **Joined Discord**', value: `⏳‎ ‎${joinedDiscordAt}`, inline: true },
                  { name: '─────────────────────────────────', value: ' ', inline: false },
                  { name: ' ', value: targetUserRoles || 'No roles', inline: false },
                  { name: '─────────────────────────────────', value: ' ', inline: false },
                )
                .setFooter({ text: `Time Stamp: ${currentDate}`, iconURL: 'https://techstarwebsolutions.com/Icons/CK.png' })
                .setThumbnail(`https://techstarwebsolutions.com/PD/${targetDiscordId}.png`);
          
              interaction.reply({ embeds: [infoEmbed], ephemeral: false });
            } catch (error) {
              console.error('Error retrieving user data:', error);
              interaction.reply({
                content: 'An error occurred while retrieving user data. Please try again later.',
                ephemeral: true,
              });
            }
          }

          if (commandName === 'vote') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.roles.cache.has('1093774727769772032')) {
              return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
          
            const voteTitle = interaction.options.getString('title');
            const voteDescription = interaction.options.getString('description');
          
            const voteEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle(voteTitle)
              .setDescription(voteDescription);
          
            const voteRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('vote_yes')
                  .setLabel('Yes')
                  .setStyle(ButtonStyle.Success)
                  .setEmoji('👍'),
                new ButtonBuilder()
                  .setCustomId('vote_no')
                  .setLabel('No')
                  .setStyle(ButtonStyle.Danger)
                  .setEmoji('👎')
              );
          
            await interaction.reply({ embeds: [voteEmbed], components: [voteRow] });
          
            const filter = (buttonInteraction) => buttonInteraction.customId.startsWith('vote_');
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 }); // Increased duration to 60 seconds
          
            const votes = new Map();
          
            collector.on('collect', async (buttonInteraction) => {
              const userId = buttonInteraction.user.id;
          
              if (votes.has(userId)) {
                await buttonInteraction.reply({ content: 'You have already voted.', ephemeral: true });
                return;
              }
          
              if (buttonInteraction.customId === 'vote_yes') {
                votes.set(userId, 'yes');
              } else if (buttonInteraction.customId === 'vote_no') {
                votes.set(userId, 'no');
              }
          
              const yesCount = Array.from(votes.values()).filter((vote) => vote === 'yes').length;
              const noCount = Array.from(votes.values()).filter((vote) => vote === 'no').length;
              const totalVotes = yesCount + noCount;
              const yesPercentage = Math.round((yesCount / totalVotes) * 100);
              const noPercentage = Math.round((noCount / totalVotes) * 100);
          
              const resultsEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Vote Results')
                .setDescription(`Total Votes: ${totalVotes}`)
                .addFields(
                  { name: `👍 Yes (${yesPercentage}%)`, value: `${yesCount} votes`, inline: true },
                  { name: `👎 No (${noPercentage}%)`, value: `${noCount} votes`, inline: true }
                );
          
              await interaction.editReply({ embeds: [resultsEmbed], components: [voteRow] });
            });
          
            collector.on('end', async (collected) => {
              const yesCount = Array.from(votes.values()).filter((vote) => vote === 'yes').length;
              const noCount = Array.from(votes.values()).filter((vote) => vote === 'no').length;
              const totalVotes = yesCount + noCount;
              const yesPercentage = totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0;
              const noPercentage = totalVotes > 0 ? Math.round((noCount / totalVotes) * 100) : 0;
          
              const finalEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Final Vote Results')
                .setDescription(`Total Votes: ${totalVotes}`)
                .addFields(
                  { name: `👍 Yes (${yesPercentage}%)`, value: `${yesCount} votes`, inline: true },
                  { name: `👎 No (${noPercentage}%)`, value: `${noCount} votes`, inline: true }
                );
          
              await interaction.editReply({ embeds: [finalEmbed], components: [] });
            });
          }

          if (commandName === 'verify-stats') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.roles.cache.has('1093774727769772032')) {
              return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
          
            const taggedUser = interaction.options.getUser('user');
          
            if (!taggedUser) {
              return interaction.reply({ content: 'Please provide a valid user to verify stats for.', ephemeral: true });
            }
          
            const channelId = '1223203489472053289';
            const channel = interaction.guild.channels.cache.get(channelId);
          
            if (!channel) {
              return interaction.reply({ content: 'The specified channel could not be found.', ephemeral: true });
            }
          
            channel.messages.fetch({ limit: 100 })
              .then(async (messages) => {
                let lastMessageId = messages.last().id;
                let allMessages = [...messages.values()];
          
                while (messages.size === 100) {
                  const nextMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
                  allMessages = [...allMessages, ...nextMessages.values()];
                  lastMessageId = nextMessages.last().id;
                  messages = nextMessages;
                }
          
                const filteredMessages = allMessages.filter((message) =>
                  message.mentions.users.has(taggedUser.id) || message.author.id === taggedUser.id
                );
          
                const messageCount = filteredMessages.length;
          
                const verifyEmbed = new EmbedBuilder()
                  .setColor('#00ff00')
                  .setTitle('Stats Verification')
                  .setDescription(`User: ${taggedUser}`)
                  .addFields(
                    { name: 'Channel', value: `<#${channelId}>` },
                    { name: 'Message Count', value: messageCount.toString() }
                  )
                  .setTimestamp();
          
                interaction.reply({ embeds: [verifyEmbed] });
              })
              .catch((error) => {
                console.error('Error fetching messages:', error);
                interaction.reply({ content: 'An error occurred while fetching messages.', ephemeral: true });
              });
          }

          if (commandName === 'mugshot') {
            const screenshot = interaction.options.getAttachment('screenshot');
            const reason = interaction.options.getString('reason');
          
            let coms = 0;
          
            switch (reason) {
              case 'Caught robbing a store':
                coms = 25;
                break;
              case 'Caught robbing mini banks':
                coms = 30;
                break;
              case 'Caught robbing big bank':
                coms = 35;
                break;
              case 'Caught speeding / civ threats':
                coms = 10;
                break;
              case 'Cop Baiting':
                coms = 35;
                break;
              case 'Attempted Murder on civ':
                coms = 20;
                break;
              case 'Murder on PD':
                coms = 35;
                break;
              case 'Assault on PD':
                coms = 20;
                break;
            }
          
            const mugshotEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('Mugshot')
              .setDescription(`Reason: ${reason}\nCommunity Service: ${coms} coms`)
              .setImage(screenshot.url)
              .setTimestamp();
          
              const userMentions = Object.keys(voiceChannelUsers)
              .map(userId => `<@${userId}>`)
              .join(' ');
          
            interaction.reply({ content: userMentions, embeds: [mugshotEmbed] });
          }

          if (commandName === 'warrant') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
              return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
          
            const screenshot = interaction.options.getAttachment('screenshot');
            const id = interaction.options.getString('id');
            const reason = interaction.options.getString('reason');
            const reward = interaction.options.getNumber('reward');
          
            if (!screenshot || !id || !reason || !reward) {
              return interaction.reply({ content: 'Please provide all required inputs.', ephemeral: true });
            }
          
            const targetRole = interaction.guild.roles.cache.get('1192047274948300871');
          
            if (!targetRole) {
              return interaction.reply({ content: 'Target role not found.', ephemeral: true });
            }
          
            const warrantEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('🚨 Wanted Poster 🚨')
              .setDescription(`Suspect ID: ${id}`)
              .addFields(
                { name: 'Wanted For', value: reason },
                { name: 'Reward', value: `$${reward.toLocaleString()}` }
              )
              .setImage(screenshot.url)
              .setTimestamp()
              .setFooter({ text: 'Issued by Los Santos County Sheriff' });
          
            interaction.reply({ content: `${targetRole}`, embeds: [warrantEmbed] });
          }

          if (commandName === 'paperwork') {
            const statOptions = new StringSelectMenuBuilder()
              .setCustomId('stat-select')
              .setPlaceholder('Select a stat')
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Arrests')
                  .setValue('arrests')
                  .setDescription('Add arrests to your stats')
                  .setEmoji('🚓'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Robberies')
                  .setValue('robberies')
                  .setDescription('Add robberies to your stats')
                  .setEmoji('💰'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Raids')
                  .setValue('raids')
                  .setDescription('Add raids to your stats')
                  .setEmoji('🏚️'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Tickets')
                  .setValue('tickets')
                  .setDescription('Add tickets to your stats')
                  .setEmoji('🎫')
              );
          
            const actionRow = new ActionRowBuilder().addComponents(statOptions);
          
            await interaction.reply({
              content: 'Please select a stat to add:',
              components: [actionRow],
              ephemeral: true,
            });
          }
          
          if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'stat-select') {
              const selectedStat = interaction.values[0];
              const quantityModal = new ModalBuilder()
                .setCustomId(`quantity-modal-${selectedStat}`)
                .setTitle(`Enter Quantity for ${selectedStat}`);
          
              const quantityInput = new TextInputBuilder()
                .setCustomId('quantity-input')
                .setLabel('Quantity')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter the quantity')
                .setRequired(true);
          
              const quantityActionRow = new ActionRowBuilder().addComponents(quantityInput);
              quantityModal.addComponents(quantityActionRow);
          
              await interaction.showModal(quantityModal);
            }
          }

          const spamLog = new Map();
          
          if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('quantity-modal-')) {
              const selectedStat = interaction.customId.split('-')[2];
              const quantity = parseInt(interaction.fields.getTextInputValue('quantity-input'));
              const discordId = interaction.user.id;
              const user = interaction.user;
              const guild = interaction.guild;
          
              if (quantity > 0) {
                userData[discordId][selectedStat] += quantity;
          
                let responseEmbed;
          
                if (selectedStat === 'tickets') {
                  responseEmbed = new EmbedBuilder()
                    .setColor('#ffbf00')
                    .setTitle('🎫 Tickets Added')
                    .setDescription(`Added ${quantity} ticket(s) to your stats. 🎉`)
                    .setThumbnail('https://techstarwebsolutions.com/Icons/ticket.png')
                    .setTimestamp()
                    .setFooter({ text: 'Use /stats to see your updated stats.' });
                } else {
                  const reviewChannelId = '1190185516356870174';
                  const logChannelId = '1227413736839581778';
          
                  if (quantity > 5) {
                    const roleToTag = guild.roles.cache.get('1093774727769772032');
          
                    if (roleToTag) {
                      const roleTag = roleToTag.toString();
                      const reviewChannel = guild.channels.cache.get(reviewChannelId);
          
                      if (reviewChannel) {
                        const reviewEmbed = new EmbedBuilder()
                          .setColor('#FF0000')
                          .setThumbnail(user.displayAvatarURL())
                          .setImage('https://techstarwebsolutions.com/Icons/warning.png')
                          .setTitle('🚨 **Alert** 🚨')
                          .addFields(
                            { name: '👤 User', value: `<@${user.id}>`, inline: true },
                            { name: '📊 Stat Added', value: selectedStat, inline: true },
                            { name: '❗ Reason', value: `Added ${quantity} ${selectedStat}, requires review.`, inline: false },
                            { name: '\u200B', value: `${roleTag}, please review the activity. 🔍`, inline: false }
                          );
          
                        const row = new ActionRowBuilder()
                          .addComponents(
                            new ButtonBuilder()
                              .setCustomId('strikeUser_' + user.id)
                              .setLabel('Strike User')
                              .setStyle(ButtonStyle.Danger)
                          );
          
                        await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
                      }
                    }
          
                    responseEmbed = new EmbedBuilder()
                      .setColor('#FF0000')
                      .setThumbnail('https://techstarwebsolutions.com/Icons/warning.png')
                      .setDescription(`**Added ${quantity} ${selectedStat} to your stats. ⚠️**`);
                  } else {
                    responseEmbed = new EmbedBuilder()
                      .setColor('#00FF00')
                      .setThumbnail('https://techstarwebsolutions.com/Icons/CK.png')
                      .setDescription(`**Added ${quantity} ${selectedStat} to your stats. ✅**`);
          
                    const logChannel = guild.channels.cache.get(logChannelId);
          
                    if (logChannel) {
                      const logEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('📝 Log')
                        .setDescription(`👤 User: <@${user.id}>\n📊 Stat: ${selectedStat}\n🔢 Quantity: ${quantity}\n⏰ Timestamp: ${new Date().toLocaleString()}`);
          
                      await logChannel.send({ embeds: [logEmbed] });
                    }
                  }
                }
          
                await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
              } else {
                await interaction.reply({
                  content: 'Invalid quantity. Please enter a positive value.',
                  ephemeral: true,
                });
              }
            }
          }

        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith('strikeUser_')) {
                const parts = customId.split('_');
                const userId = parts[1];

                userStrikes[userId] = userStrikes[userId] ? userStrikes[userId] + 1 : 1;

                const embedMessage = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('LSPD AutoMod')
                    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                    .setThumbnail('https://techstarwebsolutions.com/Icons/x.png')
                    .addFields(
                        { name: 'User', value: `<@${userId}>`, inline: true },
                        { name: 'Strike', value: `${userStrikes[userId]}`, inline: true },
                        { name: 'Reason', value: `Excessive Stat Logging` }
                    )
                    .setTimestamp();

                const targetChannel = await guild.channels.cache.get('1084572353431867392');
            
                const originalComponents = interaction.message.components;
                const updatedComponents = originalComponents.map(row => {
                    const newRow = new ActionRowBuilder();
                    newRow.addComponents(row.components.map(component => {
                        if (component.customId === interaction.customId) {
                            return new ButtonBuilder()
                                .setCustomId(component.customId)
                                .setLabel(component.label)
                                .setStyle(component.style)
                                .setDisabled(true);
                        }
                        return component;
                    }));
                    return newRow;
                });
        
                await interaction.update({ components: updatedComponents });

                if (targetChannel) {
                    await targetChannel.send({ embeds: [embedMessage] });

                    const member = await guild.members.fetch(userId);
                    if (member) {
                        if (userStrikes[userId] === 1) {
                            await member.roles.add('1081324548512829501'); 
                        } else if (userStrikes[userId] === 2) {
                            await member.roles.add('1081324591928049736'); 
                        } else if (userStrikes[userId] === 3) {
                            await member.roles.add('1081324635796283495'); 
                        }
                    } else {
                        console.log(`Member with ID ${userId} not found.`);
                    }
                } else {
                    console.log(`Channel with ID 1084572353431867392 not found.`);
                    await interaction.deferReply({ content: 'Error: Target channel not found.', ephemeral: true });
                }
            }
        }

        if (!userData[discordId]) {
            userData[discordId] = {
                policeRank: 'Use /setrank',
                discordName: 'N/A',
                robberies: 0,
                arrests: 0,
                raids: 0,
                strikes: 0,
                timeAsPD: '00:00',
                tickets: 0,
                hoursAsPD: 0,
                minutesAsPD: 0,
                events: 0,
            };
        }

        else if (commandName === 'clock-in') {
            if (interaction.channelId === '1187682053022547979' || interaction.channelId === '1187682880944603166') {
                if (!timers[discordId]) {
                    timers[discordId] = {
                        startTime: Date.now(),
                        timerInterval: setInterval(() => {
                            const currentTime = Date.now();
                            const elapsedTime = currentTime - timers[discordId].startTime;
                            userData[discordId].timeAsPD = formatTime(elapsedTime);
                        }, 1000),
                    };
                    const clockInEmbed = new EmbedBuilder()
                        .setColor('#00ff00') // Green color
                        .setTitle('Clock In')
                        .setDescription(`<@${user.id}> has clocked in!`)
                        .setThumbnail('https://techstarwebsolutions.com/Icons/clockin.png')
                        .setTimestamp();
                    interaction.reply({ embeds: [clockInEmbed] });
                } else {
                    const alreadyClockedInEmbed = new EmbedBuilder()
                        .setColor('#ff0000') 
                        .setTitle('Already Clocked In')
                        .setThumbnail('https://techstarwebsolutions.com/Icons/info2.png')
                        .setDescription('You are already clocked in!')
                        .setTimestamp();
                    interaction.reply({ embeds: [alreadyClockedInEmbed] });
                }
            } else {
                const wrongChannelEmbed = new EmbedBuilder()
                    .setColor('#ff0000') 
                    .setTitle('Wrong Channel')
                    .setDescription('You need to use the correct clock-in channel!')
                    .setThumbnail('https://techstarwebsolutions.com/Icons/info2.png')
                    .setTimestamp();
                interaction.reply({ embeds: [wrongChannelEmbed] });
            }
        } else if (commandName === 'clock-out') {
            if (interaction.channelId === '1187682053022547979' || interaction.channelId === '1187682880944603166') {
                if (timers[discordId]) {
                    clearInterval(timers[discordId].timerInterval);
                    const totalTime = userData[discordId].timeAsPD; 
                    delete timers[discordId];
                    const clockOutEmbed = new EmbedBuilder()
                        .setColor('#ff0000') // Red color
                        .setTitle('Clock Out')
                        .setThumbnail('https://techstarwebsolutions.com/Icons/clockout.png')
                        .addFields(
                            { name: 'Status', value: `<@${user.id}> has clocked out!`, inline: false },
                            { name: 'Time As PD', value: totalTime, inline: false },
                            { name: 'Next Steps', value: 'Use /stats to update data!', inline: false }
                        )
                        .setTimestamp();

                    interaction.reply({ embeds: [clockOutEmbed] });
                } else {
                    const notClockedInEmbed = new EmbedBuilder()
                        .setColor('#ff0000') 
                        .setTitle('Not Clocked In')
                        .setThumbnail('https://techstarwebsolutions.com/Icons/info2.png')
                        .setDescription('You are not currently clocked in!')
                        .setTimestamp();
                    interaction.reply({ embeds: [notClockedInEmbed] });
                }
            } else {
                const wrongChannelEmbed = new EmbedBuilder()
                    .setColor('#ff0000') 
                    .setTitle('Wrong Channel')
                    .setThumbnail('https://techstarwebsolutions.com/Icons/info2.png')
                    .setDescription('You need to use the correct clock-in channel!')
                    .setTimestamp();
                interaction.reply({ embeds: [wrongChannelEmbed] });
            }
        }
        
        else if (commandName === 'stats') {
          if (timers[discordId]) {
            interaction.reply({ content: 'You are currently clocked in. Please clock out before using /stats.', ephemeral: true });
            return;
          }
        
          const nickname = guild.members.cache.get(discordId)?.displayName || 'N/A';
          const currentDate = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
        
          const resetLocalUserData = () => {
            const currentPoliceRank = APIuserData[discordId]?.policeRank;
            userData[discordId] = {
              policeRank: currentPoliceRank,
              discordName: nickname,
              robberies: 0,
              arrests: 0,
              raids: 0,
              timeAsPD: '00:00',
              tickets: 0,
              strikes: 0,
              events: 0,
            };
          };
        
          function timeStringToMinutes(timeString) {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
          }
        
          function minutesToTimeString(minutes) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
          }
        
          const combinedRobberies = parseInt(userData[discordId].robberies) + (APIuserData[discordId]?.robberies ? parseInt(APIuserData[discordId]?.robberies) : 0);
          const combinedArrests = parseInt(userData[discordId].arrests) + (APIuserData[discordId]?.arrests ? parseInt(APIuserData[discordId]?.arrests) : 0);
          const combinedRaids = parseInt(userData[discordId].raids) + (APIuserData[discordId]?.raids ? parseInt(APIuserData[discordId]?.raids) : 0);
        
          const combinedTickets = parseInt(userData[discordId].tickets) + (APIuserData[discordId]?.tickets ? parseInt(APIuserData[discordId]?.tickets) : 0);
          const combinedStrikes = parseInt(userData[discordId].strikes) + (APIuserData[discordId]?.strikes ? parseInt(APIuserData[discordId]?.strikes) : 0);
          const combinedEvents = parseInt(userData[discordId].events) + (APIuserData[discordId]?.events ? parseInt(APIuserData[discordId]?.events) : 0);
        
          const apiTime = APIuserData[discordId].timeAsPD;
          const userTime = userData[discordId].timeAsPD;
        
          const apiTimeMinutes = timeStringToMinutes(apiTime);
          const userTimeMinutes = timeStringToMinutes(userTime);
          const combinedMinutes = apiTimeMinutes + userTimeMinutes;
        
          const combinedTimeAsPD = minutesToTimeString(combinedMinutes);
        
          userData[discordId].robberies = combinedRobberies;
          userData[discordId].arrests = combinedArrests;
          userData[discordId].raids = combinedRaids;
          userData[discordId].tickets = combinedTickets;
          userData[discordId].strikes = combinedStrikes;
          userData[discordId].events = combinedEvents;
        
          const formattedStats3 = `${combinedRobberies}`;
          const formattedStats4 = `${combinedArrests}`;
          const formattedStats5 = `${combinedRaids}`;
          const formattedStats6 = `${combinedTimeAsPD}`;
          const formattedStats7 = `${combinedTickets}`;
          const formattedStats8 = `${combinedStrikes}`;
          const formattedStats9 = `${combinedEvents}`;
        
          const member = guild.members.cache.get(discordId);

          const userRoles = member.roles.cache
            .filter(role => role.id !== guild.id)
            .map(role => role.toString())
            .join(', ');

          const joinedServerAt = moment(member.joinedAt).tz('America/Chicago').format('MMMM D, YYYY');
          const joinedDiscordAt = moment(user.createdAt).tz('America/Chicago').format('MMMM D, YYYY');

          const statsEmbed = new EmbedBuilder()
            .setColor(0xec0c0d)
            .setAuthor({ name: 'MGRP PD', iconURL: 'https://techstarwebsolutions.com/Icons/LSPD.png', url: 'https://discord.js.org' })
            .setTitle(`__Statistics Report For ${nickname}__`)
            .setDescription('*Auto-generated by LSPD BOT version 2.0*')
            .addFields(
              { name: '─────────────────────────────────', value: ' ', inline: false },
              { name: '👮‍♂️ **Police Rank**', value: `🛡️‎ ‎${APIuserData[discordId]?.policeRank || 'N/A'}`, inline: true },
              { name: '⏰ **Time as PD** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats6}\``, inline: true },
              { name: '─────────────────────────────────', value: ' ', inline: false },
              { name: '🏦 **Robberies** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats3}\``, inline: true },
              { name: ':police_car: **Arrests** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats4}\``, inline: true },
              { name: ':crossed_swords: **Raids** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats5}\``, inline: true },
              { name: '─────────────────────────────────', value: ' ', inline: false },
              { name: ':tada: **Events** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats9}\``, inline: true },
              { name: ':ticket: **Tickets** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats7}\``, inline: true },
              { name: ':anger: **Strikes** \u200B', value: `📋‎ ‎ **Total:**\`${formattedStats8}\``, inline: true },
              { name: '─────────────────────────────────', value: ' ', inline: false },
              { name: '📅 **Joined Server**', value: `⏳‎ ‎${joinedServerAt}`, inline: true },
              { name: '📆 **Joined Discord**', value: `⏳‎ ‎${joinedDiscordAt}`, inline: true },
              { name: '─────────────────────────────────', value: ' ', inline: false },
              { name: ' ', value: userRoles || 'No roles', inline: false },
              { name: '─────────────────────────────────', value: ' ', inline: false },
            )
            .setFooter({ text: `Time Stamp: ${currentDate}`, iconURL: 'https://techstarwebsolutions.com/Icons/CK.png' })
            .setThumbnail(`https://techstarwebsolutions.com/PD/${discordId}.png`);
        
          interaction.reply({ embeds: [statsEmbed], ephemeral: true });
        
          const apiUrl = `https://api.svrecco.com:3000/api/PD/${user.id}`;
        
          const userDataToSend = {
            discordId,
            policeRank: APIuserData[discordId]?.policeRank,
            discordName: nickname,
            robberies: combinedRobberies,
            arrests: combinedArrests,
            raids: combinedRaids,
            timeAsPD: combinedTimeAsPD,
            tickets: combinedTickets,
            strikes: combinedStrikes,
            events: combinedEvents,
          };
        
          axios.post(apiUrl, userDataToSend)
            .then(response => {
              console.log('User data sent to the API successfully:', response.data);
            })
            .catch(error => {
              console.error('Error sending user data to the API:', error);
            });
          resetLocalUserData();
        } else if (commandName === 'refresh') {
                interaction.reply({
                    content: 'Command received: starting refresh',
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error('Error processing command:', error);
            interaction.reply({
                content: 'An error occurred contact <@211748804746149888>',
                ephemeral: true,
            });
        }
    });
    
    client.login(token);