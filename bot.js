const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const axios = require('axios');
const moment = require('moment-timezone');
const clientId = '1188669847991763094';
const token = 'MTE4ODY2OTg0Nzk5MTc2MzA5NA.GpzO9d.H1P0DeyD8L8G6F_-WtWiTojf470raK0U-tq9cM';
const roleIdToTag = '1093774727769772032';
const guildId = '1076537982212911234';

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
        name: 'arrest',
        description: 'Add an arrest to your stats',
        options: [
            {
                name: 'add',
                type: 4,
                description: 'Number of arrests to add',
                required: true,
            },
        ],
    },
    {
        name: 'stats',
        description: 'Display your stats',
    },
    {
        name: 'ticket',
        description: 'Add tickets to your count',
        options: [
            {
                name: 'add',
                type: 4,
                description: 'Number of tickets to add',
                required: true,
            },
        ],
    },
    {
        name: 'robbery', 
        description: 'Add a robbery to your stats',
        options: [
            {
                name: 'add',
                type: 4,
                description: 'Number of robberies to add',
                required: true,
            },
        ],
    },
    {
        name: 'raid',
        description: 'Add a raid to your stats',
        options: [
            {
                name: 'add',
                type: 4,
                description: 'Number of raids to add',
                required: true,
            },
        ],
    },
    {
        name: 'strike', 
        description: 'Add a strike to your stats',
        options: [
            {
                name: 'add',
                type: 4,
                description: 'Number of strikes to add',
                required: true,
            },
        ],
    },
    {
        name: 'events', 
        description: 'Add events to your stats',
        options: [
            {
                name: 'add',
                type: 4,
                description: 'Number of events to add',
                required: true,
            },
        ],
    },
    {
        name: 'clock-in',
        description: 'Clock in as PD',
    },
    {
        name: 'clock-out',
        description: 'Clock out as PD',
    },
    {
        name: 'refresh', 
        description: 'Refresh Data',
    },
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});
const userData = {}; 
const APIuserData = {};
const timers = {}; 

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

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName, options, user, guild } = interaction;
    const discordId = user.id;

    try {
        if (commandName === 'stats') {
            await fetchUserDataFromAPI(discordId);
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

        if (commandName === 'ticket') {
            const ticketValue = options.get('add')?.value || 0;

            if (ticketValue > 0) {
                userData[discordId].tickets += ticketValue;
                interaction.reply({ content: `Added ${ticketValue} ticket(s) to your stats.` });
            }
        }

        if (commandName === 'arrest' || commandName === 'robbery' || commandName === 'raid') {
            const statKey = commandName === 'robbery' ? 'robberies' : commandName + 's';
            const valueToAdd = options.get('add').value;
            userData[discordId][statKey] += valueToAdd;

            const reviewChannelId = '1190185516356870174';

            if (valueToAdd > 5) {
                const roleToTag = guild.roles.cache.get(roleIdToTag);

                if (roleToTag) {
                    const roleTag = roleToTag.toString();

                    const reviewChannel = guild.channels.cache.get(reviewChannelId);
                    if (reviewChannel) {
                        reviewChannel.send(`User <@${user.id}> used the command /${commandName} and added ${valueToAdd} ${commandName}s. ${roleTag} to review.`);
                    }
                }
            }

            interaction.reply({ content: `Added ${valueToAdd} ${commandName}s to your stats.`, ephemeral: true });
        } else if (commandName === 'setrank') {
            const newRank = options.get('rank').value;

            if (!newRank) {
                interaction.reply({ content: `Available ranks: ${ranks.join(', ')}`, ephemeral: true });
            }

            if (!ranks.includes(newRank)) {
                interaction.reply({ content: 'Invalid rank. Please choose a valid rank from the list.', ephemeral: true });
            }

            userData[discordId].policeRank = newRank;
            interaction.reply({ content: `Your police rank has been set to ${newRank}.`, ephemeral: true });
        } else if (commandName === 'strike') {
            const strikesToAdd = options.get('add').value;

            if (strikesToAdd > 0) {
                userData[discordId].strikes += strikesToAdd;
                interaction.reply({ content: `Added ${strikesToAdd} strike(s) to your stats.`, ephemeral: true });
            }
        } else if (commandName === 'events') {
            const eventsToAdd = options.get('add').value;

            if (eventsToAdd > 0) {
                userData[discordId].events += eventsToAdd;
                interaction.reply({ content: `Added ${eventsToAdd} event(s) to your stats.`, ephemeral: true });
            }
        } else if (commandName === 'clock-in') {
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
                    interaction.reply({ content: `<@${user.id}> has clocked in!` });
                } else {
                    interaction.reply({ content: 'You are already clocked in!' });
                }
            } else {
                interaction.reply({ content: 'You need to use the correct clock-in channel!' });
            }
        } else if (commandName === 'clock-out') {
            if (interaction.channelId === '1187682053022547979' || interaction.channelId === '1187682880944603166') {
                if (timers[discordId]) {
                    clearInterval(timers[discordId].timerInterval);
                    delete timers[discordId];
                    interaction.reply({ content: `<@${user.id}> has clocked out! Time As PD: ${userData[discordId].timeAsPD} use /stats to update data!` });
                } else {
                    interaction.reply({ content: 'You are not currently clocked in!' });
                }
            } else {
                interaction.reply({ content: 'You need to use the correct clock-in channel!' });
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
            
            const formattedStats = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${APIuserData[discordId]?.policeRank}`;
            const formattedStats2 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎<@${discordId}>`;
            const formattedStats3 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${combinedRobberies}`;
            const formattedStats4 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${combinedArrests}`;
            const formattedStats5 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${combinedRaids}`;
            const formattedStats6 = `${combinedTimeAsPD}`;
            const formattedStats7 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${combinedTickets}`;
            const formattedStats8 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${combinedStrikes}`;
            const formattedStats9 = `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎${combinedEvents}`;
            
            
            
            const exampleEmbed = new EmbedBuilder()
            .setColor(0xec0c0d)
            .setAuthor({ name: 'MGRP PD', iconURL: 'https://techstarwebsolutions.com/Icons/LSPD.png', url: 'https://discord.js.org' })
            .setTitle(`__Statistics Report For ${nickname}__`)
            .setDescription('*Auto-generated by LSPD BOT version 1.0*')
            .addFields(
                { name: '─────────────────────────────────', value: '\u200B', inline: false },
                { name: '👮 ** Discord Name ** 👮 ', value: formattedStats2, inline: true },
                { name: '🛡️ ** Police Rank ** 🛡️ ', value: formattedStats, inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '🏦 ** Robberies ** 🏦', value: formattedStats3, inline: true },
                { name: ':police_car: ** Arrests ** :police_car:', value: formattedStats4, inline: true },
                { name: ':crossed_swords: ** Raids ** :crossed_swords:', value: formattedStats5, inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: ':tada: ** Events ** :tada:', value: formattedStats9, inline: true },
                { name: ':ticket: ** Tickets ** :ticket: ', value: formattedStats7, inline: true },
                { name: ':anger: ** Strikes ** :anger:', value: formattedStats8, inline: true },
                { name: '─────────────────────────────────', value: '\u200B', inline: false },
                { name: '⏰ ** Time as PD ** ⏰ ', value: formattedStats6, inline: false },
                )
                .setFooter({ text: `Time Stamp: ${currentDate}`, iconURL: 'https://techstarwebsolutions.com/Icons/CK.png' })
                .setThumbnail(`https://techstarwebsolutions.com/PD/${discordId}.png`);
                
                interaction.reply({ embeds: [exampleEmbed], ephemeral: true });
                
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
                content: 'An error occurred while processing your command.',
                ephemeral: true,
            });
        }
    });
    
    client.login(token);