const PlexAPI = require('plex-api')

const { plex } = require('../../../settings.json')

const api = new PlexAPI({
    hostname: plex.hostname,
    port: plex.port,
    username: plex.username,
    password: plex.password,
    token: plex.token,
    options: {
        identifier: plex.options.identifier,
        deviceName: plex.options.deviceName,
        version: plex.options.version,
        product: plex.options.identifier,
        device: plex.options.device,
        platform: plex.options.platform
    }
})

async function testPlexConnection() {
    await api.query("/").then((result) => {
        container = result.MediaContainer
        console.log(`${container.friendlyName} running Plex Media Server ${container.version}`)
    },
    (error) => {
        console.warn(`Could not connect to the Plex server`, error)
    })
}


async function getSearchPage(query, pageNumber) {
    let container

    const pageSize = 10
    const searchQuery = `/search/?type=10&query=${query}&X-Plex-Container-Start=${pageNumber * pageSize}&X-Plex-Container-Size=${pageSize}`
    
    console.log(`before query...`)
    await api.query(searchQuery).then((result) => {
        console.log(`inside plex search result...`)
        console.log (`search result: ${result} and stringified ${JSON.stringify(result)}`)
        container = result.MediaContainer
    },
    (error) => {
        console.warn(error)
    })

    return container
}

async function getImage(track) {
    if (track.thumb) {
        return await api.query(`${track.thumb}&X-Plex-Container-Start=${0}&X-Plex-Container-Size=${1}`)
    }
}

module.exports = {
    testPlexConnection: testPlexConnection,
    getSearchPage: getSearchPage,
    getImage: getImage
}