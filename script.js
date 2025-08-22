// Idea Playground — minimal, fast, no onboarding required.

const ideaInput = document.getElementById('ideaInput');
const submitBtn = document.getElementById('submitBtn');
const statusText = document.getElementById('statusText');
const spinner = document.getElementById('spinner');
const needle = document.getElementById('needle');
const gaugeReading = document.getElementById('gaugeReading');

const submittedColumnBody = document.querySelector('.column[data-column="submitted"] .column-body');

let currentPredictToken = 0;

// Debounce helper
function debounce(fn, wait = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Simple, deterministic heuristic "prediction engine"
function predictPageViews(text) {
  return new Promise((resolve) => {
    const token = ++currentPredictToken;
    spinner.style.display = 'inline-block';
    statusText.textContent = 'Predicting…';

    // Simulate async latency
    setTimeout(() => {
      // Basic scoring
      const content = (text || '').toLowerCase();
      let score = 0;

      // Length-based features
      const words = content.split(/\s+/).filter(Boolean);
      const w = words.length;
      if (w >= 4) score += 10;
      if (w >= 8) score += 10;
      if (w >= 12) score += 10;
      if (w >= 20) score += 5;

      // Keyword boosts commonly associated with high engagement
      const boosts = [
        'exclusive','breaking','investigation','scandal','leak','revealed',
        'election','debate','results','explainer','analysis','interview','q&a',
        'guide','how to','tips','vs','ranked','top','best','timeline',
        'celebrity','influencer','tiktok','instagram','youtube','ai','chatgpt',
        'startup','climate','wildfire','earthquake','storm','crime',
        'sports','transfer','trade','final','championship','verdict'
      ];
      boosts.forEach(k => {
        if (content.includes(k)) score += 8;
      });

      // Numbers/dates
      const numberHits = (content.match(/\b\d{1,4}\b/g) || []).length;
      score += Math.min(4, numberHits) * 5;

      // Locality / community angle
      if (/(city|local|neighborhood|downtown|school|campus|council)\b/.test(content)) score += 6;

      // Penalties
      if (w < 3) score -= 8;
      if (content.length > 220) score -= 6; // too long may be unfocused
      if (/(lorem ipsum|test|asdf)/.test(content)) score -= 20;

      // Normalize to 0..100
      score = Math.max(0, Math.min(100, score));

      let zone = 'Low';
      if (score >= 34 && score < 67) zone = 'Mid';
      if (score >= 67) zone = 'High';

      // If token is stale (user typed again), ignore
      if (token !== currentPredictToken) return;

      spinner.style.display = 'none';
      resolve({ score, zone });
    }, 520);
  });
}

// Map zone to angle on semi-circle: -90deg (Low) to +90deg (High)
function zoneToAngle(zone, score) {
  const normalized = typeof score === 'number' ? score : (zone === 'Low' ? 16 : zone === 'Mid' ? 50 : 84);
  return -90 + (normalized / 100) * 180;
}

function setNeedle(angle) {
  needle.style.transform = `rotate(${angle}deg)`;
}

function updateGauge(zone, score) {
  const angle = zoneToAngle(zone, score);
  setNeedle(angle);

  gaugeReading.textContent = zone;
  statusText.classList.remove('status-low', 'status-mid', 'status-high');

  if (zone === 'Low') {
    statusText.textContent = 'Predicted PVs: Low';
    statusText.classList.add('status-low');
  } else if (zone === 'Mid') {
    statusText.textContent = 'Predicted PVs: Mid';
    statusText.classList.add('status-mid');
  } else {
    statusText.textContent = 'Predicted PVs: High';
    statusText.classList.add('status-high');
  }

  submitBtn.hidden = zone !== 'High';
}

// Time ago helpers
function formatTimeAgo(createdAtMs) {
  const diffMs = Date.now() - Number(createdAtMs);
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return `${s} secs ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function ensureTimeElement(card) {
  let timeEl = card.querySelector('.card-time');
  if (!timeEl) {
    timeEl = document.createElement('div');
    timeEl.className = 'card-time';
    card.appendChild(timeEl);
  }
  return timeEl;
}

function addTimeToCard(card, createdAtMs = Date.now()) {
  card.dataset.createdAt = String(createdAtMs);
  const timeEl = ensureTimeElement(card);
  timeEl.textContent = formatTimeAgo(createdAtMs);
}

function updateAllCardTimes() {
  document.querySelectorAll('.card').forEach((card) => {
    const createdAt = card.dataset.createdAt;
    if (createdAt) {
      const timeEl = ensureTimeElement(card);
      timeEl.textContent = formatTimeAgo(createdAt);
    }
  });
}

// Metadata chips (User Needs + Categories)
const USER_NEEDS = ['Update me', 'Entertain me', 'Educate me'];
const CATEGORIES = ['Politics', 'Property', 'Entertainment', 'Lifestyle'];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMetaToCard(card, need, category) {
  if (card.querySelector('.card-meta')) return;
  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const needChip = document.createElement('span');
  needChip.className = 'chip chip-need';
  needChip.textContent = need;

  const catChip = document.createElement('span');
  catChip.className = 'chip chip-cat';
  catChip.textContent = category;

  meta.append(needChip, catChip);
  card.appendChild(meta);
}

// Initial gauge state
(function initGauge() {
  setNeedle(-90);
  statusText.textContent = 'Waiting for input…';
  spinner.style.display = 'none';
  submitBtn.hidden = true;
})();

// Enrich existing sample cards with mock metadata and time
document.querySelectorAll('.card').forEach((card) => {
  addMetaToCard(card, randomPick(USER_NEEDS), randomPick(CATEGORIES));
  // Backdate sample cards randomly within the last 7 days for realism
  const randomPastMs = Date.now() - randomInt(10_000, 7 * 24 * 60 * 60 * 1000);
  addTimeToCard(card, randomPastMs);
});

// Keep times fresh
setInterval(updateAllCardTimes, 30_000);

// Handle input typing -> predict
const handlePredict = debounce(async () => {
  const text = ideaInput.value.trim();
  if (!text) {
    spinner.style.display = 'none';
    statusText.textContent = 'Waiting for input…';
    statusText.classList.remove('status-low', 'status-mid', 'status-high');
    updateGauge('Low', 0);
    submitBtn.hidden = true;
    return;
  }

  const { score, zone } = await predictPageViews(text);
  updateGauge(zone, score);
}, 380);

ideaInput.addEventListener('input', handlePredict);

// Submit idea to board
submitBtn.addEventListener('click', () => {
  const text = ideaInput.value.trim();
  if (!text) return;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('draggable', 'true');

  const p = document.createElement('p');
  p.textContent = text;
  card.appendChild(p);

  addMetaToCard(card, randomPick(USER_NEEDS), randomPick(CATEGORIES));
  addTimeToCard(card, Date.now());

  submittedColumnBody.prepend(card);
  attachCardDnD(card);

  // Clear input and reset
  ideaInput.value = '';
  currentPredictToken++; // invalidate pending predictions
  submitBtn.hidden = true;
  statusText.textContent = 'Idea submitted.';
  statusText.classList.remove('status-low', 'status-mid', 'status-high');
  statusText.classList.add('status-high');
  updateGauge('Low', 0);

  // Subtle acknowledgement animation
  card.animate(
    [
      { transform: 'scale(0.98)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
      { transform: 'scale(1)', boxShadow: '0 10px 24px rgba(0,0,0,0.10)' }
    ],
    { duration: 220, easing: 'ease-out' }
  );
  updateAllCardTimes();
});

// Drag & Drop (HTML5) with smart insertion
const columns = document.querySelectorAll('.column-body');

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function attachColumnDnD(column) {
  column.addEventListener('dragover', (e) => {
    e.preventDefault();
    column.classList.add('drag-over');
    const afterElement = getDragAfterElement(column, e.clientY);
    const dragging = document.querySelector('.card.dragging');
    if (!dragging) return;
    if (afterElement == null) {
      column.appendChild(dragging);
    } else {
      column.insertBefore(dragging, afterElement);
    }
  });

  column.addEventListener('dragleave', () => {
    column.classList.remove('drag-over');
  });

  column.addEventListener('drop', () => {
    column.classList.remove('drag-over');
  });
}

function attachCardDnD(card) {
  card.addEventListener('dragstart', () => {
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });
}

// Init DnD for existing elements
columns.forEach(attachColumnDnD);
document.querySelectorAll('.card').forEach(attachCardDnD);

// Accessibility: Cmd/Ctrl+Enter to submit if prediction is High
ideaInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter' && !submitBtn.hidden) {
    e.preventDefault();
    submitBtn.click();
  }
});
