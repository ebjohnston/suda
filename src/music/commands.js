const { ApplicationCommandOptionType } = require('discord-api-types/v9')
const { entersState, joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice')

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
                    await interaction.editReply(`Enqueued **${track.title}**`);
                    return youtubeResource
                } catch (error) {
                    console.warn(error);
                    await interaction.editReply('Failed to generate stream from YouTube, please try again later!');
                }
            })
        }
    },
    {
        name: 'skip',
        description: 'Skip to the next song in the queue',
    },
    {
        name: 'queue',
        description: 'See the music queue',
    },
    {
        name: 'pause',
        description: 'Pauses the song that is currently playing',
    },
    {
        name: 'resume',
        description: 'Resume playback of the current song',
    },
    {
        name: 'leave',
        description: 'Leave the voice channel',
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