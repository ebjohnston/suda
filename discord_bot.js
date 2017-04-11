// import dependent modules
const Discord = require("discord.js");
//const WarframeWorldState = require("warframe-worldstate-parser");

// initialize imported modules
const bot = new Discord.Client();
//const warframeWorld = new WarframeWorldState(json-data);

// configuration settings
const settings = require("./settings.json");
const prefix = settings.command_prefix;

// logging utilities
//const ChatLog = require("./runtime/logger.js").ChatLog;
//const Logger = require("./runtime/logger.js").Logger;

var commands = {
    "ping": {
        name: "ping",
        description: "Responds pong, useful for checking if bot is alive.",
        extendedhelp: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
        process: function(bot, msg, suffix) {
            msg.channel.sendMessage("pong");
            if (suffix) {
                msg.channel.sendMessage("note that ping takes no arguments!");
            }
        }
    },
    "praise": {
        name: "praise",
        description: "Praise the sun!",
        extendedhelp: "Image macro - Solaire praising the sun (Dark Souls)",
        process: function(bot, msg, suffix) {
            msg.delete(); // warning: requires "Manage Messages" permission
            msg.channel.sendFile("./images/praise.gif");
        }
    },
    "lenny": {
        name: "lenny",
        description: "( ͡° ͜ʖ ͡°)",
        extendedhelp: "displays the Unicode emoticon ( ͡° ͜ʖ ͡°) in place of the command",
        process: function(bot, msg, suffix) {
            msg.delete(); // warning: requires "Manage Messages" permission
            msg.channel.sendMessage(msg.content.substring(6) + " ( ͡° ͜ʖ ͡°)");
        }
    }
}

bot.on("ready", function() {
    console.log("I am ready!");
});

bot.on("disconnected", function() {
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
bot.on("message", function(msg) {

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
    //Logger.log("info", msg.author.username + " executed <" + msg.content + ">");

    var command_text = msg.content.split(" ")[0].substring(1).toLowerCase();
    var suffix = msg.content.substring(command_text.length + 2); //add one for the ! and one for the space

    var command = commands[command_text];

    if (command) {
        command.process(bot, msg, suffix);
    }
});

// log in the bot
bot.login(settings.discord_password);
