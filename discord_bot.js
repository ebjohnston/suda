// import dependent modules
const Discord = require("discord.js");
const Warframe = require ("./warframe.js");

// initialize imported modules
const bot = new Discord.Client();

// configuration settings
const settings = require("./settings.json");
const prefix = settings.commandPrefix;
const doWarframe = settings.enableWarframe;

// logging utilities
//const ChatLog = require("./runtime/logger.js").ChatLog;
//const Logger = require("./runtime/logger.js").Logger;

/*
    List of command properties
    -name
    -description
    -suffix
    -usage (NOTE: implied [No Parameters] if !suffix)
    -help
    -admin
    -timeout (in seconds)
    -warframe
    -process (lambda)
*/

var commands = {
    "ping": {
        name: "ping",
        description: "responds pong, useful for checking if bot is alive.",
        help: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
        suffix: false,
        process: (bot, msg, suffix) => {
            msg.channel.sendMessage("pong");
        }
    },
    "lenny": {
        name: "lenny",
        description: "( ͡° ͜ʖ ͡°)",
        help: "displays the Unicode emoticon ( ͡° ͜ʖ ͡°) in place of the command",
        suffix: false,
        process: (bot, msg, suffix) => {
            msg.delete(); // warning: requires "Manage Messages" permission
            msg.channel.sendMessage("( ° ͜ʖ ͡°)");
        }
    },
    "img": {
        name: "img",
        description: "Send an image from the server directory",
        help: "query ./images and post an image in chat if a match is found",
        suffix: true,
        usage: "[image name] -ext",
        process: (bot, msg, suffix) => {
            // msg.delete(); // warning: requires "Manage Messages" permission
            // msg.channel.sendFile("./images/praise.gif");

            msg.channel.sendMessage("img under construction. Sorry :c");
        }
    }
}

bot.on("ready", () => {
    console.log("I am ready!");

    if (doWarframe) {
        Warframe.scrapeWarframe(bot);
    }
});

bot.on("disconnected", () => {
    //Logger.log("error", "Disconnected!");
    process.exit(0); // exit node.js without an error as this is almost always intentional
});

/*
========================
Command interpeter.

This will check if given message will correspond to a command defined in the command variable.
This will work, so long as the bot isn"t overloaded or still busy.
========================
*/

// create an event listener for messages
bot.on("message", msg => {

/*
    // log non-DM messages
    if (settings.log_chat === true && msg.channel.server) {
        var date = new Date();
        var dateString = d.toUTCString();
        ChatLog.log("info", dateString + ": " + msg.channel.server.name + ", " + msg.channel.name + ": " + msg.author.username + " said <" + msg + ">");
    }
*/

    // prevent the bot from "echoing" itself and other bots and ignore messages without prefix
    if (msg.author.bot || !msg.content.startsWith(prefix)) {
        return;
    }

    // acknowledge that a message was received
    console.log("message received: " + msg);

    var command_text = msg.content.split(" ")[0].substring(1).toLowerCase();
    var suffix = msg.content.substring(command_text.length + 2); //add one for the ! and one for the space

    var command = commands[command_text];
    if (!command && doWarframe) {
        var command = Warframe.commands[command_text];
    }

    if (command) {
        command.process(bot, msg, suffix);

        if (!command.suffix && suffix) {
            msg.channel.sendMessage("```Note: " + command.name + " takes no arguments```");
        }
    }
});

// log in the bot
bot.login(settings.discordToken);
