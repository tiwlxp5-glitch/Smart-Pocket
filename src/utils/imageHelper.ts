export const compressImage = (file: File): Promise<{ dataUrl: string; blob: Blob }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const MAX_SIZE = 1200
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width
          width = MAX_SIZE
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height
          height = MAX_SIZE
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        // Convert dataURL -> Blob for uploading to Storage
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ dataUrl, blob })
            else reject(new Error('Blob conversion failed'))
          },
          'image/jpeg',
          0.7
        )
      }
      img.onerror = reject
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
