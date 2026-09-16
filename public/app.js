// ==================== ROUTERIDE APP ====================
const API = ''; // same origin

let currentRide = null;
let selectedRideType = 'comfort';
let paymentMethod = 'cash';
let map = null;
let mapMarkers = [];
let pollInterval = null;

// Lagos demo coordinates
const LOCATIONS = {
  pickup: { lat: 6.6018, lng: 3.3515, name: '123 Allen Avenue, Ikeja' },
  dest: { lat: 6.4281, lng: 3.4219, name: 'Victoria Island, Lagos' }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadRideTypes();
  loadPopularDestinations();
  loadWallet();
});

function startApp() {
  // Already inside the phone mockup; just ensure home is visible
  showScreen('home');
  document.getElementById('landing').scrollIntoView({ behavior: 'smooth' });
}

// ==================== SCREENS ====================
function showScreen(name) {
  const screens = ['home', 'booking', 'searching', 'trip', 'activity', 'wallet', 'profile'];
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.toggle('hidden', s !== name);
  });

  // Bottom nav visibility
  const nav = document.getElementById('bottom-nav');
  if (['booking', 'searching', 'trip'].includes(name)) {
    nav.classList.add('hidden');
  } else {
    nav.classList.remove('hidden');
  }

  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.nav === name || (name === 'home' && btn.dataset.nav === 'ride');
    btn.classList.toggle('text-brand-600', isActive);
    btn.classList.toggle('text-gray-400', !isActive);
  });

  if (name === 'activity') loadActivity();
  if (name === 'trip' && currentRide) initMap();
}

// ==================== DATA LOADING ====================
async function loadRideTypes() {
  try {
    const res = await fetch(`${API}/api/ride-types`);
    const types = await res.json();
    const container = document.getElementById('ride-types');
    container.innerHTML = types.map(t => `
      <button onclick="selectRideType('${t.id}')" 
        class="ride-type-btn border-2 rounded-2xl p-3 text-left transition hover:border-brand-400
        ${t.id === selectedRideType ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white'}">
        <div class="text-2xl mb-1">${t.icon}</div>
        <p class="font-semibold text-sm text-gray-900">${t.name}</p>
        <p class="text-brand-600 font-bold text-sm">₦${t.basePrice.toLocaleString()}</p>
        <p class="text-xs text-gray-400">${t.eta} min</p>
      </button>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadPopularDestinations() {
  try {
    const res = await fetch(`${API}/api/destinations`);
    const dests = await res.json();
    const container = document.getElementById('popular-dest');
    container.innerHTML = dests.map(d => `
      <button onclick="setDestination('${d.name}', ${d.lat}, ${d.lng})" 
        class="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-brand-50 transition">
        <span class="text-2xl">${d.icon}</span>
        <span class="text-[11px] font-medium text-gray-700 text-center leading-tight">${d.name}</span>
      </button>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadWallet() {
  try {
    const res = await fetch(`${API}/api/user`);
    const user = await res.json();
    document.getElementById('wallet-balance').textContent = `₦${user.wallet.toLocaleString()}`;
  } catch (e) {}
}

async function loadActivity() {
  try {
    const res = await fetch(`${API}/api/rides`);
    const rides = await res.json();
    const container = document.getElementById('activity-list');
    if (!rides.length) {
      container.innerHTML = `<p class="text-gray-400 text-sm text-center py-8">No rides yet. Request your first ride!</p>`;
      return;
    }
    container.innerHTML = rides.map(r => `
      <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold text-sm">${r.destination?.name || 'Trip'}</p>
            <p class="text-xs text-gray-400 mt-0.5">${new Date(r.createdAt).toLocaleString()}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded-full ${
            r.status === 'completed' ? 'bg-brand-100 text-brand-700' :
            r.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
          }">${r.status.replace('_', ' ')}</span>
        </div>
        <div class="flex justify-between items-center mt-3 text-sm">
          <span class="text-gray-500">${r.rideType?.name || ''} · ${r.distanceKm} km</span>
          <span class="font-bold text-gray-900">₦${r.price?.toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

// ==================== RIDE FLOW ====================
function selectRideType(id) {
  selectedRideType = id;
  loadRideTypes(); // re-render with selection
  // Auto go to booking
  prepareBooking();
}

function setDestination(name, lat, lng) {
  document.getElementById('dest-input').value = name;
  LOCATIONS.dest = { lat, lng, name };
  prepareBooking();
}

async function prepareBooking() {
  const pickupName = document.getElementById('pickup-input').value || LOCATIONS.pickup.name;
  const destName = document.getElementById('dest-input').value || LOCATIONS.dest.name;

  document.getElementById('confirm-pickup').textContent = pickupName;
  document.getElementById('confirm-dest').textContent = destName;

  try {
    const res = await fetch(`${API}/api/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickupLat: LOCATIONS.pickup.lat,
        pickupLng: LOCATIONS.pickup.lng,
        destLat: LOCATIONS.dest.lat,
        destLng: LOCATIONS.dest.lng,
        rideTypeId: selectedRideType
      })
    });
    const data = await res.json();

    document.getElementById('confirm-price').textContent = `₦${data.price.toLocaleString()}`;
    document.getElementById('confirm-distance').textContent = `${data.distanceKm} km`;

    const type = data.rideType;
    document.getElementById('confirm-ride-type').innerHTML = `
      <div class="text-3xl">${type.icon}</div>
      <div class="flex-1">
        <p class="font-bold">${type.name}</p>
        <p class="text-sm text-gray-500">${type.eta} min away · ${type.seats} seats</p>
      </div>
      <p class="font-bold text-brand-600">₦${data.price.toLocaleString()}</p>
    `;
  } catch (e) {
    console.error(e);
  }

  showScreen('booking');
}

function setPayment(method) {
  paymentMethod = method;
  ['cash', 'card', 'wallet'].forEach(m => {
    const btn = document.getElementById(`pay-${m}`);
    if (m === method) {
      btn.className = 'flex-1 py-2.5 rounded-xl border-2 border-brand-500 bg-brand-50 text-brand-700 font-medium text-sm';
    } else {
      btn.className = 'flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm';
    }
  });
}

async function requestRide() {
  showScreen('searching');
  let progress = 20;
  const progressEl = document.getElementById('search-progress');
  const progressTimer = setInterval(() => {
    progress = Math.min(90, progress + 15);
    progressEl.style.width = progress + '%';
  }, 600);

  try {
    const res = await fetch(`${API}/api/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: { ...LOCATIONS.pickup, name: document.getElementById('pickup-input').value },
        destination: { ...LOCATIONS.dest, name: document.getElementById('dest-input').value },
        rideTypeId: selectedRideType,
        paymentMethod
      })
    });
    currentRide = await res.json();

    // Poll until driver assigned
    pollInterval = setInterval(async () => {
      const r = await (await fetch(`${API}/api/rides/${currentRide.id}`)).json();
      currentRide = r;
      if (r.status === 'driver_assigned' || r.status === 'arriving' || r.status === 'on_trip') {
        clearInterval(pollInterval);
        clearInterval(progressTimer);
        progressEl.style.width = '100%';
        setTimeout(() => {
          showTripScreen(r);
        }, 400);
      }
    }, 800);
  } catch (e) {
    clearInterval(progressTimer);
    alert('Could not request ride. Please try again.');
    showScreen('home');
  }
}

function showTripScreen(ride) {
  currentRide = ride;
  const d = ride.driver || {};
  document.getElementById('driver-photo').textContent = d.photo || '👨‍💼';
  document.getElementById('driver-name').textContent = d.name || 'Driver';
  document.getElementById('driver-rating').textContent = d.rating || '4.8';
  document.getElementById('driver-rides').textContent = d.rides ? (d.rides >= 1000 ? (d.rides/1000).toFixed(1) + 'k' : d.rides) : '0';
  document.getElementById('driver-car').textContent = `${d.car || 'Car'} · ${d.plate || ''}`;
  document.getElementById('trip-pickup').textContent = ride.pickup?.name || '';
  document.getElementById('trip-dest').textContent = ride.destination?.name || '';
  document.getElementById('trip-price').textContent = `₦${ride.price?.toLocaleString()}`;
  document.getElementById('trip-payment').textContent = ride.paymentMethod === 'cash' ? 'Cash' : ride.paymentMethod === 'card' ? 'Card' : 'Wallet';
  document.getElementById('trip-status-text').textContent = ride.status === 'on_trip' ? "You're on your way" : 'Driver is arriving';
  document.getElementById('trip-eta-text').textContent = `Arriving in ${ride.etaMinutes || 5} min`;

  const now = new Date();
  document.getElementById('trip-pickup-time').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const arrive = new Date(now.getTime() + (ride.etaMinutes || 10) * 60000);
  document.getElementById('trip-dest-time').textContent = arrive.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  showScreen('trip');
  setTimeout(() => initMap(), 100);

  // Simulate trip progress
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    try {
      const r = await (await fetch(`${API}/api/rides/${currentRide.id}/progress`, { method: 'POST' })).json();
      currentRide = r;
      document.getElementById('trip-status-text').textContent =
        r.status === 'arriving' ? 'Driver is arriving' :
        r.status === 'on_trip' ? "You're on your way" :
        r.status === 'completed' ? 'Trip completed!' : r.status;
      document.getElementById('trip-eta-text').textContent =
        r.status === 'completed' ? 'You have arrived' : `Arriving in ${r.etaMinutes} min`;

      if (r.status === 'completed') {
        clearInterval(pollInterval);
        setTimeout(() => {
          alert('🎉 You have arrived! Thanks for riding with Routeride.');
          showScreen('home');
          currentRide = null;
        }, 1500);
      }
    } catch (e) {}
  }, 4000);
}

function initMap() {
  if (map) {
    map.remove();
    map = null;
  }
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  map = L.map('map', { zoomControl: false, attributionControl: false }).setView(
    [(LOCATIONS.pickup.lat + LOCATIONS.dest.lat) / 2, (LOCATIONS.pickup.lng + LOCATIONS.dest.lng) / 2],
    12
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Pickup marker
  L.marker([LOCATIONS.pickup.lat, LOCATIONS.pickup.lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="background:#10b981;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }).addTo(map);

  // Destination marker
  L.marker([LOCATIONS.dest.lat, LOCATIONS.dest.lng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }).addTo(map);

  // Route line
  L.polyline([
    [LOCATIONS.pickup.lat, LOCATIONS.pickup.lng],
    [LOCATIONS.dest.lat, LOCATIONS.dest.lng]
  ], { color: '#10b981', weight: 4, opacity: 0.8 }).addTo(map);

  // Car icon (midway for demo)
  const midLat = (LOCATIONS.pickup.lat + LOCATIONS.dest.lat) / 2;
  const midLng = (LOCATIONS.pickup.lng + LOCATIONS.dest.lng) / 2;
  L.marker([midLat, midLng], {
    icon: L.divIcon({
      className: '',
      html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚗</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  }).addTo(map);

  map.fitBounds([
    [LOCATIONS.pickup.lat, LOCATIONS.pickup.lng],
    [LOCATIONS.dest.lat, LOCATIONS.dest.lng]
  ], { padding: [30, 30] });
}

async function cancelRide() {
  if (currentRide) {
    try {
      await fetch(`${API}/api/rides/${currentRide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
    } catch (e) {}
  }
  if (pollInterval) clearInterval(pollInterval);
  currentRide = null;
  showScreen('home');
}

function shareRide() {
  if (navigator.share && currentRide) {
    navigator.share({
      title: 'My Routeride trip',
      text: `I'm on a Routeride to ${currentRide.destination?.name}. Track me!`,
      url: window.location.href
    }).catch(() => {});
  } else {
    alert('Share link copied! (Demo)');
  }
}

// Make functions global for onclick
window.startApp = startApp;
window.showScreen = showScreen;
window.selectRideType = selectRideType;
window.setDestination = setDestination;
window.setPayment = setPayment;
window.requestRide = requestRide;
window.cancelRide = cancelRide;
window.shareRide = shareRide;
window.prepareBooking = prepareBooking;
