const { createAudioResource, demuxProbe } = require("@discordjs/voice")
const { getInfo } = require('ytdl-core')
const youtubedl = require('youtube-dl-exec')

class YoutubeTrack {
    constructor(url, title, onStart, onFinish, onError) {
        this.url = url
        this.title = title
        this.onStart = onStart
        this.onFinish = onFinish
        this.onError = onError
    }

    createYoutubeResource() {
        return new Promise((resolve, reject) => {
            const process = youtubedl.exec(
                this.url,
                {
                    o: '-',
                    q: '',
                    f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                    r: '100K',
                },
                { stdio: ['ignore', 'pipe', 'ignore'] }
            )

            if (!process.stdout) {
                console.error('Youtube process does not have stdout')
                return
            }
            const stream = process.stdout
            const onError = error => {
                if (!process.killed) {
                    process.kill()
                }
                stream.resume()
                reject(error)
            }
            process
                .once('spawn', () => {
                    demuxProbe(stream)
                        .then(probe => (resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type }))))
                        .catch(onError)
                })
                .catch(onError)
        })
    }

    static async fromUrl(interaction, url) {
        const info = await getInfo(url)
        const title = info.videoDetails.title

        const track = new YoutubeTrack(url, title,
            () => {
                interaction.editReply({ content: `Now playing: **${track.title}**!`, ephemeral: true }).catch(console.warn)
            },
            () => {
                interaction.editReply({ content: `Now finished: **${track.title}**!`, ephemeral: true }).catch(console.warn)
            },
            (error) => {
                console.warn(error);
                interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn)
            }
        )

        return track
    }
}

module.exports = {
    YoutubeTrack: YoutubeTrack
}