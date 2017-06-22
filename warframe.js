const arrayList = require("arraylist");
const request = require("request");
const padEnd = require("string.prototype.padend");
const warframeWorldState = require("warframe-worldstate-parser");

const settings = require("./settings.json");

// allows appending padEnd to strings
padEnd.shim();

// stores world state shared between methods
var world;
// used to eliminate repeated messages
var posted = {
    "alerts": new arrayList,
    "invasions": new arrayList,
    "news": new arrayList,
    "weekends": new arrayList
}

// see discord_bot.js for command parameter descriptions
exports.commands = {
    "acolytes": {
        name: "acolytes",
        description: "shows whether any acolytes are active in Warframe",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("acolytes", msg.channel, suffix);
        }
    },
    "alerts": {
        name: "alerts",
        description: "shows all current alerts with decent loot (or otherwise)",
        help: "scrapes current worldState.php from Warframe and returns all active alerts",
        suffix: true,
        usage: "[-all]",
        process: (bot, msg, suffix) => {
            queryWarframeArray("alerts", msg.channel, suffix);
        }
    },
    "baro": {
        name: "baro",
        description: "shows whether the Void Trader is active and his inventory if present",
        help: "scrapes current worldState.php from Warframe and returns Void Trader information",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframe( () => {
                msg.channel.send("```" + world.voidTrader.toString() + "```");
            });
        }
    },
    "darvo": {
        name: "darvo",
        description: "retrieve Darvo's daily deal",
        help: "scrapes current worldState.php from Warframe and returns all daily deals",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("daily deals", msg.channel, suffix);
        }
    },
    "events": {
        name: "events",
        description: "displays any active Warframe events",
        help: "scrapes current worldState.php from Warframe and returns all active events",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("events", msg.channel, suffix);
        }
    },
    "invasions": {
        name: "invasions",
        description: "shows all current invasions with decent loot (or otherwise)",
        help: "scrapes current worldState.php from Warframe and returns all active invasions",
        suffix: true,
        usage: "[-all]",
        process: (bot, msg, suffix) => {
            queryWarframeArray("invasions", msg.channel, suffix);
        }
    },
    "sortie": {
        name: "sortie",
        description: "shows today's sortie in Warframe",
        help: "scrapes current worldState.php from Warframe and returns sortie information",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframe( () => {
                msg.channel.send("```" + toSortieString(world.sortie) + "```");
            });
        }
    },
    "weekend": {
        name: "weekend",
        description: "shows if any bonus weekends are currently active",
        help: "scrapes current worldState.php from Warframe and returns all weekend bonuses",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframeArray("weekend bonuses", msg.channel, suffix);
        }
    },
    // TODO: make this not shit
    "wiki": {
        name: "wiki",
        description: "conduts (rudimentary) search of Warframe wikia",
        help: "inserts modified parameters into Warframe wikia url",
        suffix: true,
        usage: "[search term]",
        process: (bot, msg, suffix) => {
            msg.channel.send("https://warframe.wikia.com/wiki/" + suffix.replace(/ /g, "_"));
        }
    }
}

exports.scrapeWarframe = (bot) => {
    setInterval( () => {
        queryWarframe( () => {
            var servers = settings.warframe.servers;

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
    request("http://content.warframe.com/dynamic/worldState.php", (error, response, body) => {
        if (error || response.statusCode != 200) {
            console.log("An error has occured: Warframe webpage not accessible");
        }
        else {
            world = new warframeWorldState(body);

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
        var syndicates;

        switch (type) {
            case "acolytes":
                array = world.persistentEnemies;
                break;
            case "alerts":
                array = world.alerts;
                restriction = hasGoodItem;
                break;
            case "daily deals":
                array = world.dailyDeals;
                break;
            case "events":
                array = world.events;
                break;
            case "invasions":
                array = world.invasions;
                restriction = hasGoodItem;
                break;
            case "weekend bonuses":
                array = world.globalUpgrades;
                break;
        }

        // -all overrides restrictions
        if (suffix === "-all") {
            restriction = alwaysTrue;
        }

        if (array.length > 0) {
            var messageSent = false;

            for (var i in array) {
                if (restriction(array[i])) {
                    if (type === "weekend bonuses") { // special case - override toString
                        channel.send(toWeekendString(array[i]));
                    }
                    else {
                        channel.send("```" + array[i].toString() + "```");
                    }
                    messageSent = true;
                }
            }

            if (!messageSent) {
                channel.send("```There are currently no " + type + " in Warframe " +
                                    "with the filter you selected.\n" +
                                    "Use the parameter -all to see all listings.```");
            }
        }
        else {
            channel.send("```There are currently no " + type + " in Warframe.```");
        }
    });
}

function processWarframe(world, channel) {
    sendOnce("alerts", world.alerts, channel, hasGoodItem);
    sendOnce("invasions", world.invasions, channel, hasGoodItem);
    sendOnce("news", world.news, channel, sameDay);
    sendOnce("weekends", world.globalUpgrades, channel, alwaysTrue);
}

// NOTE: "news" has not yet been verified
function sendOnce(type, dataArray, channel, restriction) {
    var buffer = new arrayList;
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
                    channel.send("```" + data.toString() + "```"); break;
                case "news":
                    channel.send(data.link); break;
                case "weekends":
                    channel.send(toWeekendString(data)); break;
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

function toSortieString(sortie) {
    if (sortie.isExpired()) {
        return "There is currently no active sortie in Warframe.";
    }
    else {
        var buffer;

        buffer = sortie.getBoss() + ": ends in " + sortie.getETAString() + "\n";

        for (var i in sortie.variants) {
            variant = sortie.variants[i];

            buffer += "\n" + variant.missionType.padEnd(15) + " | ";
            buffer += variant.modifier.padEnd(45) + " | ";
            buffer += variant.node;
        }

        return buffer;
    }
}

function toWeekendString(weekend) {
    return "**Warframe Bonus Weekend**```\n" +
            "Upgrade Bonus: " + weekend.upgrade + "\n" +
            "Start Date: "+ weekend.start.toString() + "\n" +
            "End Date: " + weekend.end.toString() + "```";
}
