//import dependent modules
var discord = require("discord.js");
var fs = require("fs");
var path = require("path");
var pm2 = require("pm2");
var padEnd = require("string.prototype.padend");
padEnd.shim();  // allows appending padEnd to strings

// import source files
var warframe = require ("../warframe/warframe.js");

// configuration settings
var settings = require("../../settings.json");
var prefix = settings.prefix;
var doWarframe = settings.warframe.doWarframe;
var images = settings.images;
images.directory = "../." + images.directory; //allows .directory to be from root

// initialize imported modules
var bot = new discord.Client();

// logging utilities
//var ChatLog = require("./runtime/logger.js").ChatLog;
//var Logger = require("./runtime/logger.js").Logger;

/*
List of command properties
-name
-description
-suffix
-usage (NOTE: implied [No Parameters] if !suffix)
-help
-admin
-timeout (in seconds)
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
                //sendCommandHelp(suffix, message.channel);
                var command = null, source = null;

                info = retrieveCommand(suffix);

                if (!info) {
                    message.channel.send("```I'm sorry, but I don't recognize that command. " +
                        "Please consult " + prefix + "help for a list of valid commands.```");
                }
                else {
                    command = info.command;
                    source = info.source;

                    var response = "Information for command: **" + command.name + "**\n```";

                    // include usage information
                    response += "Usage: " + prefix;
                    if (source === "warframe") {
                        response += settings.warframe.prefix;
                    }
                    response += command.name;
                    if (command.suffix) {
                        response += " " + command.usage + "\n";
                    }

                    if (command === commands["img"]) {
                        response += "Available images: ";

                        var contents = fs.readdirSync(images.directory);
                        for (var i in contents) {
                            base = path.basename(contents[i]);
                            extension = path.extname(contents[i]);

                            imagename = base.substring(0, base.length - extension.length);
                            response += imagename + ", ";
                        }
                        response = response.substring(0, response.length - 2); // remove last ", "
                        response += "\n";
                    }

                    response += "Description: " + command.help;
                    if (command.admin) {
                        response += "\nNote: This command is restricted to bot administrators";
                    }
                    response += "```";
                    message.channel.send(response);
                }
            }
            else {
                //sendCommandList(message.channel);
                var response = "**Generic Commands**\n```";
                for (var i in commands) {
                    response += prefix + commands[i].name.padEnd(10) + " | " + commands[i].description + "\n";
                }
                response += "```";
                message.channel.send(response);

                if(doWarframe) {
                    response = "**Warframe Commands**\n```";
                    for (var i in warframe.commands) {
                        response += prefix + settings.warframe.prefix + warframe.commands[i].name.padEnd(10) +
                            " | " + warframe.commands[i].description + "\n";
                    }
                    response += "```";
                    message.channel.send(response);
                }
            }
        }
    },
    "img": {
        name: "img",
        description: "sends an image from the server directory",
        help: "query ./images and posts the first match found. Can also be called with /[image name]",
        suffix: true,
        usage: "[image name (no ext)]",
        process: (bot, message, suffix) => {
            var contents = fs.readdirSync(images.directory);

            for (var i in contents) {
               if (contents[i].startsWith(suffix)) {
                   for (var j in images.extensions) {
                       if (path.extname(contents[i]) === images.extensions[j]) {
                           //sends first filename + extension match as only message
                           message.channel.send({files: [images.directory + "/" + suffix + images.extensions[j]]});
                       }
                   }
               }
           }
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

    // prevent the bot from "echoing" itself and other bots and ignore messages without prefix
    if (message.author.bot || !message.content.startsWith(prefix)) {
        return;
    }

    // acknowledge that a message was received
    console.log("message received: " + message);

    var commandText = message.content.split(" ")[0].substring(prefix.length).toLowerCase();

    // remove prefix, command, and any spaces before suffix (only first word)
    var suffix = message.content.substring(prefix.length + commandText.length).split(" ")[1];

    var command = retrieveCommand(commandText, message).command;

    if (command) {
        command.process(bot, message, suffix);

        if (!command.suffix && suffix) {
            message.channel.send("```Note: " + command.name + " takes no arguments```");
        }
    }
});

function retrieveCommand(predicate, message) {
    var command = null, source = null;

    // check core commands
    command = commands[predicate];
    if (command) {
        source = "main";
    }

    // check warframe commands
    var wfPrefix = settings.warframe.prefix;
    if (!command && doWarframe && predicate.startsWith(wfPrefix)) {
        command = warframe.commands[predicate.substring(wfPrefix.length)];
        if (command) {
            source = "warframe";
        }
    }

    // attempt image directory alias
    if (!command && message) {
        var suffix = message.content.substring(prefix.length).split(" ")[0];
        commands["img"].process(bot, message, suffix);
    }

    return { command, source };
}

// log in the bot
bot.login(settings.token);
