import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart Pocket - แอพรายรับรายจ่ายอัจฉริยะ',
    short_name: 'รายรับรายจ่าย',
    description: 'จดบันทึกรายรับรายจ่ายด้วย AI สแกนสลิปอัตโนมัติ',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#38BDF8',
    icons: [
      {
        src: '/app-icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/app-icon.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
