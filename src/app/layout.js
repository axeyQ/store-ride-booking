import './globals.css'

export const metadata = {
  title: 'MR Travels - Bike Rental System',
  description: 'Digital bike and scooter rental management system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </body>
    </html>
  )
}

