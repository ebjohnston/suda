const {
    AudioPlayerStatus,
    VoiceConnectionStatus,
    createAudioPlayer,
    entersState,
    joinVoiceChannel,
    getVoiceConnection
} = require('@discordjs/voice')

class MusicSubscription {
    constructor(connection) {
        this.connection = connection
        this.player = createAudioPlayer()
        this.queue = []
        this.queueLock = false
        this.readyLock = false

        this.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ])
                // Seems to be reconnecting to a new channel - ignore disconnect
            } catch (error) {
                // Seems to be a real disconnect which SHOULDN'T be recovered from
                connection.destroy()
            }
        })

        this.connection.on(VoiceConnectionStatus.Destroyed, async (oldState, newState) => {
            this.stop()
        })

        this.connection.on(VoiceConnectionStatus.Connecting, async (oldState, newState) => {
            // 20 second timeout for connecting
            this.readyLock = true;
            try {
                await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
            } catch {
                if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    this.connection.destroy()
                }
            } finally {
                this.readyLock = false;
            }
        })

        this.connection.on(VoiceConnectionStatus.Signalling, async (oldState, newState) => {
            // 20 second timeout for signalling
            this.readyLock = true
            try {
                await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000)
            } catch {
                if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                    this.connection.destroy()
                }
            } finally {
                this.readyLock = false
            }
        })

        this.player.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
            oldState.resource.metadata.onFinish()
            this.processQueue()
        })

        this.player.on(AudioPlayerStatus.Playing, async (oldState, newState) => {
            newState.resource.metadata.onStart()
        })

        this.player.on('error', async (error) => {
            error.resource.metadata.onError(error)
        })

        connection.subscribe(this.player)
    }

    async enqueue(resource) {
        console.debug(`Starting enqueue...`)
        this.queue.push(resource)
        this.processQueue()
    }

    stop() {
        this.queueLock = true
        this.queue = []
        this.player.stop(true)
    }

    async processQueue() {
        console.debug('Starting process queue...')
        // If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
        if (this.queueLock || this.player.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
            return
        }

        // Lock the queue to guarantee safe access
        this.queueLock = true

        // Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
        const nextResource = this.queue.shift()
        try {
            this.player.play(nextResource)
        } catch (error) {
            // If an error occurred, try the next item of the queue instead
            console.warn(error)
            return this.processQueue()
        } finally {
            this.queueLock = false
        }
    }
}

module.exports = {
    MusicSubscription: MusicSubscription
}