export default function HomeServicesSection({ services }) {
  return (
    <section className="section-band alt home-services-section">
      <div className="container">
        <div className="section-head">
          <h2 className="home-intro-title">We are EGS Shaping high stakes physical brand moments for 15+ years</h2>
          <p>Every deadline has moving parts. EGS keeps them moving.
EGS is a Dubai production house for high-stakes physical brand moments across the UAE. When the requirement changes late and the date cannot move, we keep the work moving until it is ready and correct. Instead of images can we show the cards like this</p>
        </div>
        <div className="home-services-gallery">
          <div className="service-grid">
            {services.map((service) => (
              <a className="service-card" href={service.href} key={service.href}>
                <div className="media">
                  <img src={service.image} alt={service.title} />
                </div>
                <div className="body">
                  <small>{service.label}</small>
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
