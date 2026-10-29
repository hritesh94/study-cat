// A photo of a syllabus, made small enough to send: at most 1600 px on the
// long side, as JPEG. → { mimeType, data (base64), bytes } or throws.
const MAX_SIDE = 1600
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function shrinkImage(file) {
  if (!file.type.startsWith('image/')) throw new Error("That's not a picture.")
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  for (const quality of [0.85, 0.7, 0.5]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      return { mimeType: 'image/jpeg', data, bytes: blob.size }
    }
  }
  throw new Error('That picture is too big, even after shrinking it (over 5 MB).')
}
