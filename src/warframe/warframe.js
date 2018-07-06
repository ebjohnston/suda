// import dependent modules
const ArrayList = require('arraylist')
const request = require('request')
// var padEnd = require('string.prototype.padend')
const WarframeParser = require('warframe-worldstate-parser')

// configuration settings
var settings = require('../../settings.json')

// globals used for inter-method communication
var world // stores world.php scraped from warframe website
var id // stores id of current event being sent / filtered
var serverIndex = -1 // stores the posted array index of the current server

// nested array used to store messages that have been sent to avoid duplicates
const SERVER_COUNT = settings.warframe.servers.length
var sent = []
for (var i = 0; i < SERVER_COUNT; i++) {
  sent[i] = {
    'alerts': new ArrayList(),
    'invasions': new ArrayList(),
    'news': new ArrayList(),
    'weekends': new ArrayList()
  }
}

// see [current core commands location] for command parameter descriptions
var commands = {
  'acolytes': {
    name: 'acolytes',
    alias: [ 'acolyte' ],
    description: 'shows whether any acolytes are active in Warframe',
    help: 'scrapes current worldState.php from Warframe and returns all active acolytes',
    suffix: false,
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        let acolytes = world.persistentEnemies
        if (acolytes.length > 0) {
          for (let i in acolytes) {
            message.channel.send('```' + acolytes[i].toString() + '```')
          }
        } else {
          message.channel.send('```There are currently no acolytes active in Warframe.```')
        }
      })
    }
  },
  'alerts': {
    name: 'alerts',
    description: 'shows all current alerts with decent loot (or otherwise)',
    help: 'scrapes current worldState.php from Warframe and returns all active alerts',
    suffix: true,
    usage: '[-all]',
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        let alerts = world.alerts
        if (alerts.length > 0) {
          var isSent = false // checks to see if all messages were filtered
          for (var i in alerts) {
            if (suffix === '-all' || hasGoodItem(alerts[i])) {
              message.channel.send('```' + alerts[i].toString() + '```')
              isSent = true
            }
          }
          if (!isSent) {
            message.channel.send('```There are currently no alerts in Warframe ' +
                                                'with the filter you selected.\n' +
                                                'Use the parameter -all to see all listings.```')
          }
        } else {
          message.channel.send('```There are currently no active alerts in Warframe```')
        }
      })
    }
  },
  'baro': {
    name: 'baro',
    alias: [ 'voidtrader' ],
    description: 'shows whether the Void Trader is active and his inventory if present',
    help: 'scrapes current worldState.php from Warframe and returns Void Trader information',
    suffix: false,
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        message.channel.send('```' + world.voidTrader.toString() + '```')
      })
    }
  },
  'darvo': {
    name: 'darvo',
    alias: [ 'dailydeal' ],
    description: "retrieve Darvo's daily deal",
    help: 'scrapes current worldState.php from Warframe and returns all daily deals',
    suffix: false,
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        let deals = world.dailyDeals
        if (deals.length > 0) {
          for (var i in deals) {
            message.channel.send('```' + deals[i].toString() + '```')
          }
        } else {
          message.channel.send('```There are currently no daily deals in Warframe```')
        }
      })
    }
  },
  'events': {
    name: 'events',
    description: 'displays any active Warframe events',
    help: 'scrapes current worldState.php from Warframe and returns all active events',
    suffix: false,
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        let events = world.events
        if (events.length > 0) {
          for (var i in events) {
            message.channel.send('```' + events[i].toString() + '```')
          }
        } else {
          message.channel.send('```There are currently no events in Warframe```')
        }
      })
    }
  },
  'invasions': {
    name: 'invasions',
    alias: [ 'invasion' ],
    description: 'shows all current invasions with decent loot (or otherwise)',
    help: 'scrapes current worldState.php from Warframe and returns all active invasions',
    suffix: true,
    usage: '[-all]',
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        let invasions = world.invasions
        if (invasions.length > 0) {
          var isSent = false // checks to see if all messages were filtered
          for (var i in invasions) {
            if (suffix === '-all' || hasGoodItem(invasions[i])) {
              message.channel.send('```' + invasions[i].toString() + '```')
              isSent = true
            }
          }
          if (!isSent) {
            message.channel.send('```There are currently no invasions in Warframe ' +
                                                'with the filter you selected.\n' +
                                                'Use the parameter -all to see all listings.```')
          }
        } else {
          message.channel.send('```There are currently no active invasions in Warframe```')
        }
      })
    }
  },
  'sortie': {
    name: 'sortie',
    description: "shows today's sortie in Warframe",
    help: 'scrapes current worldState.php from Warframe and returns sortie information',
    suffix: false,
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        message.channel.send('```' + toSortieString(world.sortie) + '```')
      })
    }
  },
  'weekend': {
    name: 'weekend',
    description: 'shows if any bonus weekends are currently active',
    help: 'scrapes current worldState.php from Warframe and returns all weekend bonuses',
    suffix: false,
    process: (bot, message, suffix) => {
      queryWarframe(() => {
        let weekends = world.globalUpgrades
        if (weekends.length > 0) {
          for (var i in weekends) {
            message.channel.send('**Warframe Bonus Weekend**```\n' +
                                                'Upgrade Bonus: ' + weekends[i].upgrade + '\n' +
                                                'Start Date: ' + weekends[i].start.toString() + '\n' +
                                                'End Date: ' + weekends[i].end.toString() + '```')
          }
        } else {
          message.channel.send('```There are currently no weekend bonuses in Warframe```')
        }
      })
    }
  },
  // TODO: make this not shit
  'wiki': {
    name: 'wiki',
    description: 'conduts (rudimentary) search of Warframe wikia',
    help: 'inserts modified parameters into Warframe wikia url',
    suffix: true,
    usage: '[search term]',
    process: (bot, message, suffix) => {
      message.channel.send('https://warframe.wikia.com/wiki/' + suffix.replace(/ /g, '_'))
    }
  }
}

function scrapeWarframe (bot) {
  setInterval(() => {
    queryWarframe(() => {
      var servers = settings.warframe.servers

      for (var i in servers) {
        serverIndex = i
        var server = bot.guilds.find('name', servers[i].server)
        if (server) {
          var channel = server.channels.find('name', servers[i].channel)
        }

        if (world && channel) {
          sendPassiveWarframe(world, channel)
        }
      }
    })
  }, settings.warframe.refresh * 1000)
}

function queryWarframe (instructions) {
  request('http://content.warframe.com/dynamic/worldState.php', (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.log('An error has occured: Warframe webpage not accessible')
    } else {
      world = new WarframeParser(body)

      if (world) {
        instructions()
      }
    }
  })
}

function sendPassiveWarframe (world, channel) {
  var posted = sent[serverIndex] // array for this server iteration

  sendOnce('alerts', world.alerts, (alert) => {
    id = alert.id
    if (!posted['alerts'].contains(id) && hasGoodItem(alert)) {
      channel.send('```' + alert.toString() + '```')
      posted['alerts'].add(id)
    }
  })

  sendOnce('invasions', world.invasions, (invasion) => {
    id = invasion.node
    if (!posted['invasions'].contains(id) && hasGoodItem(invasion)) {
      channel.send('```' + invasion.toString() + '```')
      posted['invasions'].add(id)
    }
  })

  sendOnce('news', world.news, (news) => {
    id = news.id
    if (!posted['news'].contains(id) && isSameDay(news)) {
      channel.send(news.link)
      posted['news'].add(id)
    }
  })

  sendOnce('weekends', world.globalUpgrades, (bonus) => {
    id = bonus.upgrade
    if (!posted['weekends'].contains(id)) {
      channel.send(toWeekendString(bonus))
      posted['weekends'].add(id)
    }
  })
}

function sendOnce (type, dataArray, sendMessage) {
  var buffer = new ArrayList()

  for (let i in dataArray) {
    let data = dataArray[i]
    sendMessage(data)

    // add to list of current events even if not posted
    buffer.add(id)
  }
  // cleanse posted array once an event expires
  sent[serverIndex][type] = sent[serverIndex][type].intersection(buffer)
}

// TODO: add custom item matching
function hasGoodItem (event) {
  var items = /nitain|forma|catalyst|reactor|exilus|kubrow|kavat|vandal|wraith/
  let rewards = event.getRewardTypes()

  for (var i in rewards) {
    if (items.test(rewards[i])) {
      return true
    }
  }
  return false
}

function isSameDay (event) {
  let today = new Date()

  return today.getDate() === event.date.getDate() &&
            today.getMonth() === event.date.getMonth()
}

function toSortieString (sortie) {
  if (sortie.isExpired()) {
    return 'There is currently no active sortie in Warframe.'
  } else {
    var buffer = sortie.getBoss() + ': ends in ' + sortie.getETAString() + '\n'

    for (var i in sortie.variants) {
      let variant = sortie.variants[i]

      buffer += '\n' + variant.missionType.padEnd(15) + ' | '
      buffer += variant.modifier.padEnd(45) + ' | '
      buffer += variant.node
    }

    return buffer
  }
}

function toWeekendString (weekend) {
  return '**Warframe Bonus Weekend**```\n' +
            'Upgrade Bonus: ' + weekend.upgrade + '\n' +
            'Start Date: ' + weekend.start.toString() + '\n' +
            'End Date: ' + weekend.end.toString() + '```'
}

exports.commands = commands
exports.scrapeWarframe = scrapeWarframe
