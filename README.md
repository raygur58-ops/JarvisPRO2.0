# Jarvis Pro — by Sergio

Windows desktop application inspired by the supplied Jarvis Pro reference.

## Install

Run `release/Jarvis Pro by Sergio Setup 1.0.2.exe` and follow the installer. It creates Start menu and desktop shortcuts.

The app checks the public [GitHub Releases](https://github.com/raygur58-ops/JarvisPRO2.0/releases) feed when it starts and every four hours. It downloads newer releases in the background and offers to restart to install them. The first release must be published before update checks can find a version.

## Publish an update

Update `version` in `package.json`, commit the change, then push a matching version tag such as `v1.0.3`. The GitHub Actions workflow builds the Windows installer and publishes the release assets used by the updater.

## Run from source

Install Node.js, then run `npm install` followed by `npm start`.

The animated interface works locally. Chat replies are currently a local placeholder; an AI service needs to be connected for real assistant responses.
