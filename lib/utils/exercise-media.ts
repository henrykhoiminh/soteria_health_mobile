import { supabase } from '../supabase/client'
import { decode } from 'base64-arraybuffer'

const BUCKET_NAME = 'exercise-media'
const MAX_VIDEO_SIZE_MB = 100

/**
 * Validate file size before upload
 * @param uri - Local file URI
 * @param maxSizeMB - Maximum allowed size in MB
 * @returns Object with valid flag and size info
 */
export async function validateFileSize(
  uri: string,
  maxSizeMB: number
): Promise<{ valid: boolean; sizeMB: number; error?: string }> {
  try {
    const response = await fetch(uri)
    const blob = await response.blob()
    const sizeMB = blob.size / (1024 * 1024)

    if (sizeMB > maxSizeMB) {
      return {
        valid: false,
        sizeMB,
        error: `File too large: ${sizeMB.toFixed(1)}MB (max ${maxSizeMB}MB)`,
      }
    }

    return { valid: true, sizeMB }
  } catch (error) {
    console.error('Error validating file size:', error)
    return { valid: false, sizeMB: 0, error: 'Failed to check file size' }
  }
}

/**
 * Upload exercise demo video to Supabase Storage
 * @param exerciseId - Exercise ID (or temp ID for new exercises)
 * @param videoUri - Local video URI from image picker
 * @returns Public URL of uploaded video
 */
export async function uploadExerciseVideo(
  exerciseId: string,
  videoUri: string
): Promise<string> {
  try {
    // Validate file size
    const validation = await validateFileSize(videoUri, MAX_VIDEO_SIZE_MB)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Fetch and convert to base64
    const response = await fetch(videoUri)
    const blob = await response.blob()
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })

    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    )

    // Generate unique filename
    const fileExt = videoUri.split('.').pop()?.toLowerCase() || 'mp4'
    const fileName = `${exerciseId}-${Date.now()}.${fileExt}`
    const filePath = `videos/${fileName}`

    // Determine content type
    let contentType = 'video/mp4'
    if (fileExt === 'mov') contentType = 'video/quicktime'
    if (fileExt === 'webm') contentType = 'video/webm'

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, decode(base64), {
        contentType,
        upsert: false,
      })

    if (error) {
      // Check for file size error from Supabase
      if (error.message?.toLowerCase().includes('size') ||
          error.message?.toLowerCase().includes('exceeded')) {
        throw new Error(
          `Video file is too large for the server (${validation.sizeMB.toFixed(1)}MB). ` +
          `Please run the database migration to update the storage bucket limit, ` +
          `or select a smaller video.`
        )
      }
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading exercise video:', error)
    throw error
  }
}

/**
 * Delete exercise media from Supabase Storage
 * @param url - Public URL of the media to delete
 */
export async function deleteExerciseMedia(url: string): Promise<void> {
  try {
    // Extract file path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/exercise-media/images/xxx.jpg
    const urlParts = url.split(`/storage/v1/object/public/${BUCKET_NAME}/`)
    if (urlParts.length !== 2) {
      console.warn('Invalid media URL format, skipping delete:', url)
      return
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Error deleting exercise media:', error)
      // Don't throw - deletion failure shouldn't block other operations
    }
  } catch (error) {
    console.error('Error deleting exercise media:', error)
    // Don't throw - deletion failure shouldn't block other operations
  }
}

/**
 * Check if the current user can upload exercise media
 * @returns true if user has health_team or admin role
 */
export async function canUploadExerciseMedia(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'health_team' || profile?.role === 'admin'
  } catch (error) {
    console.error('Error checking upload permissions:', error)
    return false
  }
}
