const { Routes } = require('discord-api-types/v9')

const { REST } = require('@discordjs/rest')
const { token, music } = require('../../settings.json')
const rest = new REST({ version: '9' }).setToken(token)

const { core_commands } = require('./commands.js')
const { music_commands } = require('../music/commands.js')
// const { poe_commands } = require('../path-of-exile/commands.js')

function buildCommands() {
    let commands = core_commands

    if (music_commands.length && music.enable) {
        commands = commands.concat(music_commands)
    }

    // if (poe_commands.length && modules.pathofexile) {
    //     commands = commands.concat(poe_commands)
    // }

    return commands
}

async function deployCommands(interaction) {
    console.log(`Deploying interactions for ${interaction.guild}...`)

    await interaction.deferReply()

    await interaction.editReply(`Deployment required for this server - overriding command. Please wait for this to finish.`)
    await deployCommandsDirect(interaction.client.application.id, interaction.guildId)

    await interaction.editReply('Deployment completed. Please try your command again.')
}

async function deployCommandsDirect(applicationId, guildId) {
    try {
        console.log('Started refreshing application (/) commands.')

        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: buildCommands() }
        );

        console.log('Successfully reloaded application (/) commands.')
    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    buildCommands: buildCommands,
    deployCommands: deployCommands
}