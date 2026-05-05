import { motion } from 'motion/react';
import BlurText from './BlurText.jsx';
import { images } from '../pages/siteData.js';
import hctHeroPoster from '../assets/HCT.jpeg';
import hctHeroVideo from '../assets/hctgraduation.mp4';
import './HomeHero.css';

const defaultServices = [
  'Exhibitions & Museums',
  'Product Launches',
  'Graduation Ceremonies',
  'Events',
  'Brand and Retail Activations',
  'Interior Fitouts',
];

export default function HomeHero({
  videoSrc = hctHeroVideo,
  posterSrc = hctHeroPoster,
  kicker = 'Dubai / UAE production house for 15+ years',
  title = 'Shaping Brand Moments across the Gulf.',
  services = defaultServices,
}) {
  return (
    <section className="egs-home-video-hero" aria-label="EGS hero">
      <video
        className="egs-home-video-media"
        src={videoSrc}
        poster={posterSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="egs-home-video-shade" aria-hidden="true" />
      <div className="egs-home-video-copy">
        <span className="egs-home-video-kicker">{kicker}</span>
        <motion.h1
          className="egs-home-video-heading"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.1 }}
        >
          {title}
        </motion.h1>
        <motion.div
          className="egs-home-video-services"
          aria-label="EGS services"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.24 }}
        >
          <span className="egs-home-video-service-rotator" aria-hidden="true">
            {services.map((item, index) => (
              <span key={item} style={{ animationDelay: `${index * 3.33}s` }}>
                {item}
              </span>
            ))}
          </span>
          <span className="egs-home-video-service-a11y">
            {services.join(', ').replace(/, ([^,]*)$/, ', and $1')}.
          </span>
        </motion.div>
      </div>
    </section>
  );
}
