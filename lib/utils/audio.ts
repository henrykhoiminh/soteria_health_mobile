import { Audio } from 'expo-av'

// Sound asset - using require for static asset bundling
const COUNTDOWN_BEEP_SOUND = require('@/assets/sounds/count_down_beep.mp3')

// Pre-loaded sound instance for faster playback
let preloadedBeepSound: Audio.Sound | null = null

/**
 * Initialize audio settings for background playback
 */
export async function initAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    })

    // Pre-load the beep sound for faster playback
    await preloadCountdownSound()
  } catch (error) {
    console.error('Error initializing audio:', error)
  }
}

/**
 * Pre-load the countdown sound for instant playback
 */
async function preloadCountdownSound(): Promise<void> {
  try {
    if (preloadedBeepSound) {
      await preloadedBeepSound.unloadAsync()
    }
    const { sound } = await Audio.Sound.createAsync(COUNTDOWN_BEEP_SOUND)
    preloadedBeepSound = sound
  } catch (error) {
    console.error('Error preloading countdown sound:', error)
  }
}

/**
 * Play a countdown beep sound
 * Uses the custom mp3 file from assets/sounds/
 */
export async function playCountdownBeep(): Promise<void> {
  try {
    // Create a new sound instance each time for reliable playback
    const { sound } = await Audio.Sound.createAsync(
      COUNTDOWN_BEEP_SOUND,
      { shouldPlay: true, volume: 0.8 }
    )

    // Unload the sound after playing to free memory
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync()
      }
    })
  } catch (error) {
    console.error('Error playing countdown beep:', error)
  }
}

/**
 * Play a completion sound (same beep, could be customized later)
 */
export async function playCompletionSound(): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      COUNTDOWN_BEEP_SOUND,
      { shouldPlay: true, volume: 1.0 }
    )

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync()
      }
    })
  } catch (error) {
    console.error('Error playing completion sound:', error)
  }
}

/**
 * Cleanup all loaded sounds
 */
export async function cleanupAudio(): Promise<void> {
  try {
    if (preloadedBeepSound) {
      await preloadedBeepSound.unloadAsync()
      preloadedBeepSound = null
    }
  } catch (error) {
    console.error('Error cleaning up audio:', error)
  }
}
