# Suda
Discord Bot utilizing discord.js
Derived in part from [DougleyBot](https://github.com/SteamingMutt/DougleyBot)

## To-Do List
- Compartmentalize (most) command operations within process()
- Restructure messages to use Rich Embed
- Add music bot functionality
- Add basic logging tools
- Add unit testing
  - Add Travis integration for testing
- Add command aliasing

## Improvements for Individual Commands
- core-lenny: add contingency for when bot does not have "manage messages" permission

## Improvements for Individual Methods
- warframe-sendOnce: refactor using callbacks instead of switch statements w/ processWarframe
