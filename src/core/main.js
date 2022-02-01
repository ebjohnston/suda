const { token, plex } = require('../../settings.json')

const { buildCommands, deployCommands } = require('./command-builder.js')
const commands = buildCommands()
const deployments = {}

const { testPlexConnection } = require('../music/plex/api.js')

const { Client, Intents } = require('discord.js')
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] })

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`)

  if (plex.enable) {
    await testPlexConnection()
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() || !interaction.guildId) return

  // deploy commands for the first interaction on every server - this might require a forced deployment for the first time on a new server?
  if (!deployments[interaction.guildId]) {
    deployCommands(interaction)
    deployments[interaction.guildId] = true
    return
  }

  const command = commands.find(element => element.name === interaction.commandName)
  if (!command) return

  if (!command.process) {
    console.error(`${command.name} attempted to run without a process defined!`)
    interaction.reply(`${command.name} does not have a process defined! Please contact the owner of this bot.`)
    return
  }

  console.log(`processing command ${command.name}...`)

  try {
    command.process(interaction)
  } catch (error) {
    console.warn(error)
    interaction.reply(`${command.name} encountered an error while processing. Please try again.`)
  }
})

client.login(token)