const ArrayList = require("arraylist");
const settings = require("./settings.json");

var alertsPosted = new ArrayList;
var invasionsPosted = new ArrayList;
var newsPosted = new ArrayList;
var weekendsPosted = new ArrayList;

exports.commands = {
    "alerts": {
        name: "alerts",
        description: "retrieve current info on warframe acolytes",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: false,
        process: (bot, msg, suffix) => {
            const Request = require("request");
            const WarframeWorldState = require("warframe-worldstate-parser");

            Request("http://content.warframe.com/dynamic/worldState.php", (error, response, body) => {
                if (error || response.statusCode != 200) {
                    console.log("An error has occured: Warframe webpage not accessible");
                }
                else {
                    world = new WarframeWorldState(body);

                    if (world) {
                        if (world.alerts.length > 0) {
                            for (var i in world.alerts) {
                                msg.channel.sendMessage("```" + world.alerts[i].toString() + "```");
                            }
                        }
                        else {
                            msg.channel.sendMessage("```There are currently no active alerts in Warframe.```");
                        }
                    }
                }
            });
            // queryWarframe( () => {
            //     if (world.alerts > 0) {
            //         for (var i in world.alerts) {
            //             msg.channel.sendMessage("```" + world.alerts[i].toString() + "```");
            //         }
            //     }
            //     else {
            //         msg.channel.sendMessage("```There are currently no active alerts in Warframe.```");
            //     }
            // });
        }
    },
    "invasions": {
        name: "invasions",
        description: "retrieve current info on warframe acolytes",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframe( () => {
                if (world.invasions.length > 0) {
                    for (var i in world.invasions) {
                        msg.channel.sendMessage("```" + world.invasions[i].toString() + "```");
                    }
                }
                else {
                    msg.channel.sendMessage("```There are currently no active invasions in Warframe.```");
                }
            });
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
    "acolytes": {
        name: "acolytes",
        description: "retrieve current info on warframe acolytes",
        help: "scrapes current worldState.php from Warframe and returns all active acolytes",
        suffix: false,
        process: (bot, msg, suffix) => {
            queryWarframe( () => {
                if (world.persistentEnemies.length > 0) {
                    for (var i in world.persistentEnemies) {
                        msg.channel.sendMessage("```" + world.persistentEnemies[i].toString() + "```");
                    }
                }
                else {
                    msg.channel.sendMessage("```There are currently no acolytes active in Warframe.```");
                }
            });
        }
    }
}

exports.scrapeWarframe = (bot) => {
    setInterval( () => {
        queryWarframe( () => {
            var servers = settings.warframeServers;

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

function processWarframe(world, channel) {
    processAlerts(world, channel);
    processInvasions(world, channel);
    processNews(world, channel);
    processWeekends(world, channel);
}

function sendMessageOnce() {
    var buffer = new ArrayList;

    for (var i in dataArray) {
        data = dataArray[i];

        if (restriction) {
            switch(type) {
                case "news":
                    channel.sendMessage(data.link);
                    break;
                case "weekend":
                    channel.sendMessage("**Warframe Bonus Weekend**```\n" +
                                        "Upgrade Bonus: " + data.upgrade + "\n" +
                                        "Start Date: "+ data.start.toString() + "\n" +
                                        "End Date: " + data.end.toString() + "```");
                    break;
                default:
                    channel.sendMessage("```" + data.toString() + "````");
            }
        }
    }
}

function processAlerts(warframeworld, warframechannel) {
    // buffer to cleanse list of stored alerts
    var currentalerts = new ArrayList;

    for (var i in warframeworld.alerts) {
        alert = warframeworld.alerts[i];
        // omit duplicate alerts and irrelevant item rewards
        if (!alertsPosted.contains(alert.id) && hasGoodItem(alert)) {
            warframechannel.sendMessage("```" + alert.toString() + "```");
            alertsPosted.add(alert.id);
        }

        // populate alert buffer
        currentalerts.add(alert.id);
    }

    // remove alerts once they expire
    alertsPosted = alertsPosted.intersection(currentalerts);
}

function processInvasions(warframeworld, warframechannel) {
    // buffer to cleanse the list of stored invasions
    var currentinvasions = new ArrayList;

    for (var i in warframeworld.invasions) {
        invasion = warframeworld.invasions[i];
        // omit duplicate invasions and irrelevant item rewards
        if (!invasionsPosted.contains(invasion.node) && hasGoodItem(invasion)) {
            warframechannel.sendMessage("```" + invasion.toString() + "```");
            invasionsPosted.add(invasion.node);
        }

        // populate invasion buffer
        currentinvasions.add(invasion.node);
    }

    // remove invasions once they expire
    invasionsPosted = invasionsPosted.intersection(currentinvasions);
}

function processNews(warframeworld, warframechannel) {
    var today = new Date();
    // buffer to cleanse list of stored news
    var currentnews = new ArrayList;

    for (var i in warframeworld.news) {
        news = warframeworld.news[i];

        // omit duplicate news and old (preious days') news
        if (!newsPosted.contains(news.id) && today.getDate() === news.date.getDate()
                && today.getMonth() === news.date.getMonth()) {
            warframechannel.sendMessage(news.link);
            newsPosted.add(news.id);
        }

        // populate news buffer
        currentnews.add(news.id);
    }

    // remove news once it expires
    newsPosted = newsPosted.intersection(currentnews);
}

function processWeekends(warframeworld, warframechannel) {
    // buffer to cleanse previous weekend events
    var currentweekends = new ArrayList;

    for (var i in warframeworld.globalUpgrades) {
        weekend = warframeworld.globalUpgrades[i];

        if(!weekendsPosted.contains(weekend.upgrade)) {
            warframechannel.sendMessage("**Warframe Bonus Weekend**```\n" +
                                        "Upgrade Bonus: " + weekend.upgrade + "\n" +
                                        "Start Date: "+ weekend.start.toString() + "\n" +
                                        "End Date: " + weekend.end.toString() + "```");
            weekendsPosted.add(weekend.upgrade);
        }

        currentweekends.add(weekend.upgrade);
    }

    // remove weekend events once they expire
    weekendsPosted = weekendsPosted.intersection(currentweekends);
}

// TODO: add custom item matching
function hasGoodItem(event) {
    if (event.attackerReward) { // use this one for invasions
        var itemregex = /Nitain|Forma|Catalyst|Reactor|Exilus|Kubrow|Kavat|Vandal|Wraith/;

        rewards = event.toString();
        return itemregex.test(rewards);
    }
    else { // use this one for alerts
        var itemregex = /nitain|forma|catalyst|reactor|exilus|kubrow|kavat|vandal|wraith/;

        rewards = event.getRewardTypes();
        for (var i in rewards) {
            if (itemregex.test(rewards[i])) {
                return true;
            }
        }

        return false;
    }

}
