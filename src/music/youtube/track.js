const { createAudioResource, demuxProbe } = require("@discordjs/voice")
const { exec } = require('youtube-dl-exec')

class YoutubeTrack {
    constructor(interaction, url, title) {
        this.url = url
        this.title = title

        this.onStart = () => {
            interaction.editReply({ content: `Now playing: **${this.title}**!`, ephemeral: true }).catch(console.warn)
        }
        this.onFinish = () => {
            interaction.editReply({ content: `Now finished: **${this.title}**!`, ephemeral: true }).catch(console.warn)
        }
        this.onError = (error) => {
            console.warn(error)
            interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn)
        }
    }

    getYoutubeResource() {
        return new Promise((resolve, reject) => {
            const process = exec(
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
}

module.exports = {
    YoutubeTrack: YoutubeTrack
}