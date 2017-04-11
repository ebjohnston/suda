// import the discord.js module
const Discord = require("discord.js");

const bot = new Discord.Client();

const settings = require("./settings.json");

var prefix = settings.command_prefix;

// the ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted.
bot.on("ready", () => {
    console.log("I am ready!");
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
    // prevent the bot from "echoing" itself and other bots
    if (msg.author.bot) {
        return;
    }

    // ignore messages without prefix
    if (!msg.content.startsWith(prefix)) {
        return;
    }

    // acknowledge that a message was received
    console.log("message received: " + msg);

    if (msg.content.startsWith(prefix + "ping")) {
        msg.channel.sendMessage("pong");
    }

    else if (msg.content.startsWith(prefix + "praise")) {
        msg.delete();
        msg.channel.sendFile("./images/praise.gif");
    }

    else if (msg.content.startsWith(prefix + "lenny")) {
        msg.delete();
        msg.channel.sendMessage(msg.content.substring(6) + " ( ͡° ͜ʖ ͡°)");
    }
});

// log in the bot
bot.login(settings.discord_password);
