import PlexAPI from 'plex-api'; // Plex API module.
import fs from 'fs';
import { assertExists } from '../util/assert.js';

import plexConfig from '../config/plex.js';


// plex client ---------------------------------------------------------------
const plex = new PlexAPI({
  hostname: plexConfig.hostname,
  port: plexConfig.port,
  username: plexConfig.username,
  password: plexConfig.password,
  token: plexConfig.token,
  options: {
    identifier: plexConfig.options.identifier,
    product: plexConfig.options.identifier,
    version: plexConfig.options.version,
    deviceName: plexConfig.options.deviceName,
    platform: plexConfig.options.platform,
    device: plexConfig.options.device
  }
});

// plex constants ------------------------------------------------------------
const PLEX_PLAY_START = `http://${plexConfig.hostname}:${plexConfig.port}`;
const PLEX_PLAY_END = `?X-Plex-Token=${plexConfig.token}`;

// plex variables ------------------------------------------------------------
var tracks = null;
var plexQuery = null;
var plexOffset = 0; // default offset of 0
var plexPageSize = 10; // default result size of 10
var isPlaying = false;
var isPaused = false;
let songQueue = []; // will be used for queueing songs

// plex vars for playing audio -----------------------------------------------
var dispatcher = null;
var voiceChannel = null;
var conn = null;

function onSongEndHandler(message) {
  songQueue.shift();
  if (songQueue.length > 0) {
    playSong(message);
  }
  // no songs left in queue, continue with playback completion events
  else {
    playbackCompletion(message);
  }
}

// find song when provided with query string, offset, pagesize, and message
async function findSong(query, offset, pageSize, message, prefix) {
  plex.query('/search/?type=10&query=' + query + '&X-Plex-Container-Start=' + offset + '&X-Plex-Container-Size=' + pageSize).then(function (res) {
    tracks = res.MediaContainer.Metadata;

    const resultSize = res.MediaContainer.size;
    plexQuery = query; // set query for !nextpage
    plexOffset = plexOffset + resultSize; // set paging

    let messageLines = '\n';
    let artist = '';

    if (resultSize == 1 && offset == 0) {
      const songKey = 0;
      // add song to queue
      addToQueue(songKey, tracks, message, prefix);
    }
    else if (resultSize > 1) {
      for (let t = 0; t < tracks.length; t++) {
        const track = tracks[t];

        if ('originalTitle' in track) {
          artist = track.originalTitle;
        }
        else {
          artist = track.grandparentTitle;
        }
        messageLines += `${(t + 1)} - ${artist} - ${track.title}\n`;
      }
      messageLines += `\n***${prefix}playsong (number)** to play your song.*`;
      messageLines += `\n***${prefix}nextpage** if the song you want isn't listed*`;
      message.reply(messageLines);
    }
    else {
      message.reply(`**I can't find a song with that title.**`);
    }
  }, function (err) {
    console.log(`narp - ${err}`);
  });
}

// not sure if ill need this
async function addToQueue(songNumber, tracks, message, prefix) {
  if (songNumber > -1) {
    const track = tracks[songNumber];
    const key = track.Media[0].Part[0].key;
    const title = track.title;
    const albumYear = track.parentYear || '';
    const albumTitle = track.parentTitle || '';

    const thumbDir = track.thumb;

    let img = null;
    if (thumbDir) {
      try {
        img = await plex.query(`${thumbDir}&X-Plex-Container-Start=${0}&X-Plex-Container-Size=${1}`);
      } catch (e) {
        console.error(e);
      }
    }

    let artist = '';
    if ('originalTitle' in track) {
      artist = track.originalTitle;
    }
    else {
      artist = track.grandparentTitle;
    }

    songQueue.push({
      artist,
      title,
      albumTitle,
      albumYear,
      image: img.buffer,
      key
    });

    if (songQueue.length > 1) {
      message.reply(`You have added **'${artist} - ${title}'** to the queue.\n\n***${prefix}viewqueue** to view the queue.*`);
    }

    if (!isPlaying) {
      playSong(message);
    }

  }
  else {
    message.reply("**That's not a valid option, silly. ...Unless you're trying to do this on purpose... >_>**");
  }
}

// play song when provided with index number, track, and message
function playSong(voiceChannel) {

  if (voiceChannel) {
    voiceChannel.join().then(function (connection) {
      conn = connection;
      const url = PLEX_PLAY_START + songQueue[0].key + PLEX_PLAY_END;

      isPlaying = true;

      dispatcher = connection.playArbitraryInput(url).on('end', () => onSongEndHandler(message));
      dispatcher.setVolume(0.2);
    });

    const song = songQueue[0];
    const fields = [
      {
        name: 'Artist',
        value: song.artist,
        inline: true,
      },
      {
        name: 'Title',
        value: song.title,
        inline: true,
      }
    ];

    if (song.albumTitle) {
      fields.push({
        name: 'Album',
        value: song.albumTitle + (song.albumYear ? ` (${song.albumYear})` : ''),
        inline: true,
      });
    }

    let image = undefined;
    let files = undefined;
    if (song.image) {
      image = "attachment://image.jpg";
      fs.writeFileSync('./img/image.jpg', Buffer.from(song.image));
      //let curr = Buffer.from(song.image).toString('base64');
      //curr = curr.replace(/\+/g, '-');
      //curr = curr.replace(/\//g, '_');
      // curr = curr.replace(/\=/g, '.');
      //image = `data:image/jpg;base64,${curr}`;
      files = [{
        attachment: './img/image.jpg',
        name: 'image.jpg',
      }];
    };

    // Probably just change this to channel alert, not reply.
    var embedObj = {
      embed: {
        color: 4251856,
        image: {
          url: image
        },
        fields,
        footer: {
          text: `${songQueue.length} song(s) in the queue`
        },
      },
      files,
    };
    message.channel.send('**Now playing:**\n', embedObj);
    //message.channel.send('**♪ ♫ ♪ Playing: ' + songQueue[0].artist + ' - ' + songQueue[0].title + ' ♪ ♫ ♪**');
  }
  else {
    message.reply('**Please join a voice channel (I have access to) before requesting a song.**')
  }
}

// run at end of songQueue / remove bot from voiceChannel
function playbackCompletion(message) {
  conn.disconnect();
  voiceChannel.leave();
  isPlaying = false;
}


/**
 * Contains all commands pertaining to plex.
 * Must be kept in sync with `plexCommandsEnumerable`.
 */
const plexCommands = {
  plexTest: {
    usage: '',
    fieldName: 'plexTest',
    description: 'Test Plex at bot startup to make sure everything is working.',
    process: function (client, message, query, prefix, data) {
      plex.query('/').then(function (result) {
        console.log('Name: ' + result.MediaContainer.friendlyName);
        console.log('Media Container Version: ' + result.MediaContainer.version);
      }, function (err) {
        console.log(`Oops. An error occured: ${err}`);
      });
    }
  },
  clearqueue: {
    usage: '',
    fieldName: 'clearQueue',
    description: 'Clears all songs in the queue.',
    process: function (client, message, query, prefix, data) {
      if (songQueue.length > 0) {
        songQueue = []; // remove all songs from queue

        message.reply('**The queue has been cleared.**');
      }
      else {
        message.reply('**There are no songs in the queue.**');
      }
    }
  },
  nextpage: {
    usage: '',
    fieldName: 'nextpage',
    description: "Get next page of songs if the desired song isn't listed.",
    process: function (client, message, query, prefix, data) {
      findSong(plexQuery, plexOffset, plexPageSize, message, prefix);
    }
  },
  pause: {
    usage: '',
    fieldName: 'pause',
    description: 'Pauses the current song if one is playing.',
    process: function (client, message, query, prefix, data) {
      if (isPlaying) {
        dispatcher.pause(); // pause song
        isPaused = true;
        var embedObj = {
          embed: {
            color: 16424969,
            description: '**Playback has been paused.**',
          }
        };
        message.channel.send('**Update:**', embedObj);
      }
      else {
        message.reply('**Nothing currently playing.**');
      }
    }
  },
  play: {
    usage: '<song title or artist>',
    fieldName: 'play',
    description: "The bot will join your voice channel and play the song if it's available. If there's more than one, the bot will show a list to choose from.",
    process: function (client, message, query, prefix, data) {
      // if song request exists
      if (query.length > 0) {
        plexOffset = 0; // reset paging
        plexQuery = null; // reset query for !nextpage

        findSong(query, plexOffset, plexPageSize, message, prefix);
      }
      else {
        message.reply('**Please enter a song title or artist name.**');
      }
    }
  },
  playsong: {
    usage: '<song number>',
    fieldName: 'playsong',
    description: 'Play a song from the generated song list.',
    process: function (client, message, query, prefix, data) {
      const songNumber = parseInt(query) - 1;

      addToQueue(songNumber, tracks, message, prefix);
    }
  },
  removesong: {
    usage: '<song queue number>',
    fieldName: 'removesong',
    description: 'Removes song by position in the queue.',
    process: function (client, message, query, prefix, data) {
      const songNumber = parseInt(query) - 1;

      if (songQueue.length > 0) {
        if (songNumber > -1 && songNumber <= songQueue.length) {
          if (songNumber === 0) {
            plexCommands.skip.process(client, message, query, prefix, data);
          } else {
            // remove by index (splice)
            const removedSong = songQueue.splice(songNumber, 1)[0];
            message.reply(`**You have removed \"${removedSong.artist} - ${removedSong.title}\" from the queue.**`);
          }
        } else {
          if (songNumber < 0){
            message.reply("**There are no negative queue indices, but you knew that, didn't you? Be nice.**");
          }
          else { //if (songNumber > songQueue.length) {
            message.reply("**Hey there, hotshot, that queue index is a bit too high. Try viewing the queue.**");
          }
        }
      } else {
        message.reply('**There are no songs in the queue.**');
      }
    }
  },
  resume: {
    usage: '',
    fieldName: 'resume',
    description: 'Skips the current song if one is playing and plays the next song in queue if there is one.',
    process: function (client, message, query, prefix, data) {
      if (isPaused) {

        dispatcher.resume(); // run dispatcher.end events in playSong
        var embedObj = {
          embed: {
            color: 4251856,
            description: '**Playback has been resumed.**',
          }
        };
        message.channel.send('**Update:**', embedObj);
      }
      else {
        message.reply('**Nothing is paused.**');
      }
    }
  },
  skip: {
    usage: '',
    fieldName: 'skip',
    description: 'skips the current song if one is playing and plays the next song in queue if it exists',
    process: function (client, message, query, prefix, data) {
      if (isPlaying) {
        message.channel.send(`${songQueue[0].artist} - ${songQueue[0].title} has been **skipped.**`);
        dispatcher.end(); // run dispatcher.end events in playSong
      }
      else {
        message.reply('**Nothing currently playing.**');
      }
    }
  },
  stop: {
    usage: '',
    fieldName: 'stop',
    description: 'stops song if one is playing',
    process: function (client, message, query, prefix, data) {
      if (isPlaying) {
        songQueue = []; // removes all songs from queue
        dispatcher.end(); // stop dispatcher from playing audio

        var embedObj = {
          embed: {
            color: 10813448,
            description: '**Playback has been stopped.**',
          }
        };
        message.channel.send('**Update:**', embedObj);
      }
      else {
        message.reply('**Nothing currently playing.**');
      }
    }
  },
  viewqueue: {
    usage: '',
    fieldName: 'viewqueue',
    description: 'Displays the current song queue.',
    process: function (client, message, query, prefix, data) {
      //var messageLines = '\n**Song Queue:**\n\n';

      var messageLines = '';

      if (songQueue.length > 0) {
        for (var t = 0; t < songQueue.length; t++) {
          messageLines += `${(t + 1)} - ${songQueue[t].artist} - ${songQueue[t].title}\n`;
        }

        messageLines += `\n***${prefix}removesong <number>** to remove a song.*`;
        messageLines += `\n***${prefix}skip** to skip the current song.*`;

        var embedObj = {
          embed: {
            color: 2389639,
            description: messageLines,
          }
        };

        message.channel.send('\n**Song Queue:**\n\n', embedObj);
      }
      else {
        message.reply('**There are no songs in the queue.**');
      }
    }
  }
};

/**
 * Contains an array of all plex command values.
 * Must be kept in sync with `plexCommands` object.
 */
const plexCommandsEnumerable = [
  assertExists(plexCommands.clearqueue),
  assertExists(plexCommands.nextpage),
  assertExists(plexCommands.pause),
  assertExists(plexCommands.play),
  assertExists(plexCommands.playsong),
  assertExists(plexCommands.plexTest),
  assertExists(plexCommands.removesong),
  assertExists(plexCommands.resume),
  assertExists(plexCommands.skip),
  assertExists(plexCommands.stop),
  assertExists(plexCommands.viewqueue),
];

export { plexCommands, plexCommandsEnumerable };
