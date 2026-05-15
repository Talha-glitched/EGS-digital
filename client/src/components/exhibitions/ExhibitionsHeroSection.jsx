import { motion } from 'motion/react';
import { images } from '../../pages/siteData.js';
import InquiryCtaButton from '../inquiry/InquiryCtaButton.jsx';

const exhibitionSublineItems = ['Custom stands', 'Pavilion builds', 'Product displays', 'Ready for opening day'];

export default function ExhibitionsHeroSection() {
  return (
    <section className="exhibitions-hero" aria-label="Exhibitions hero">
      <img
        className="exhibitions-hero-media"
        src={images.philipsArab}
        alt="Philips exhibition stand"
      />
      <div className="exhibitions-hero-shade" aria-hidden="true" />
      <div className="exhibitions-hero-copy">
        <motion.span
          className="exhibitions-kicker"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut' }}
        >
          Dubai / UAE exhibition stand contractor
        </motion.span>
        <motion.h1
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.1 }}
        >
          Exhibition stands built for opening day.
        </motion.h1>
        <motion.p
          className="minimal-service-rotating-subline"
          aria-label={exhibitionSublineItems.join(', ')}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.24 }}
        >
          <span className="minimal-service-subline-rotator" aria-hidden="true">
            {exhibitionSublineItems.map((item, index) => (
              <span key={item} style={{ animationDelay: `${index * 2.4}s` }}>
                {item}
              </span>
            ))}
          </span>
        </motion.p>
        <motion.div
          className="exhibitions-hero-actions"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.34 }}
        >
          <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary" arrow={false}>
            Tell us about your stand <span className="arrow">-&gt;</span>
          </InquiryCtaButton>
          <a href="/case-studies#philips-global-health-riyadh" className="btn btn-ghost">See proof</a>
        </motion.div>
      </div>
    </section>
  );
}
