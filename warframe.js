const arrayList = require("arraylist");
const request = require("request");
const padEnd = require("string.prototype.padend");
const warframeWorldState = require("warframe-worldstate-parser");

const settings = require("./settings.json");

// allows appending padEnd to strings
padEnd.shim();

// stores world state shared between methods
var world;
// prevents repeated messages
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
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                acolytes = world.persistentEnemies;

                if (acolytes.length > 0) {
                    for (var i in acolytes) {
                        message.channel.send("```" + acolytes[i].toString() + "```");
                    }
                }
                else {
                    message.channel.send("```There are currently no acolytes active in Warframe.```");
                }
            });
        }
    },
    "alerts": {
        name: "alerts",
        description: "shows all current alerts with decent loot (or otherwise)",
        help: "scrapes current worldState.php from Warframe and returns all active alerts",
        suffix: true,
        usage: "[-all]",
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                alerts = world.alerts;

                if (alerts.length > 0) {
                    var isSent = false; // checks to see if all messages were filtered
                    for (var i in alerts) {
                        if (suffix === "-all" || hasGoodItem(alerts[i]))
                        {
                            message.channel.send("```" + alerts[i].toString() + "```");
                            isSent = true;
                        }
                    }

                    if (!isSent) {
                        message.channel.send("```There are currently no alerts in Warframe " +
                                                "with the filter you selected.\n" +
                                                "Use the parameter -all to see all listings.```");
                    }
                }
                else {
                    message.channel.send("```There are currently no active alerts in Warframe```");
                }
            });
        }
    },
    "baro": {
        name: "baro",
        alias: [ "voidtrader" ],
        description: "shows whether the Void Trader is active and his inventory if present",
        help: "scrapes current worldState.php from Warframe and returns Void Trader information",
        suffix: false,
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                message.channel.send("```" + world.voidTrader.toString() + "```");
            });
        }
    },
    "darvo": {
        name: "darvo",
        alias: [ "dailydeal" ],
        description: "retrieve Darvo's daily deal",
        help: "scrapes current worldState.php from Warframe and returns all daily deals",
        suffix: false,
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                deals = world.dailyDeals;

                if (deals.length > 0) {
                    for (var i in deals) {
                        message.channel.send("```" + deals[i].toString() + "```");
                    }
                }
                else {
                    message.channel.send("```There are currently no daily deals in Warframe```");
                }
            });
        }
    },
    "events": {
        name: "events",
        description: "displays any active Warframe events",
        help: "scrapes current worldState.php from Warframe and returns all active events",
        suffix: false,
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                events = world.events;

                if (events.length > 0) {
                    for (var i in events) {
                        message.channel.send("```" + events[i].toString() + "```");
                    }
                }
                else {
                    message.channel.send("```There are currently no events in Warframe```");
                }
            });
        }
    },
    "invasions": {
        name: "invasions",
        alias: [ "invasion" ],
        description: "shows all current invasions with decent loot (or otherwise)",
        help: "scrapes current worldState.php from Warframe and returns all active invasions",
        suffix: true,
        usage: "[-all]",
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                invasions = world.invasions;

                if (invasions.length > 0) {
                    var isSent = false; // checks to see if all messages were filtered
                    for (var i in invasions) {
                        if (suffix === "-all" || hasGoodItem(invasions[i]))
                        {
                            message.channel.send("```" + invasions[i].toString() + "```");
                            isSent = true;
                        }
                    }

                    if (!isSent) {
                        message.channel.send("```There are currently no invasions in Warframe " +
                                                "with the filter you selected.\n" +
                                                "Use the parameter -all to see all listings.```");
                    }
                }
                else {
                    message.channel.send("```There are currently no active invasions in Warframe```");
                }
            });
        }
    },
    "sortie": {
        name: "sortie",
        description: "shows today's sortie in Warframe",
        help: "scrapes current worldState.php from Warframe and returns sortie information",
        suffix: false,
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                message.channel.send("```" + toSortieString(world.sortie) + "```");
            });
        }
    },
    "weekend": {
        name: "weekend",
        description: "shows if any bonus weekends are currently active",
        help: "scrapes current worldState.php from Warframe and returns all weekend bonuses",
        suffix: false,
        process: (bot, message, suffix) => {
            queryWarframe( () => {
                weekends = world.globalUpgrades;

                if (weekends.length > 0) {
                    for (var i in weekends) {
                        message.channel.send("**Warframe Bonus Weekend**```\n" +
                                                "Upgrade Bonus: " + weekends[i].upgrade + "\n" +
                                                "Start Date: "+ weekends[i].start.toString() + "\n" +
                                                "End Date: " + weekends[i].end.toString() + "```";);
                    }
                }
                else {
                    message.channel.send("```There are currently no weekend bonuses in Warframe```");
                }
            });
        }
    },
    // TODO: make this not shit
    "wiki": {
        name: "wiki",
        description: "conduts (rudimentary) search of Warframe wikia",
        help: "inserts modified parameters into Warframe wikia url",
        suffix: true,
        usage: "[search term]",
        process: (bot, message, suffix) => {
            message.channel.send("https://warframe.wikia.com/wiki/" + suffix.replace(/ /g, "_"));
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
