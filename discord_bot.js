// import dependent modules
const Discord = require("discord.js");
const padEnd = require("string.prototype.padend");
const warframe = require ("./warframe.js");

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
    "help": {
        name: "help",
        description: "gets info for all bot commands",
        help: "use to get information about the usage and properties of different bot commands",
        suffix: true,
        usage: "[command]",
        process: (bot, msg, suffix) => {
            if (suffix) {
                sendCommandHelp(suffix, msg.channel);
            }
            else {
                sendCommandList(msg.channel);
            }
        }
    },
    "img": {
        name: "img",
        description: "sends an image from the server directory",
        help: "query ./images and post an image in chat if a match is found",
        suffix: true,
        usage: "[image name] -ext",
        process: (bot, msg, suffix) => {
            // msg.delete(); // warning: requires "Manage Messages" permission
            // msg.channel.sendFile("./images/praise.gif");

            msg.channel.sendMessage("img under construction. Sorry :c");
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
    "ping": {
        name: "ping",
        description: "responds pong, useful for checking if bot is alive.",
        help: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
        suffix: false,
        process: (bot, msg, suffix) => {
            msg.channel.sendMessage("pong");
        }
    }
}

bot.on("ready", () => {
    console.log("I am ready!");

    if (doWarframe) {
        warframe.scrapeWarframe(bot);
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

    var command_text = msg.content.split(" ")[0].substring(prefix.length).toLowerCase();
    var suffix = msg.content.substring(command_text.length + 2); //add one for the ! and one for the space

    var command = retrieveCommand(command_text).command;

    if (command) {
        command.process(bot, msg, suffix);

        if (!command.suffix && suffix) {
            msg.channel.sendMessage("```Note: " + command.name + " takes no arguments```");
        }
    }
});

function retrieveCommand(predicate) {
    var command = commands[predicate];
    var source = "main";

    if (!command && doWarframe && predicate.startsWith(settings.warframePrefix)) {
        var command = warframe.commands[predicate.substring(settings.warframePrefix.length)];
        var source = "warframe";
    }

    return { command, source };
}

function sendCommandList(channel) {
    var message = "**Generic Commands**\n```";
    for (var i in commands) {
        message += prefix + commands[i].name.padEnd(10) + " | " + commands[i].description + "\n";
    }
    message += "```";
    channel.sendMessage(message);

    message = "**Warframe Commands**\n```";
    for (var i in warframe.commands) {
        message += prefix + settings.warframePrefix + warframe.commands[i].name.padEnd(10) + " | " +
                    warframe.commands[i].description + "\n";
    }
    message += "```";
    channel.sendMessage(message);
}

function sendCommandHelp(suffix, channel) {
    info = retrieveCommand(suffix);
    command = info.command;
    source = info.source;

    if (!command) {
        channel.sendMessage("```I'm sorry, but I don't recognize that command. Please consult " + prefix + "help for a list of valid commands.```");
    }
    else {
        var message = "Information for command: **" + command.name + "**\n```";

        // include usage information
        message += "Usage: " + prefix;
        if (source === "warframe") {
            message += settings.warframePrefix;
        }
        message += command.name;
        if (command.suffix) {
            message += command.usage;
        }

        message += "\nDescription: " + command.help;
        if (command.admin) {
            message += "\nNote: This command is restricted to bot administrators";
        }
        message += "```";
        channel.sendMessage(message);
    }
}

// log in the bot
bot.login(settings.discordToken);
