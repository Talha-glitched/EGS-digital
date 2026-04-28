import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function isPlainLeftClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
}

function shouldHandleLink(anchor) {
  const href = anchor.getAttribute('href');

  if (
    !href ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    anchor.target ||
    anchor.hasAttribute('download')
  ) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin;
}

function hydrateMarquees() {
  const tracks = Array.from(document.querySelectorAll('.marquee-track'));
  const originals = tracks.map((track) => [track, track.innerHTML]);

  tracks.forEach((track) => {
    track.innerHTML += track.innerHTML;
  });

  return () => {
    originals.forEach(([track, html]) => {
      if (track.isConnected) {
        track.innerHTML = html;
      }
    });
  };
}

function hydrateReveals() {
  const revealEls = Array.from(document.querySelectorAll('.reveal'));

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

export function usePageLifecycle(title) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = title;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [title]);

  useEffect(() => {
    const cleanupMarquees = hydrateMarquees();
    const cleanupReveals = hydrateReveals();

    return () => {
      cleanupReveals();
      cleanupMarquees();
    };
  }, []);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!isPlainLeftClick(event) || event.defaultPrevented) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest('a[href]');
      if (!anchor || !shouldHandleLink(anchor)) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    }

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [navigate]);
}
