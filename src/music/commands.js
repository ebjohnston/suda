const { ApplicationCommandOptionType } = require('discord-api-types/v9')
const { 
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    joinVoiceChannel
 } = require('@discordjs/voice')

const { MusicSubscription } = require('./subscription.js')
const { YoutubeTrack } = require('./youtube.js')

const music_commands = [
    {
        name: 'youtube',
        description: 'plays music from youtube URL',
        options: [
            {
                name: 'url',
                type: ApplicationCommandOptionType.String,
                description: 'the youtube link for the song',
                required: true
            }
        ],
        process: async interaction => {
            pushMusicResource(interaction, async () => {
                try {
                    const url = interaction.options.getString('url')
                    const track = await YoutubeTrack.fromUrl(interaction, url)
                    console.log(`Youtube Track being queued is ${JSON.stringify(track)}`)

                    const youtubeResource = await track.createYoutubeResource()
                    await interaction.editReply(`Enqueued **${track.title}**`)
                    return youtubeResource
                } catch (error) {
                    console.warn(error);
                    await interaction.editReply('Failed to generate stream from YouTube, please try again later!')
                }
            })
        }
    },
    {
        name: 'skip',
        description: 'Skip to the next song in the queue',
        process: async interaction => {
            let subscription = subscriptions[interaction.guildId]

            if (subscription) {
                subscription.player.stop()
                await interaction.reply(`Skipped song!`)
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    },
    {
        name: 'queue',
        description: 'See the music queue',
        process: async interaction => {
            let subscription = subscriptions[interaction.guildId]

            if (subscription) {
                const current = subscription.player.state.status === AudioPlayerStatus.Idle
					? `Nothing is currently playing!`
					: `Playing **${subscription.player.state.resource.metadata.title}**`

			    const queue = subscription.queue
                    .slice(0, 5)
                    .map((resource, index) => `${index + 1}) ${resource.metadata.title}`)
                    .join('\n')

                await interaction.reply(`${current}\n\n${queue}`)
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    },
    {
        name: 'pause',
        description: 'Pauses the song that is currently playing',
        process: async interaction => {
            let subscription = subscriptions[interaction.guildId]

            if (subscription) {
                subscription.player.pause()
                await interaction.reply({ content: `Paused!`, ephemeral: true })
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    },
    {
        name: 'resume',
        description: 'Resume playback of the current song',
        process: async interaction => {
            let subscription = subscriptions[interaction.guildId]

            if (subscription) {
                subscription.player.unpause()
                await interaction.reply(`Unpaused!`)
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    },
    {
        name: 'leave',
        description: 'Leave the voice channel',
        process: async interaction => {
            let subscription = subscriptions[interaction.guildId]

            if (subscription) {
                subscription.connection.destroy()
                delete subscriptions[interaction.guildId]
                await interaction.reply(`Left channel!`)
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    },
];

// global for tracking map of guilds to subscriptions (enabled multiple instances)
const subscriptions = {}

async function pushMusicResource(interaction, getMusicResource) {
    await interaction.deferReply()

    let subscription = subscriptions[interaction.guildId]

    // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
    // and create a subscription.
    if (!subscription) {
        if (interaction.member && interaction.member.voice.channel) {
            const channel = interaction.member.voice.channel;
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            })
            subscription = new MusicSubscription(connection)
            subscription.connection.on('error', console.warn)
        }
        else {
            await interaction.editReply('Join a voice channel and then try that again!')
            return
        }
        subscriptions[interaction.guildId] = subscription
    }

    // Make sure the connection is ready before processing the user's request
    try {
        console.debug(`before voice connection status is ${subscription.connection.state.status}`)
        await entersState(subscription.connection, VoiceConnectionStatus.Ready, 20e3)
        console.debug(`after voice connection status is ${subscription.connection.state.status}`)
    } catch (error) {
        console.warn(error)
        await interaction.editReply(`Failed to join voice channel within 20 seconds, please try again later!`)
        return
    }

    try {
        subscription.enqueue(await getMusicResource())
    } catch (error) {
        console.warn(error);
        await interaction.editReply('Failed to queue track, please try again later!')
    }
}

module.exports = music_commands