// import dependent modules
const Discord = require("discord.js");
const padEnd = require("string.prototype.padend");
const warframe = require ("./warframe.js");

// initialize imported modules
const bot = new Discord.Client();

// configuration settings
const settings = require("./settings.json");
const prefix = settings.prefix;
const doWarframe = settings.warframe.doWarframe;
const images = settings.images;

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
        process: (bot, message, suffix) => {
            if (suffix) {
                sendCommandHelp(suffix, message.channel);
            }
            else {
                sendCommandList(message.channel);
            }
        }
    },
    "img": {
        name: "img",
        description: "sends an image from the server directory",
        help: "query ./images and post an image in chat if a match is found",
        suffix: true,
        usage: "[image name (no ext)]",
        process: (bot, message, suffix) => {
            var fs = require("fs");
            var path = require("path");

            fs.readdir(images.directory, function(error, contents) {
                for (var i = 0; i < contents.length; i++) {
                    for (var j = 0; j < images.extensions.length; j++) {
                        if (path.extname(contents[i]) === images.extensions[j]) {
                            //sends first extension match as only message
                            message.channel.send({files: [images.directory + "/" + suffix + images.extensions[j]]});
                        }
                    }
                }
            });
        }
    },
    "lenny": {
        name: "lenny",
        description: "( ͡° ͜ʖ ͡°)",
        help: "displays the Unicode emoticon ( ͡° ͜ʖ ͡°) in place of the command",
        suffix: false,
        process: (bot, message, suffix) => {
            message.delete(); // warning: requires "Manage Messages" permission
            message.channel.send("( ° ͜ʖ ͡°)");
        }
    },
    "ping": {
        name: "ping",
        description: "responds pong, useful for checking if bot is alive.",
        help: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
        suffix: false,
        process: (bot, message, suffix) => {
            message.channel.send("pong");
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
bot.on("message", message => {

    /*
    // log non-DM messages
    if (settings.log_chat === true && message.channel.server) {
    var date = new Date();
    var dateString = d.toUTCString();
    ChatLog.log("info", dateString + ": " + message.channel.server.name + ", " + message.channel.name + ": " + message.author.username + " said <" + message + ">");
}
*/

// prevent the bot from "echoing" itself and other bots and ignore messages without prefix
if (message.author.bot || !message.content.startsWith(prefix)) {
    return;
}

// acknowledge that a message was received
console.log("message received: " + message);

var command_text = message.content.split(" ")[0].substring(prefix.length).toLowerCase();
var suffix = message.content.substring(command_text.length + settings.prefix.length + 1); //add prefix and space

var command = retrieveCommand(command_text).command;

if (command) {
    command.process(bot, message, suffix);

    if (!command.suffix && suffix) {
        message.channel.send("```Note: " + command.name + " takes no arguments```");
    }
}
});

function retrieveCommand(predicate) {
    var command = commands[predicate];
    var source = "main";

    if (!command && doWarframe && predicate.startsWith(settings.warframe.prefix)) {
        var command = warframe.commands[predicate.substring(settings.warframe.prefix.length)];
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
    channel.send(message);

    message = "**Warframe Commands**\n```";
    for (var i in warframe.commands) {
        message += prefix + settings.warframe.prefix + warframe.commands[i].name.padEnd(10) + " | " +
        warframe.commands[i].description + "\n";
    }
    message += "```";
    channel.send(message);
}

function sendCommandHelp(suffix, channel) {
    info = retrieveCommand(suffix);
    command = info.command;
    source = info.source;

    if (!command) {
        channel.send("```I'm sorry, but I don't recognize that command. Please consult " + prefix + "help for a list of valid commands.```");
    }
    else {
        var message = "Information for command: **" + command.name + "**\n```";

        // include usage information
        message += "Usage: " + prefix;
        if (source === "warframe") {
            message += settings.warframe.prefix;
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
        channel.send(message);
    }
}

// log in the bot
bot.login(settings.discordToken);
