/* ============================================
   VYBE – Components Module
   Reusable UI component generators
   ============================================ */

const VybeComponents = (() => {
  'use strict';

  const IMAGES = [
    'assets/images/event1.png',
    'assets/images/event2.png',
    'assets/images/event3.png',
    'assets/images/event4.png',
  ];

  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const INITIALS = ['AJ','KL','MR','TS','DP','JW','LN','RB'];
  const COLORS = ['#7B61FF','#F472B6','#4ADE80','#FB923C','#60A5FA','#FACC15'];

  /* --- Generate mock avatar stack HTML --- */
  function avatarStack(count, size) {
    size = size || 32;
    let html = '';
    const show = Math.min(count, 5);
    for (let i = 0; i < show; i++) {
      const bg = COLORS[i % COLORS.length];
      html += `<div class="avatar" style="width:${size}px;height:${size}px;background:${bg}">${INITIALS[i]}</div>`;
    }
    return html;
  }

  function miniAvatarStack(count) {
    let html = '';
    const show = Math.min(count, 3);
    for (let i = 0; i < show; i++) {
      const bg = COLORS[i % COLORS.length];
      html += `<div class="mini-avatar" style="background:${bg}">${INITIALS[i]}</div>`;
    }
    return html;
  }

  /* --- Create a single event card HTML --- */
  function eventCard(event) {
    const img = IMAGES[event.imageIndex % IMAGES.length];
    const month = MONTHS[event.month];
    const catClass = event.category;

    return `
      <article class="event-card" data-category="${event.category}" onclick="window.location.href='pages/event.html'">
        <div class="card-image">
          <img src="${img}" alt="${event.title}" loading="lazy" />
          <div class="card-date-badge">
            <span class="month">${month}</span>
            <span class="day">${event.day}</span>
          </div>
          <button class="card-save-btn" onclick="event.stopPropagation(); VybeApp.toggleSave(this);" aria-label="Save">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <div class="card-category-strip">
            <span class="event-category-tag ${catClass}">${event.categoryLabel}</span>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title">${event.title}</h3>
          <div class="card-meta">
            <span class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${event.date}
            </span>
            <span class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${event.venue}
            </span>
          </div>
          <div class="card-footer">
            <span class="card-price">${event.price}</span>
            <div class="card-attendees">
              <div class="mini-avatars">${miniAvatarStack(3)}</div>
              <span>+${event.attendees}</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /* --- Recommended card --- */
  function recCard(event) {
    const img = IMAGES[event.imageIndex % IMAGES.length];
    return `
      <div class="rec-card" onclick="window.location.href='pages/event.html'">
        <div class="rec-card-img">
          <img src="${img}" alt="${event.title}" loading="lazy" />
        </div>
        <div class="rec-card-body">
          <span class="event-category-tag ${event.category}">${event.categoryLabel}</span>
          <h3>${event.title}</h3>
          <p class="rec-meta">${event.date} · ${event.venue}</p>
        </div>
      </div>
    `;
  }

  /* --- Autocomplete item --- */
  function autocompleteItem(item) {
    return `
      <div class="autocomplete-item" onclick="window.location.href='pages/event.html'">
        <span class="ac-icon">${item.icon}</span>
        <span>${item.name}</span>
        <span class="ac-meta">${item.meta}</span>
      </div>
    `;
  }

  /* --- Show toast notification --- */
  function showToast(message, duration) {
    duration = duration || 2500;
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), duration);
  }

  return { eventCard, recCard, autocompleteItem, avatarStack, miniAvatarStack, showToast };
})();
