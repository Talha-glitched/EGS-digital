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
  const observedEls = new Set();
  const intersectedEls = new Set();

  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            intersectedEls.add(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      observerOptions
    );
  }

  function checkAndObserve() {
    const els = document.querySelectorAll(revealSelector);
    els.forEach((el) => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
      }
      if (intersectedEls.has(el)) {
        el.classList.add('in');
      } else if (observer && !observedEls.has(el)) {
        observer.observe(el);
        observedEls.add(el);
      } else if (!observer) {
        el.classList.add('in');
      }
    });
  }

  // Run initial check
  checkAndObserve();

  // Set up MutationObserver to watch for additions and updates of matching elements dynamically
  const mutationObserver = new MutationObserver((mutations) => {
    const hasExternalChanges = mutations.some((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const el = mutation.target;
        const matches = typeof el.matches === 'function' && el.matches(revealSelector);
        if (matches) {
          const missingReveal = !el.classList.contains('reveal');
          const missingIn = intersectedEls.has(el) && !el.classList.contains('in');
          return missingReveal || missingIn;
        }
      }
      return mutation.type === 'childList';
    });

    if (hasExternalChanges) {
      checkAndObserve();
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
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

function setMetaTag(name, content, attribute = 'name') {
  if (!content) return;
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonicalLink(href) {
  if (!href) return;
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setStructuredData(data) {
  if (!data) return;
  let element = document.getElementById('json-ld-structured-data');
  if (!element) {
    element = document.createElement('script');
    element.setAttribute('type', 'application/ld+json');
    element.setAttribute('id', 'json-ld-structured-data');
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

export function usePageLifecycle(title, options = {}) {
  const { revealSelector, description, canonical, ogImage, ogType, structuredData } = options;
  const navigate = useNavigate();
  const structuredDataStr = structuredData ? JSON.stringify(structuredData) : '';

  useEffect(() => {
    document.title = title;
    window.scrollTo({ top: 0, behavior: 'auto' });

    // Update description tag
    if (description) {
      setMetaTag('description', description);
    }

    // Update canonical link
    const canonicalUrl = canonical || `${window.location.origin}${window.location.pathname}`;
    setCanonicalLink(canonicalUrl);

    // Update Open Graph (og:) tags
    setMetaTag('og:title', title, 'property');
    if (description) {
      setMetaTag('og:description', description, 'property');
    }
    setMetaTag('og:url', canonicalUrl, 'property');
    setMetaTag('og:type', ogType || 'website', 'property');
    if (ogImage) {
      setMetaTag('og:image', ogImage, 'property');
    }

    // Update Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    if (description) {
      setMetaTag('twitter:description', description);
    }
    if (ogImage) {
      setMetaTag('twitter:image', ogImage);
    }

    // Update JSON-LD Structured Data
    if (structuredDataStr) {
      setStructuredData(JSON.parse(structuredDataStr));
    }

    return () => {
      // Clean up script tag on unmount or route change
      const element = document.getElementById('json-ld-structured-data');
      if (element) {
        element.remove();
      }
    };
  }, [title, description, canonical, ogImage, ogType, structuredDataStr]);

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
