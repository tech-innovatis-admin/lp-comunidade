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
        {/* Hero Section */}
        <HeroSection />

        {/* InnovaNation Section */}
        <InnovaNationSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* Registration Form Section */}
        <RegistrationFormSection />

        {/* Final CTA Section */}
        <CTASection />
      </main>
    </>
  );
}
