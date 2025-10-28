import { Navigation } from '@/components/Navigation';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { AboutSection } from '@/components/home/AboutSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <HowItWorksSection />
      <Footer />
    </div>
  );
}
