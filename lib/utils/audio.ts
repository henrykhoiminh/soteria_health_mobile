import { Audio } from 'expo-av'

// Sound assets - using require for static asset bundling
const COUNTDOWN_BEEP_SOUND = require('@/assets/sounds/count_down_beep.mp3')
const EXTRACTION_MYSTICAL_SOUND = require('@/assets/sounds/extraction_mystical.mp3')

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
  } catch (error) {
    console.error('Error initializing audio:', error)
  }
}

/**
 * Play a countdown beep sound
 * Uses the custom mp3 file from assets/sounds/
 */
export async function playCountdownBeep(): Promise<void> {
  try {
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
 * Play the mystical extraction sound for character summoning animations
 * Used during onboarding character introduction sequences
 */
export async function playExtractionSound(): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      EXTRACTION_MYSTICAL_SOUND,
      { shouldPlay: true, volume: 0.7 }
    )

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync()
      }
    })
  } catch (error) {
    console.error('Error playing extraction sound:', error)
  }
}

/**
 * Cleanup function (kept for API compatibility)
 */
export async function cleanupAudio(): Promise<void> {
  // Audio.Sound instances auto-cleanup when unloaded
}
