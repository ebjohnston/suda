const { ApplicationCommandOptionType } = require('discord-api-types/v9')
const { existsSync, readdirSync } = require('fs')

const core_commands = [
    {
        name: 'help',
        description: 'gets info for all bot commands',
        process: async interaction => {
            await interaction.reply('Help Reply!')
        }
    },
    {
        name: 'crypto',
        description: 'sends a complete discussion of cryptocurrency (et al)',
        process: async interaction => {
            // go up twice because this file is currently in src/core
            const directory = `${__dirname}/../../images`
        
            if (!existsSync(directory)) {
                interaction.reply(`Error - the images directory was not found! Make sure you have images in the images directory.`)
                return
            }

            const filenames = readdirSync(directory)
            console.debug(`filenames for image search: ${JSON.stringify(filenames)}`)
            const searchName = interaction.options.getString(`name`)
            console.debug(`parameter for image search: ${searchName}`)
            const foundImage = filenames.find(file => file.match(new RegExp("crypto", "i")))

            if (!foundImage) {
                interaction.reply({ content: `Error: crypto not found.`, ephemeral: true }).catch(console.warn)
                return
            }

            interaction.reply({ files: [`${directory}/${foundImage}`] })
        }
    },
    {
        name: 'img',
        description: 'sends an image from the server directory',
        options: [
            {
                name: 'name',
                type: ApplicationCommandOptionType.String,
                description: 'the name of the image file to embed (no extension)',
                required: true
            }
        ],
        process: async interaction => {
            // go up twice because this file is currently in src/core
            const directory = `${__dirname}/../../images`
        
            if (!existsSync(directory)) {
                interaction.reply(`Error - the images directory was not found! Make sure you have images in the images directory.`)
                return
            }

            const filenames = readdirSync(directory)
            console.debug(`filenames for image search: ${JSON.stringify(filenames)}`)
            const searchName = interaction.options.getString(`name`)
            console.debug(`parameter for image search: ${searchName}`)
            const foundImage = filenames.find(file => file.match(new RegExp(searchName, "i")))

            if (!foundImage) {
                interaction.reply({ content: `Error: image not found - please check the image name and try again.`, ephemeral: true }).catch(console.warn)
                return
            }

            interaction.reply({ files: [`${directory}/${foundImage}`] })
        }
    },
    {
        name: 'ping',
        description: 'responds pong, useful for checking if bot is alive.',
        help: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
        process: async interaction => {
            await interaction.reply('Pong!')
        }
    }
];

module.exports = {
    core_commands: core_commands
}