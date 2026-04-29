/* ============================================
   VYBE – Main Application Module
   Orchestrates UI, data, interactions
   ============================================ */

const VybeApp = (() => {
  'use strict';

  /* -------------------------------------------------------
     MOCK DATA
     TODO: Replace with Supabase queries
     Example:
       const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
     ------------------------------------------------------- */

  const MOCK_EVENTS = [
    { id:1, title:'Neon Dreams Festival 2026', category:'music', categoryLabel:'Music', date:'Sat, May 10 · 8PM', day:10, month:4, venue:'Brooklyn Mirage, NY', price:'$45', attendees:2400, imageIndex:0, mood:'energetic' },
    { id:2, title:'AI & The Future Summit', category:'tech', categoryLabel:'Tech', date:'Mon, May 12 · 9AM', day:12, month:4, venue:'Javits Center, NY', price:'$120', attendees:800, imageIndex:1, mood:'social' },
    { id:3, title:'Harvest & Vine Festival', category:'food', categoryLabel:'Food & Drink', date:'Sun, May 18 · 12PM', day:18, month:4, venue:'Hudson Valley, NY', price:'$35', attendees:1200, imageIndex:2, mood:'chill' },
    { id:4, title:'Warehouse Rave: Afterhours', category:'music', categoryLabel:'Music', date:'Fri, May 23 · 11PM', day:23, month:4, venue:'Avant Gardner, BK', price:'$30', attendees:3100, imageIndex:3, mood:'energetic' },
    { id:5, title:'Contemporary Art Walk', category:'art', categoryLabel:'Art & Culture', date:'Sat, May 24 · 2PM', day:24, month:4, venue:'Chelsea Galleries, NY', price:'Free', attendees:450, imageIndex:0, mood:'chill' },
    { id:6, title:'5K Glow Run', category:'sports', categoryLabel:'Sports', date:'Sun, May 25 · 7AM', day:25, month:4, venue:'Central Park, NY', price:'$25', attendees:5000, imageIndex:1, mood:'energetic' },
    { id:7, title:'Kids Science Expo', category:'family', categoryLabel:'Family', date:'Sat, Jun 7 · 10AM', day:7, month:5, venue:'Intrepid Museum, NY', price:'$15', attendees:700, imageIndex:2, mood:'social' },
    { id:8, title:'Sunset Yoga Retreat', category:'wellness', categoryLabel:'Wellness', date:'Sat, Jun 14 · 5PM', day:14, month:5, venue:'Montauk Beach, NY', price:'$40', attendees:300, imageIndex:3, mood:'chill' },
    { id:9, title:'Jazz Under The Stars', category:'music', categoryLabel:'Music', date:'Fri, Jun 20 · 7PM', day:20, month:5, venue:'Lincoln Center, NY', price:'$55', attendees:1800, imageIndex:0, mood:'romantic' },
    { id:10, title:'Startup Pitch Night', category:'tech', categoryLabel:'Tech', date:'Wed, Jun 25 · 6PM', day:25, month:5, venue:'WeWork SoHo, NY', price:'Free', attendees:250, imageIndex:1, mood:'social' },
    { id:11, title:'Street Food Market', category:'food', categoryLabel:'Food & Drink', date:'Sat, Jun 28 · 11AM', day:28, month:5, venue:'Smorgasburg, BK', price:'Free', attendees:4000, imageIndex:2, mood:'social' },
    { id:12, title:'Immersive Van Gogh', category:'art', categoryLabel:'Art & Culture', date:'Any day · All day', day:1, month:6, venue:'Pier 36, NY', price:'$40', attendees:6200, imageIndex:3, mood:'romantic' },
  ];

  const AUTOCOMPLETE_DATA = [
    { name:'Neon Dreams Festival', icon:'🎵', meta:'Music · May 10' },
    { name:'AI Summit 2026', icon:'💻', meta:'Tech · May 12' },
    { name:'Brooklyn Mirage', icon:'📍', meta:'Venue · Brooklyn' },
    { name:'Harvest & Vine', icon:'🍷', meta:'Food · May 18' },
    { name:'Central Park', icon:'📍', meta:'Venue · Manhattan' },
    { name:'Jazz Under The Stars', icon:'🎷', meta:'Music · Jun 20' },
  ];

  /* -------------------------------------------------------
     STATE
     ------------------------------------------------------- */
  let currentCategory = 'all';
  let currentMood = null;
  let loadedCount = 0;
  const BATCH_SIZE = 6;
  let isLoading = false;
  let allFiltered = [];

  /* -------------------------------------------------------
     SUPABASE PLACEHOLDER
     TODO: Initialize Supabase client
     Example:
       import { createClient } from '@supabase/supabase-js'
       const supabase = createClient('YOUR_URL', 'YOUR_ANON_KEY');
     
     Tables structure:
       events: id, title, category, date, venue, price, image_url, lat, lng, mood, created_at
       users: id, email, display_name, avatar_url, created_at
       attendance: id, user_id, event_id, status, created_at
     ------------------------------------------------------- */

  /* -------------------------------------------------------
     INIT
     ------------------------------------------------------- */
  function init() {
    setupTheme();
    setupNav();
    setupSearch();
    setupFilters();
    setupModal();
    populateSpotlightAvatars();
    renderRecommended();
    filterAndRender();
    setupInfiniteScroll();
    VybeAnimations.init();
  }

  /* -------------------------------------------------------
     THEME
     ------------------------------------------------------- */
  function setupTheme() {
    const toggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem('vybe-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('vybe-theme', next);
      });
    }
  }

  /* -------------------------------------------------------
     NAVIGATION
     ------------------------------------------------------- */
  function setupNav() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
      });
    }
  }

  /* -------------------------------------------------------
     SEARCH & AUTOCOMPLETE
     ------------------------------------------------------- */
  function setupSearch() {
    const navInput = document.getElementById('navSearchInput');
    const heroInput = document.getElementById('heroSearchInput');
    const dropdown = document.getElementById('searchAutocomplete');

    function handleSearch(value) {
      if (!dropdown) return;
      const q = value.toLowerCase().trim();
      if (q.length < 2) { dropdown.classList.remove('active'); return; }
      const matches = AUTOCOMPLETE_DATA.filter(item =>
        item.name.toLowerCase().includes(q)
      );
      if (matches.length === 0) { dropdown.classList.remove('active'); return; }
      dropdown.innerHTML = matches.map(m => VybeComponents.autocompleteItem(m)).join('');
      dropdown.classList.add('active');
    }

    if (navInput) {
      navInput.addEventListener('input', () => handleSearch(navInput.value));
      navInput.addEventListener('blur', () => setTimeout(() => dropdown && dropdown.classList.remove('active'), 200));
    }
    /* Hero search just filters main grid */
    if (heroInput) {
      heroInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = heroInput.value.toLowerCase().trim();
          filterAndRender(q);
          document.getElementById('eventsSection').scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
    const heroBtn = document.getElementById('heroSearchBtn');
    if (heroBtn && heroInput) {
      heroBtn.addEventListener('click', () => {
        const q = heroInput.value.toLowerCase().trim();
        filterAndRender(q);
        document.getElementById('eventsSection').scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  /* -------------------------------------------------------
     FILTERS
     ------------------------------------------------------- */
  function setupFilters() {
    /* Category buttons */
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        filterAndRender();
      });
    });

    /* Mood buttons */
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          currentMood = null;
        } else {
          document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentMood = btn.dataset.mood;
        }
        filterAndRender();
      });
    });

    /* Advanced filters panel */
    const toggleBtn = document.getElementById('filterToggleBtn');
    const panel = document.getElementById('advancedFilters');
    if (toggleBtn && panel) {
      toggleBtn.addEventListener('click', () => panel.classList.toggle('open'));
    }

    /* Price slider display */
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    const priceDisplay = document.getElementById('priceDisplay');
    if (priceMin && priceMax && priceDisplay) {
      const updatePrice = () => {
        const lo = Math.min(+priceMin.value, +priceMax.value);
        const hi = Math.max(+priceMin.value, +priceMax.value);
        priceDisplay.textContent = `$${lo} – $${hi}`;
      };
      priceMin.addEventListener('input', updatePrice);
      priceMax.addEventListener('input', updatePrice);
    }

    /* Distance slider */
    const distSlider = document.getElementById('distanceSlider');
    const distDisplay = document.getElementById('distanceDisplay');
    if (distSlider && distDisplay) {
      distSlider.addEventListener('input', () => {
        distDisplay.textContent = distSlider.value + ' km';
      });
    }

    /* Clear filters */
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (priceMin) priceMin.value = 0;
        if (priceMax) priceMax.value = 500;
        if (priceDisplay) priceDisplay.textContent = '$0 – $500';
        if (distSlider) distSlider.value = 25;
        if (distDisplay) distDisplay.textContent = '25 km';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        VybeComponents.showToast('Filters cleared');
      });
    }

    /* Save filters */
    const saveBtn = document.getElementById('saveFilterBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        /* TODO: Save to Supabase user preferences */
        VybeComponents.showToast('✓ Filters saved to "My Filters"');
      });
    }

    /* View toggle */
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const grid = document.getElementById('eventGrid');
    if (gridBtn && listBtn && grid) {
      gridBtn.addEventListener('click', () => {
        gridBtn.classList.add('active'); listBtn.classList.remove('active');
        grid.classList.remove('list-view');
      });
      listBtn.addEventListener('click', () => {
        listBtn.classList.add('active'); gridBtn.classList.remove('active');
        grid.classList.add('list-view');
      });
    }
  }

  /* -------------------------------------------------------
     RENDER
     ------------------------------------------------------- */
  function filterAndRender(searchQuery) {
    allFiltered = MOCK_EVENTS.filter(ev => {
      if (currentCategory !== 'all' && ev.category !== currentCategory) return false;
      if (currentMood && ev.mood !== currentMood) return false;
      if (searchQuery && !ev.title.toLowerCase().includes(searchQuery) && !ev.venue.toLowerCase().includes(searchQuery)) return false;
      return true;
    });
    loadedCount = 0;
    const grid = document.getElementById('eventGrid');
    if (grid) grid.innerHTML = '';
    loadNextBatch();
    updateTitle();
  }

  function loadNextBatch() {
    const grid = document.getElementById('eventGrid');
    const skeleton = document.getElementById('skeletonGrid');
    if (!grid) return;
    if (loadedCount >= allFiltered.length) {
      if (skeleton) skeleton.style.display = 'none';
      return;
    }
    isLoading = true;
    if (skeleton && loadedCount === 0) skeleton.style.display = 'grid';

    /* Simulate network delay */
    setTimeout(() => {
      if (skeleton) skeleton.style.display = 'none';
      const batch = allFiltered.slice(loadedCount, loadedCount + BATCH_SIZE);
      batch.forEach((ev, i) => {
        const card = document.createElement('div');
        card.innerHTML = VybeComponents.eventCard(ev);
        const article = card.firstElementChild;
        article.style.animationDelay = `${i * 0.08}s`;
        grid.appendChild(article);
      });
      loadedCount += batch.length;
      isLoading = false;
      updateTitle();
      VybeAnimations.initScrollReveal();
    }, loadedCount === 0 ? 800 : 400);
  }

  function updateTitle() {
    const countEl = document.getElementById('eventCount');
    const titleEl = document.getElementById('eventsTitle');
    if (countEl) countEl.textContent = `Showing ${Math.min(loadedCount, allFiltered.length)} of ${allFiltered.length}`;
    if (titleEl) {
      if (currentCategory === 'all') titleEl.textContent = 'All Events';
      else titleEl.textContent = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1) + ' Events';
    }
  }

  /* -------------------------------------------------------
     INFINITE SCROLL
     ------------------------------------------------------- */
  function setupInfiniteScroll() {
    const sentinel = document.getElementById('loadMoreSentinel');
    const spinner = document.getElementById('loadSpinner');
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isLoading && loadedCount < allFiltered.length) {
        if (spinner) spinner.classList.add('active');
        loadNextBatch();
        setTimeout(() => { if (spinner) spinner.classList.remove('active'); }, 600);
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }

  /* -------------------------------------------------------
     RECOMMENDED
     ------------------------------------------------------- */
  function renderRecommended() {
    const container = document.getElementById('recommendedScroll');
    if (!container) return;
    /* TODO: Replace with Supabase personalized query
       const { data } = await supabase.rpc('get_recommendations', { user_id: currentUser.id }); */
    const recs = MOCK_EVENTS.slice(0, 6);
    container.innerHTML = recs.map(ev => VybeComponents.recCard(ev)).join('');
  }

  /* -------------------------------------------------------
     SPOTLIGHT AVATARS
     ------------------------------------------------------- */
  function populateSpotlightAvatars() {
    const el = document.getElementById('spotlightAvatars');
    if (el) el.innerHTML = VybeComponents.avatarStack(5);
  }

  /* -------------------------------------------------------
     MODAL
     ------------------------------------------------------- */
  function setupModal() {
    const overlay = document.getElementById('authModal');
    const closeBtn = document.getElementById('modalClose');
    const signInBtn = document.getElementById('signInBtn');
    const mobileSignIn = document.getElementById('mobileSignIn');

    function open() { if (overlay) overlay.classList.add('active'); }
    function close() { if (overlay) overlay.classList.remove('active'); }

    if (signInBtn) signInBtn.addEventListener('click', open);
    if (mobileSignIn) mobileSignIn.addEventListener('click', (e) => { e.preventDefault(); open(); });
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    /* TODO: Implement Supabase Auth
       const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' }); */
    const submitBtn = document.getElementById('authSubmitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        VybeComponents.showToast('✓ Welcome back to VYBE!');
        close();
      });
    }

    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) googleBtn.addEventListener('click', () => {
      VybeComponents.showToast('Google Auth — connect Supabase to enable');
    });
  }

  /* -------------------------------------------------------
     SAVE / HEART TOGGLE
     ------------------------------------------------------- */
  function toggleSave(btn) {
    btn.classList.toggle('saved');
    const isSaved = btn.classList.contains('saved');
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isSaved ? 'var(--accent-light)' : 'none');
    VybeComponents.showToast(isSaved ? '♥ Event saved' : 'Event removed');
    /* TODO: Supabase — toggle attendance
       await supabase.from('attendance').upsert({ user_id, event_id, status: 'saved' }); */
  }

  /* --- Public API --- */
  return { init, toggleSave };
})();

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', VybeApp.init);
