const {
    AudioPlayerStatus,
    VoiceConnectionStatus,
    createAudioPlayer,
    entersState,
    joinVoiceChannel
} = require('@discordjs/voice')

class MusicSubscription {
    // global for tracking map of guilds to subscriptions (enabled multiple instances)
    static subscriptions = {}

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

    stop() {
        this.queueLock = true
        this.queue = []
        this.player.stop(true)
    }

    async enqueue(resource) {
        console.debug(`Starting enqueue...`)
        this.queue.push(resource)
        this.processQueue()
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

    static async pushMusicResource(interaction, getMusicResource) {
        let subscription = this.subscriptions[interaction.guildId]
    
        // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
        // and create a subscription.
        if (!subscription) {
            if (interaction.member && interaction.member.voice.channel) {
                const channel = interaction.member.voice.channel;
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                })
                subscription = new MusicSubscription(connection)
                subscription.connection.on('error', console.warn)
            }
            else {
                await interaction.editReply('Join a voice channel and then try that again!')
                return
            }
            this.subscriptions[interaction.guildId] = subscription
        }
    
        // Make sure the connection is ready before processing the user's request
        try {
            console.debug(`before voice connection status is ${subscription.connection.state.status}`)
            await entersState(subscription.connection, VoiceConnectionStatus.Ready, 20e3)
            console.debug(`after voice connection status is ${subscription.connection.state.status}`)
        } catch (error) {
            console.warn(error)
            await interaction.editReply(`Failed to join voice channel within 20 seconds, please try again later!`)
            return
        }
    
        try {
            subscription.enqueue(await getMusicResource())
        } catch (error) {
            console.warn(error);
            await interaction.editReply('Failed to queue track, please try again later!')
        }
    }
}

module.exports = {
    MusicSubscription: MusicSubscription
}