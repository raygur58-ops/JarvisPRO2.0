# Jarvis Pro — by Sergio

Windows desktop application inspired by the supplied Jarvis Pro reference.

## Install

Run `release/Jarvis Pro by Sergio Setup 1.0.4.exe` and follow the installer. It creates Start menu and desktop shortcuts.

## Connect OpenRouter

Open the gear button in the app, create an API key at [OpenRouter](https://openrouter.ai/settings/keys), paste it into the settings, and save. The API address defaults to `https://openrouter.ai/api/v1`; the key is encrypted with Windows DPAPI on this computer. The default chat model is `openrouter/auto`; the model ID can be changed in settings.

The microphone records locally, then sends the recording to OpenRouter's speech-to-text endpoint using `openai/whisper-1` by default. Voice transcription uses your OpenRouter balance. The blue waveform button transcribes and sends the recognized text; the microphone button puts the transcript in the composer.

The app checks the public [GitHub Releases](https://github.com/raygur58-ops/JarvisPRO2.0/releases) feed when it starts and every four hours. It downloads newer releases in the background and offers to restart to install them. The first release must be published before update checks can find a version.

## Publish an update

Update `version` in `package.json`, commit the change, then push a matching version tag such as `v1.0.4`. The GitHub Actions workflow builds the Windows installer and publishes the release assets used by the updater.

## Run from source

Install Node.js, then run `npm install` followed by `npm start`.

The AI and speech-to-text features require an OpenRouter API key and internet access.
