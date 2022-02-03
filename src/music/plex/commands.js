const { ApplicationCommandOptionType } = require('discord-api-types/v9')

const { MusicSubscription } = require('../subscription.js')

const { getSearchPage, testPlexConnection } = require('./api.js')
const { PlexTrack } = require('./track.js')

// global for tracking map of plex queries to subscriptions (enabled multiple instances)
const plexCache = {}

const plex_commands = [
    {
        name: 'plex',
        description: 'plays music from the plex media server',
        options: [
            {
                name: 'search',
                description: 'find a list of songs on plex matching the query; play the result if it is unique',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'query',
                        type: ApplicationCommandOptionType.String,
                        description: 'the song to play on plex',
                        required: true
                    }
                ],
                process: async interaction => {
                    await interaction.deferReply()

                    const query = interaction.options.getString('query')

                    const firstPage = await getSearchPage(query, 0)
                    console.log(`result of firstPage: ${JSON.stringify(firstPage)}`)

                    if (firstPage.size === 0) {
                        interaction.editReply(`No results found in Plex for search *${query}*`)
                    }
                    else if (firstPage.size === 1) {
                        MusicSubscription.pushMusicResource(interaction, async () => {
                            const track = new PlexTrack(interaction, firstPage.Metadata[0])
                            
                            if (track) {
                                const plexResource = await track.getPlexResource()
                                await interaction.editReply(`Enqueued **${track.artist} - ${track.title}**`)

                                return plexResource
                            }
                            else {
                                return null
                            }
                        })
                    }
                    else {
                        const tracks = firstPage.Metadata

                        plexCache[interaction.guildId] = {
                            "query": query,
                            "tracks": tracks
                        }

                        let reply = `\n`
                        tracks.forEach((value, index) => {
                            const track = new PlexTrack(interaction, value)

                            if (track) {
                                reply += `${(index + 1)}: ${track.artist} - ${track.album.title} - ${track.title}\n`
                            }
                        })
                        interaction.editReply(reply)
                    }
                }
            },
            {
                name: 'select',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'index',
                        type: ApplicationCommandOptionType.Integer,
                        description: 'the number of the song to play',
                        required: true
                    }
                ],
                description: 'play a plex song from the query list',
                process: async interaction => {
                    await interaction.deferReply()
                    
                    // array is 0-indexed but displayed options are 1-indexed
                    index = interaction.options.getInteger('index') - 1

                    cache = plexCache[interaction.guildId]
                    if (!cache) {
                        interaction.editReply(`No previous query found! Try searching for a song first.`)
                        return
                    }

                    track = cache.tracks[index]
                    if (!track) {
                        interaction.editReply(`Song not found with index ${index}. Please select another index and try again.`)
                        return
                    }

                    MusicSubscription.pushMusicResource(interaction, async () => {
                        const plexTrack = new PlexTrack(interaction, track)
                        
                        if (plexTrack) {
                            const plexResource = await plexTrack.getPlexResource()
                            await interaction.editReply(`Enqueued **${plexTrack.artist} - ${plexTrack.title}**`)

                            return plexResource
                        }
                        else {
                            return null
                        }
                    })
                }
            },
            {
                name: 'page',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'index',
                        type: ApplicationCommandOptionType.Integer,
                        description: 'the page number to display',
                        required: true
                    }
                ],
                description: 'display additional pages for many matching results',
                process: async interaction => {
                    await interaction.deferReply()

                    cache = plexCache[interaction.guildId]
                    // page number is 1-indexed but array is 0-indexed
                    index = interaction.options.getInteger('index') - 1

                    const page = await getSearchPage(cache.query, index)
                    

                    if (page.size === 0) {
                        interaction.editReply(`No results found for ${cache.query} page ${index + 1}`)
                    }
                    else {
                        const tracks = page.Metadata

                        let reply = `\n`
                        tracks.forEach((value, index) => {
                            const track = new PlexTrack(interaction, value)
                            reply += `${(index + 1)}: ${track.artist} - ${track.album.title} - ${track.title}\n`
                        })
                        interaction.editReply(reply)
                    }
                }
            },
        ]
    }
]

module.exports = {
    plex_commands: plex_commands
}