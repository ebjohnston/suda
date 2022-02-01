const { ApplicationCommandOptionType } = require('discord-api-types/v9')

const { MusicSubscription } = require('../subscription.js')

const { getSearchPage } = require('./api.js')
const { PlexTrack } = require('./track.js')

// global for tracking map of plex queries to subscriptions (enabled multiple instances)
const queries = {}

const plex_commands = [
    {
        name: 'plex',
        description: 'plays music from the plex media server',
        options: [
            {
                name: 'query',
                type: ApplicationCommandOptionType.String,
                description: 'the song to play on plex',
                required: true
            }
        ],
        process: async interaction => {
            const query = interaction.options.getString('query')

            const firstPage = await getSearchPage(query, 0)
            console.log(`result of firstPage: ${JSON.stringify(firstPage)}`)

            if (firstPage.size === 0) {
                interaction.reply(`No results found in Plex for search *${query}*`)
            }
            else if (firstPage.size === 1) {
                MusicSubscription.pushMusicResource(interaction, async () => {
                    const track = new PlexTrack(interaction, firstPage.Metadata[0])

                    const plexResource = await track.getPlexResource()
                    await interaction.editReply(`Enqueued **${track.artist} - ${track.title}**`)

                    return plexResource
                })
            }
            else {
                const tracks = firstPage.Metadata

                queries[interaction.guildId] = {
                    "query": query,
                    "tracks": tracks
                }

                let reply = `\n`
                tracks.forEach((value, index) => {
                    const track = new PlexTrack(interaction, value)
                    reply += `${(index + 1)}: ${track.artist} - ${track.title}\n`
                })
                interaction.reply(reply)
            }
        }
    }
]

module.exports = {
    plex_commands: plex_commands
}