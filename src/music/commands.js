const { AudioPlayerStatus } = require('@discordjs/voice')

const { MusicSubscription } = require('./subscription.js')

const { music } = require('../../settings.json')

const { plex_commands } = require('./plex/commands.js')
const { youtube_commands } = require('./youtube/commands.js')

let music_commands = [
    {
        name: 'queue',
        description: 'See the music queue',
        process: async interaction => {
            let subscription = MusicSubscription.subscriptions[interaction.guildId]

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
        name: 'skip',
        description: 'Skip to the next song in the queue',
        process: async interaction => {
            let subscription = MusicSubscription.subscriptions[interaction.guildId]

            if (subscription) {
                subscription.player.stop()
                await interaction.reply(`Skipped song!`)
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    },
    {
        name: 'pause',
        description: 'Pauses the song that is currently playing',
        process: async interaction => {
            let subscription = MusicSubscription.subscriptions[interaction.guildId]

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
            let subscription = MusicSubscription.subscriptions[interaction.guildId]

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
            let subscription = MusicSubscription.subscriptions[interaction.guildId]

            if (subscription) {
                subscription.connection.destroy()
                delete MusicSubscription.subscriptions[interaction.guildId]
                await interaction.reply(`Left channel!`)
            } else {
                await interaction.reply(`Not playing in this server!`)
            }
        }
    }
]

if (plex_commands.length && music.plex) {
    music_commands = music_commands.concat(plex_commands)
}

if (youtube_commands.length && music.youtube) {
    music_commands = music_commands.concat(youtube_commands)
}

module.exports = {
    music_commands: music_commands
}