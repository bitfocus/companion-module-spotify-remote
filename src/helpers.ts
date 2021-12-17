import { SpotifyInstanceBase } from './types'

// Limit the number of retries that we do
const MAX_ATTEMPTS = 5

export async function ChangeVolume(
	instance: SpotifyInstanceBase,
	deviceId: string,
	absolute: boolean,
	volumeOrDelta: number,
	attempt = 0
): Promise<void> {
	if (isNaN(volumeOrDelta)) {
		instance.debug(`Invalid volume change: ${volumeOrDelta} isAbsolute=${absolute}`)
		return
	}

	try {
		const data = await instance.spotifyApi.getMyDevices()
		const selectedDevice = data.body.devices.find((dev) => dev.id === deviceId)
		// TODO - if dev.type == 'Tablet' || dev.type == 'Phone', then we can't do increments? or should that have been set the volume at all?

		// Device doesn't look valid
		if (!selectedDevice || typeof selectedDevice.volume_percent !== 'number') return

		let newVolume = absolute ? volumeOrDelta : selectedDevice.volume_percent + volumeOrDelta
		if (newVolume < 0) newVolume = 0
		if (newVolume > 100) newVolume = 100

		await instance.spotifyApi.setVolume(newVolume, {
			device_id: deviceId,
		})
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangeVolume(instance, deviceId, absolute, volumeOrDelta, attempt + 1)
		}
	}
}

export async function SkipSong(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<void> {
	try {
		await instance.spotifyApi.skipToNext({ device_id: deviceId })
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return SkipSong(instance, deviceId, attempt + 1)
		}
	}
}
export async function PreviousSong(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<void> {
	try {
		await instance.spotifyApi.skipToPrevious({ device_id: deviceId })
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return PreviousSong(instance, deviceId, attempt + 1)
		}
	}
}

export async function TransferPlayback(instance: SpotifyInstanceBase, deviceId: string, attempt = 0): Promise<void> {
	try {
		await instance.spotifyApi.transferMyPlayback([deviceId], {
			play: true,
		})
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return TransferPlayback(instance, deviceId, attempt + 1)
		}
	}
}

export async function ChangePlayState(
	instance: SpotifyInstanceBase,
	deviceId: string,
	action: 'play' | 'pause' | 'toggle',
	attempt = 0
): Promise<void> {
	try {
		const data = await instance.spotifyApi.getMyCurrentPlaybackState()

		if ((action === 'pause' || action === 'toggle') && data.body.is_playing) {
			await instance.spotifyApi.pause({ device_id: deviceId })
		} else if ((action === 'play' || action === 'toggle') && !data.body.is_playing) {
			await instance.spotifyApi.play({ device_id: deviceId })
		}
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangePlayState(instance, deviceId, action, attempt + 1)
		}
	}
}

export async function ChangeRepeatState(
	instance: SpotifyInstanceBase,
	deviceId: string,
	target: 'off' | 'track' | 'context',
	attempt = 0
): Promise<void> {
	try {
		// Check if already in desired state
		const data = await instance.spotifyApi.getMyCurrentPlaybackState()
		if (data.body.repeat_state === target) return

		await instance.spotifyApi.setRepeat(target)
	} catch (err) {
		const retry = await instance.checkIfApiErrorShouldRetry(err)
		if (retry && attempt <= MAX_ATTEMPTS) {
			return ChangeRepeatState(instance, deviceId, target, attempt + 1)
		}
	}
}