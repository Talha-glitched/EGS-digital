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
  const tracks = Array.from(document.querySelectorAll('.marquee-track:not([data-marquee-doubled="true"])'));
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

function hydrateReveals(revealSelector) {
  if (!revealSelector) return () => {};

  const observerOptions = { threshold: 0.08, rootMargin: '0px 0px -40px 0px' };

  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      observerOptions
    );
  }

  // Track the elements we have decorated to clean them up on unmount
  const observedEls = new Set();

  function checkAndObserve() {
    const els = document.querySelectorAll(revealSelector);
    els.forEach((el) => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
      }
      if (observer && !observedEls.has(el)) {
        observer.observe(el);
        observedEls.add(el);
      } else if (!observer) {
        el.classList.add('in');
      }
    });
  }

  // Run initial check
  checkAndObserve();

  // Set up MutationObserver to watch for additions of matching elements dynamically
  const mutationObserver = new MutationObserver(() => {
    checkAndObserve();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    mutationObserver.disconnect();
    if (observer) {
      observer.disconnect();
    }
    observedEls.forEach((el) => {
      if (el.isConnected) {
        el.classList.remove('reveal', 'in');
      }
    });
  };
}

export function usePageLifecycle(title, options = {}) {
  const { revealSelector } = options;
  const navigate = useNavigate();

  useEffect(() => {
    document.title = title;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [title]);

  useEffect(() => {
    const cleanupMarquees = hydrateMarquees();
    const cleanupReveals = hydrateReveals(revealSelector);

    return () => {
      cleanupReveals();
      cleanupMarquees();
    };
  }, [revealSelector]);

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
