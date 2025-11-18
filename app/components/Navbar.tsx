import Image from 'next/image'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121826]/80 backdrop-blur-md border-b border-gray-800/50">
      <div className="max-w-screen-xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-center">
        <Image 
          src="/logo_innovatis.png" 
          alt="Innovatis Logo"
          width={150}
          height={40}
          className="h-8 sm:h-10 w-auto"
          priority
        />
      </div>
    </nav>
  )
}
