/* ============================================
   VYBE – Animations Module
   Handles scroll animations, parallax, particles
   ============================================ */

const VybeAnimations = (() => {
  'use strict';

  /* --- Scroll-based navbar background --- */
  function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Intersection Observer for card reveal --- */
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.event-card, .badge-card, .rec-card').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  /* --- Hero parallax on scroll --- */
  function initParallax() {
    const heroImg = document.querySelector('.hero-img');
    if (!heroImg) return;
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroImg.style.transform = `scale(1.1) translateY(${scrolled * 0.3}px)`;
      }
    }, { passive: true });
  }

  /* --- Floating particles in hero --- */
  function initParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 4 + 2;
      Object.assign(p.style, {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        borderRadius: '50%',
        background: `rgba(123, 97, 255, ${Math.random() * 0.4 + 0.1})`,
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animation: `floatParticle ${Math.random() * 10 + 8}s ease-in-out infinite`,
        animationDelay: `-${Math.random() * 10}s`,
      });
      container.appendChild(p);
    }
    // Inject keyframes once
    if (!document.getElementById('particleKeyframes')) {
      const style = document.createElement('style');
      style.id = 'particleKeyframes';
      style.textContent = `
        @keyframes floatParticle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate(30px, -40px) scale(1.2); opacity: 1; }
          50% { transform: translate(-20px, -80px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(40px, -30px) scale(1.1); opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* --- Stagger card animations --- */
  function staggerCards(selector) {
    const cards = document.querySelectorAll(selector);
    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * 0.08}s`;
    });
  }

  /* --- Initialize all --- */
  function init() {
    initNavbarScroll();
    initParallax();
    initParticles();
    // Delay reveal init so DOM cards exist
    setTimeout(() => {
      initScrollReveal();
      staggerCards('.event-card');
    }, 600);
  }

  return { init, initScrollReveal, staggerCards };
})();
