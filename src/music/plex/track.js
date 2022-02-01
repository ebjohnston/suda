const { createAudioResource, demuxProbe } = require("@discordjs/voice")
const http = require('http')

const { plex } = require('../../../settings.json')

const host = `http://${plex.hostname}:${plex.port}`
const token = `?X-Plex-Token=${plex.token}`

class PlexTrack {
    constructor(interaction, track) {
        console.log(`creating plex track from ${JSON.stringify(track)}`)
        this.key = track.Media[0].Part[0].key

        this.artist = track.grandparentTitle

        this.album = {
            "title": track.parentTitle,
            "year": track.parentYear
        }

        this.title = track.title

        this.onStart = () => {
            interaction.editReply({ content: `Now playing: **${this.title}**!`, ephemeral: true }).catch(console.warn)
        }
        this.onFinish = () => {
            interaction.editReply({ content: `Now finished: **${this.title}**!`, ephemeral: true }).catch(console.warn)
        }
        this.onError = (error) => {
            console.warn(error);
            interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn)
        }
    }

    getPlexResource() {
        return new Promise(async (resolve, reject) => {
            // const got = await import('got')
            // console.log(`got artifact expanded: ${JSON.stringify(got)}`)

            const url = `${host}${this.key}${token}`
            console.log(`plex resource URL: ${url}`)

            http.get(url, (plexStream) => {
                demuxProbe(plexStream)
                .then(probe => (resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type }))))
                .catch(error => {
                    plexStream.resume()
                    reject(error)
                })
            })
        })
    }
}

module.exports = {
    PlexTrack: PlexTrack
}