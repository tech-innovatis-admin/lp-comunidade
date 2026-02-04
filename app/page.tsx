import Navbar from "./components/Navbar"
import HeroSection from "./components/HeroSection"
import InnovaNationSection from "./components/InnovaNationSection"
import TestimonialsSection from "./components/TestimonialsSection"
import RegistrationFormSection from "./components/RegistrationFormSection"
import CTASection from "./components/CTASection"
import WhatsAppButton from "./components/WhatsAppButton"
import { whatsappConfig } from "./config/whatsapp"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 relative z-10">
        <HeroSection />

        <InnovaNationSection />

        <TestimonialsSection />

        <RegistrationFormSection />
      </main>
{/* 
      <CTASection />
      <WhatsAppButton phoneNumber={whatsappConfig.phoneNumber} message={whatsappConfig.defaultMessage} /> */}
    </>
  );
}
