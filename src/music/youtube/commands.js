const { ApplicationCommandOptionType } = require('discord-api-types/v9')
const { getInfo } = require('ytdl-core')

const { MusicSubscription } = require('../subscription.js')

const { YoutubeTrack } = require('./track.js')

// global for tracking map of plex queries to subscriptions (enabled multiple instances)
const queries = {}

const youtube_commands = [
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
            MusicSubscription.pushMusicResource(interaction, async () => {
                try {
                    const url = interaction.options.getString('url')
                    const info = await getInfo(url)
                    const title = info.videoDetails.title

                    const track = new YoutubeTrack(interaction, url, title)

                    const youtubeResource = await track.getYoutubeResource()
                    await interaction.editReply(`Enqueued **${track.title}**`)

                    return youtubeResource
                } catch (error) {
                    console.warn(error)
                    await interaction.editReply('Failed to generate stream from YouTube, please try again later!')
                }
            })
        }
    }
]

module.exports = {
    youtube_commands: youtube_commands
}