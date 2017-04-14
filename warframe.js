const ArrayList = require("arraylist");
const Settings = require("./settings.json");

var world;
var posted = {
    "alerts": new ArrayList,
    "invasions": new ArrayList,
    "news": new ArrayList,
    "weekends": new ArrayList
}

// see discord_bot.js for command parameter descriptions

exports.commands = {
    "alerts": {
        name: "alerts",
        description: "retrieve current info on warframe acolytes",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: true,
        usage: "[-all]",
        process: (bot, msg, suffix) => {
            queryWarframeArray("alerts", msg.channel, suffix);
        }
    },
    "invasions": {
        name: "invasions",
        description: "retrieve current info on warframe acolytes",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: true,
        usage: "[-all]",
        process: (bot, msg, suffix) => {
            queryWarframeArray("invasions", msg.channel, suffix);
        }
    },
    "baro": {
        name: "baro",
        description: "retrieve current info on Void Trader",
        help: "scrapes current worldState.php from Warframe and returns Void Trader information",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframe( () => {
                msg.channel.sendMessage("```" + world.voidTrader.toString() + "```");
            });
        }
    },
    "events": {
        name: "acolytes",
        description: "retrieve active warframe events",
        help: "scrapes current worldState.php from Warframe and returns all active events",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("events", msg.channel, suffix);
        }
    },
    "sortie": {
        name: "sortie",
        description: "retrieve today's sortie in Warframe",
        help: "scrapes current worldState.php from Warframe and returns sortie information",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframe( () => {
                msg.channel.sendMessage("```" + world.sortie.toString() + "```");
            });
        }
    },
    "acolytes": {
        name: "acolytes",
        description: "retrieve current info on warframe acolytes",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("acolytes", msg.channel, suffix);
        }
    },
    "darvo": {
        name: "darvo",
        description: "retrieve darvo's daily deal",
        help: "scrapes current worldState.php from Warframe and returns all daily deals",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("daily deals", msg.channel, suffix);
        }
    }
}

exports.scrapeWarframe = (bot) => {
    setInterval( () => {
        queryWarframe( () => {
            var servers = Settings.warframeServers;

            for (var i in servers) {
                var channel = bot.guilds.find("name", servers[i].server).channels.find("name", servers[i].channel);

                if (world && channel) {
                    processWarframe(world, channel);
                }
            }
        });
    }, 60 * 1000);
}

function queryWarframe(instructions) {
    const Request = require("request");
    const WarframeWorldState = require("warframe-worldstate-parser");

    Request("http://content.warframe.com/dynamic/worldState.php", (error, response, body) => {
        if (error || response.statusCode != 200) {
            console.log("An error has occured: Warframe webpage not accessible");
        }
        else {
            world = new WarframeWorldState(body);

            if (world) {
                instructions();
            }
        }
    });
}

function queryWarframeArray(type, channel, suffix) {
    queryWarframe( () => {
        var array;
        var restriction = alwaysTrue;

        switch (type) {
            case "alerts":
                array = world.alerts;
                restriction = hasGoodItem;
                break;
            case "invasions":
                array = world.invasions;
                restriction = hasGoodItem;
                break;
            case "acolytes":
                array = world.persistentEnemies;
                break;
            case "events":
                array = world.events;
                break;
            case "daily deals":
                array = world.dailyDeals;
                break;
        }

        // -all overrides restrictions
        if (suffix === "-all") {
            restriction = alwaysTrue;
        }

        if (array.length > 0) {
            for (var i in array) {
                if (restriction(array[i])) {
                    channel.sendMessage("```" + array[i].toString() + "```");
                }
            }
        }
        else {
            channel.sendMessage("```There are currently no " + type + " in Warframe```");
        }
    });
}

function processWarframe(world, channel) {
    sendMessageOnce("alerts", world.alerts, channel, hasGoodItem);
    sendMessageOnce("invasions", world.invasions, channel, hasGoodItem);
    sendMessageOnce("news", world.news, channel, sameDay);
    sendMessageOnce("weekends", world.globalUpgrades, channel, alwaysTrue);
}

// NOTE: "news" and "invasions" has not yet been verified
function sendMessageOnce(type, dataArray, channel, restriction) {
    var buffer = new ArrayList;
    var id;

    for (var i in dataArray) {
        data = dataArray[i];

        switch (type) {
            case "alerts":
            case "news":
                id = data.id; break;
            case "invasions":
                id = data.node; break;
            case "weekends":
                id = data.upgrade; break;
            default:
                console.log("Error: warframe - type not recognized when parsing id");
        }

        if (!posted[type].contains(id) && restriction(data)) {
            switch (type) {
                case "alerts":
                case "invasions":
                    channel.sendMessage("```" + data.toString() + "```"); break;
                case "news":
                    channel.sendMessage(data.link); break;
                case "weekends":
                    channel.sendMessage("**Warframe Bonus Weekend**```\n" +
                                        "Upgrade Bonus: " + data.upgrade + "\n" +
                                        "Start Date: "+ data.start.toString() + "\n" +
                                        "End Date: " + data.end.toString() + "```");
                    break;
                default:
                    console.log("Error: warframe - type not recognized when sending scraped message");
            }
            posted[type].add(id);
        }
        // add to list of current events even if not posted
        buffer.add(id);
    }
    // cleanse posted once an event expires
    posted[type] = posted[type].intersection(buffer);
}

// TODO: add custom item matching
function hasGoodItem(event) {
    if (event.attackerReward) { // use this one for invasions
        var items = /Nitain|Forma|Catalyst|Reactor|Exilus|Kubrow|Kavat|Vandal|Wraith/;

        rewards = event.toString();
        return items.test(rewards);
    }
    else { // use this one for alerts
        var items = /nitain|forma|catalyst|reactor|exilus|kubrow|kavat|vandal|wraith/;

        rewards = event.getRewardTypes();
        for (var i in rewards) {
            if (items.test(rewards[i])) {
                return true;
            }
        }

        return false;
    }
}

function sameDay(event) {
    today = new Date();

    return today.getDate() === event.date.getDate() &&
            today.getMonth() === event.date.getMonth();
}

function alwaysTrue(event) {
    return true;
}
