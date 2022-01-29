# Cephalon Suda
Discord Bot utilizing discord.js (v13)

## Installation
1. Clone this repo
    ```
    git clone https://github.com/ebjohnston/suda.git
    ```

1. Install node project manager dependencies [Note: requires NPM to be installed already]
    ```
    cd suda
    npm install
    ```

1. Configure `settings.json` in the root installation directory. See `settings.json.example` for a template.

1. Start bot by navigating to core directory and initializing main.js
    ```
    node src/core/main.js
    ```

## Feature List
- Application command support (discord.js v13)
- Modular and extensible code organization with flags for each module
- A music bot which supports multiple input sources
    - YouTube integration
    - (Pending) Plex integration

## To-Do List
### Overall Functionality
- [ ] Make sure app command deployment works with fresh server
- [ ] Add basic logging tools
- [ ] Add unit testing
- [ ] Plex integration
- [ ] Path of Exile integration
    - [ ] PoE commands
    - [ ] PoE subscriptions

### Individual Commands
- [ ] core/img: Allow adding new images from discord CLI

### Documentation
- [ ] Add installation / configuration instructions
    - [x] installation
    - [ ] configuration
- [ ] Add badges for version / npm / testing / etc
