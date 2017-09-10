# Cephalon Suda
Discord Bot utilizing discord.js  
derived in part from [DougleyBot](https://github.com/SteamingMutt/DougleyBot)

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

1. Start bot by navigating to core directory and initializing core.js
    ```
    cd source/core
    node core.js
    ```

## To-Do List
### Overall Functionality
- [ ] Compartmentalize (most) command operations within process()
- [ ] Restructure messages to use Rich Embed
- [ ] Add music bot functionality
- [ ] Add basic logging tools
- [ ] Add unit testing
    - [ ] Add Travis integration for testing
- [ ] Add command aliasing
- [ ] Allow multiple servers with the same names to be used
- [ ] Rework help into an anonymous function call for each command (for additional information)
- [x] Allow more than one server to receive passive Warframe data
- [ ] Add restart / update commands
- [ ] Allow adding new images from discord CLI

### Individual Commands
- [ ] core/lenny: add contingency for when bot does not have "manage messages" permission

### Individual Methods
[none currently]

### Documentation
- [ ] Add features separated by category (core, warframe, music, etc.)
- [ ] Add installation / configuration instructions
    - [x] installation
    - [ ] configuration
- [x] Decide on and include a license for redistribution
- [ ] Add badges for version / npm / testing / etc
