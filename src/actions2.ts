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
