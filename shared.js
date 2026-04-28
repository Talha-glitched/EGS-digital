// Shared reveal-on-scroll + marquee duplication
(function(){
  // Reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Duplicate marquee content for seamless loop
  document.querySelectorAll('.marquee-track').forEach(track => {
    const html = track.innerHTML;
    track.innerHTML = html + html;
  });
})();
