// ==================== ROUTYRIDE APP ====================
const API = '';

let currentRide = null;
let selectedRideType = 'comfort';
let paymentMethod = 'cash';
let map = null;
let pollInterval = null;

const LOCATIONS = {
  pickup: { lat: 6.6018, lng: 3.3515, name: '123 Allen Avenue, Ikeja' },
  dest: { lat: 6.4281, lng: 3.4219, name: 'Victoria Island, Lagos' }
};

document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  loadRideTypes();
  loadPopularDestinations();
  loadWallet();
});

function setGreeting() {
  const h = new Date().getHours();
  const el = document.getElementById('greeting');
  if (!el) return;
  if (h < 12) el.textContent = 'Good morning,';
  else if (h < 17) el.textContent = 'Good afternoon,';
  else el.textContent = 'Good evening,';
}

function showScreen(name) {
  const screens = ['home', 'booking', 'searching', 'trip', 'activity', 'wallet', 'profile'];
  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (!el) return;
    if (s === name) {
      el.classList.remove('hidden');
      el.classList.add('screen-enter');
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
    } else {
      el.classList.add('hidden');
      el.classList.remove('screen-enter');
    }
  });

  const nav = document.getElementById('bottom-nav');
  if (['booking', 'searching', 'trip'].includes(name)) {
    nav.classList.add('hidden');
  } else {
    nav.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = btn.dataset.nav === name || (name === 'home' && (btn.dataset.nav === 'home' || btn.dataset.nav === 'ride'));
    btn.classList.toggle('text-brand-600', isActive);
    btn.classList.toggle('text-gray-400', !isActive);
  });

  if (name === 'activity') loadActivity();
  if (name === 'trip' && currentRide) setTimeout(() => initMap(), 50);
}

async function loadRideTypes() {
  try {
    const res = await fetch(API + '/api/ride-types');
    const types = await res.json();
    const container = document.getElementById('ride-types');
    if (!container) return;

    const displayPrices = { economy: 1500, comfort: 2500, suv: 4000, premium: 6000 };
    const displayEtas = { economy: 4, comfort: 6, suv: 8, premium: 10 };

    container.innerHTML = types.map(t => {
      const price = displayPrices[t.id] || t.basePrice;
      const eta = displayEtas[t.id] || t.eta;
      const selected = t.id === selectedRideType;
      return '<button onclick="selectRideType(\'' + t.id + '\')" class="ride-type-btn card-press relative border-2 rounded-2xl p-3 text-left transition-all duration-200 ' +
        (selected ? 'border-brand-500 bg-brand-50 shadow-md shadow-brand-100' : 'border-gray-100 bg-white hover:border-brand-200 hover:shadow-sm') + '">' +
        (selected ? '<span class="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">✓</span>' : '') +
        '<div class="text-2xl mb-1.5">' + t.icon + '</div>' +
        '<p class="font-semibold text-[13px] text-gray-900">' + t.name + '</p>' +
        '<p class="text-brand-600 font-bold text-sm mt-0.5">₦' + price.toLocaleString() + '</p>' +
        '<p class="text-[11px] text-gray-400 mt-0.5">' + eta + ' min</p></button>';
    }).join('');
  } catch (e) { console.error(e); }
}

async function loadPopularDestinations() {
  try {
    const res = await fetch(API + '/api/destinations');
    const dests = await res.json();
    const container = document.getElementById('popular-dest');
    if (!container) return;
    container.innerHTML = dests.map(d =>
      '<button onclick="setDestination(\'' + d.name + '\', ' + d.lat + ', ' + d.lng + ')" class="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-brand-50 active:bg-brand-100 transition card-press">' +
      '<span class="text-2xl">' + d.icon + '</span>' +
      '<span class="text-[11px] font-semibold text-gray-700 text-center leading-tight">' + d.name + '</span></button>'
    ).join('');
  } catch (e) { console.error(e); }
}

async function loadWallet() {
  try {
    const res = await fetch(API + '/api/user');
    const user = await res.json();
    const el = document.getElementById('wallet-balance');
    if (el) el.textContent = '₦' + user.wallet.toLocaleString();
  } catch (e) {}
}

async function loadActivity() {
  try {
    const res = await fetch(API + '/api/rides');
    const rides = await res.json();
    const container = document.getElementById('activity-list');
    if (!container) return;
    if (!rides.length) {
      container.innerHTML = '<div class="text-center py-16"><div class="text-4xl mb-3 opacity-40">🚗</div><p class="text-gray-400 text-sm">No rides yet. Request your first ride!</p></div>';
      return;
    }
    container.innerHTML = rides.map(function(r, i) {
      var statusClass = r.status === 'completed' ? 'bg-brand-100 text-brand-700' : r.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700';
      return '<div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm anim-slide-up" style="animation-delay:' + (i * 0.05) + 's">' +
        '<div class="flex justify-between items-start gap-2"><div class="min-w-0">' +
        '<p class="font-semibold text-sm text-gray-900 truncate">' + (r.destination && r.destination.name ? r.destination.name : 'Trip') + '</p>' +
        '<p class="text-[11px] text-gray-400 mt-0.5">' + new Date(r.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '</p></div>' +
        '<span class="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ' + statusClass + '">' + r.status.replace('_', ' ') + '</span></div>' +
        '<div class="flex justify-between items-center mt-3 text-sm">' +
        '<span class="text-gray-500 text-xs">' + (r.rideType ? r.rideType.name : '') + ' · ' + r.distanceKm + ' km</span>' +
        '<span class="font-bold text-gray-900">₦' + (r.price ? r.price.toLocaleString() : '0') + '</span></div></div>';
    }).join('');
  } catch (e) { console.error(e); }
}

function selectRideType(id) {
  selectedRideType = id;
  loadRideTypes();
  setTimeout(function() { prepareBooking(); }, 180);
}

function setDestination(name, lat, lng) {
  document.getElementById('dest-input').value = name;
  LOCATIONS.dest = { lat: lat, lng: lng, name: name };
  prepareBooking();
}

function swapLocations() {
  var pickupEl = document.getElementById('pickup-input');
  var destEl = document.getElementById('dest-input');
  var tmpVal = pickupEl.value;
  pickupEl.value = destEl.value;
  destEl.value = tmpVal;
  var tmpLoc = { lat: LOCATIONS.pickup.lat, lng: LOCATIONS.pickup.lng, name: LOCATIONS.pickup.name };
  LOCATIONS.pickup = { lat: LOCATIONS.dest.lat, lng: LOCATIONS.dest.lng, name: LOCATIONS.dest.name };
  LOCATIONS.dest = tmpLoc;
}

async function prepareBooking() {
  var pickupName = document.getElementById('pickup-input').value || LOCATIONS.pickup.name;
  var destName = document.getElementById('dest-input').value || LOCATIONS.dest.name;
  document.getElementById('confirm-pickup').textContent = pickupName;
  document.getElementById('confirm-dest').textContent = destName;

  try {
    var res = await fetch(API + '/api/estimate', {
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
    var data = await res.json();
    var displayPrices = { economy: 1500, comfort: 2500, suv: 4000, premium: 6000 };
    var price = displayPrices[selectedRideType] || data.price;
    document.getElementById('confirm-price').textContent = '₦' + price.toLocaleString();
    document.getElementById('confirm-distance').textContent = data.distanceKm + ' km';
    var type = data.rideType;
    document.getElementById('confirm-ride-type').innerHTML =
      '<div class="text-3xl">' + type.icon + '</div><div class="flex-1 min-w-0">' +
      '<p class="font-bold text-gray-900">' + type.name + '</p>' +
      '<p class="text-xs text-gray-500 mt-0.5">' + type.eta + ' min away · ' + type.seats + ' seats</p></div>' +
      '<p class="font-extrabold text-brand-600 text-lg">₦' + price.toLocaleString() + '</p>';
  } catch (e) { console.error(e); }
  showScreen('booking');
}

function setPayment(method) {
  paymentMethod = method;
  ['cash', 'card', 'wallet'].forEach(function(m) {
    var btn = document.getElementById('pay-' + m);
    if (!btn) return;
    if (m === method) {
      btn.className = 'flex-1 py-3 rounded-xl border-2 border-brand-500 bg-brand-50 text-brand-700 font-semibold text-xs btn-press transition';
    } else {
      btn.className = 'flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-xs btn-press transition';
    }
  });
}

async function requestRide() {
  showScreen('searching');
  var progress = 15;
  var progressEl = document.getElementById('search-progress');
  if (progressEl) progressEl.style.width = progress + '%';
  var progressTimer = setInterval(function() {
    progress = Math.min(92, progress + 12 + Math.random() * 8);
    if (progressEl) progressEl.style.width = progress + '%';
  }, 500);

  try {
    var res = await fetch(API + '/api/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: { lat: LOCATIONS.pickup.lat, lng: LOCATIONS.pickup.lng, name: document.getElementById('pickup-input').value },
        destination: { lat: LOCATIONS.dest.lat, lng: LOCATIONS.dest.lng, name: document.getElementById('dest-input').value },
        rideTypeId: selectedRideType,
        paymentMethod: paymentMethod
      })
    });
    currentRide = await res.json();
    pollInterval = setInterval(async function() {
      try {
        var r = await (await fetch(API + '/api/rides/' + currentRide.id)).json();
        currentRide = r;
        if (['driver_assigned', 'arriving', 'on_trip'].indexOf(r.status) !== -1) {
          clearInterval(pollInterval);
          clearInterval(progressTimer);
          if (progressEl) progressEl.style.width = '100%';
          setTimeout(function() { showTripScreen(r); }, 350);
        }
      } catch (e) {}
    }, 700);
  } catch (e) {
    clearInterval(progressTimer);
    alert('Could not request ride. Please try again.');
    showScreen('home');
  }
}

function showTripScreen(ride) {
  currentRide = ride;
  var d = ride.driver || {};
  function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  set('driver-photo', d.photo || '👨‍💼');
  set('driver-name', d.name || 'Driver');
  set('driver-rating', d.rating || '4.8');
  set('driver-rides', d.rides ? (d.rides >= 1000 ? (d.rides / 1000).toFixed(1) + 'k' : d.rides) : '0');
  set('driver-car', (d.car || 'Car') + ' · ' + (d.plate || ''));
  set('trip-pickup', ride.pickup && ride.pickup.name ? ride.pickup.name : '');
  set('trip-dest', ride.destination && ride.destination.name ? ride.destination.name : '');
  var displayPrices = { economy: 1500, comfort: 2500, suv: 4000, premium: 6000 };
  var price = (ride.rideType && displayPrices[ride.rideType.id]) || ride.price || 0;
  set('trip-price', '₦' + price.toLocaleString());
  set('trip-payment', ride.paymentMethod === 'cash' ? 'Cash' : ride.paymentMethod === 'card' ? 'Card' : 'Wallet');
  set('trip-status-text', ride.status === 'on_trip' ? "You're on your way" : 'Driver is arriving');
  set('trip-eta-text', 'Arriving in ' + (ride.etaMinutes || 5) + ' min');
  var now = new Date();
  set('trip-pickup-time', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  var arrive = new Date(now.getTime() + (ride.etaMinutes || 10) * 60000);
  set('trip-dest-time', arrive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  showScreen('trip');
  setTimeout(function() { initMap(); }, 80);

  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async function() {
    try {
      var r = await (await fetch(API + '/api/rides/' + currentRide.id + '/progress', { method: 'POST' })).json();
      currentRide = r;
      set('trip-status-text', r.status === 'arriving' ? 'Driver is arriving' : r.status === 'on_trip' ? "You're on your way" : r.status === 'completed' ? 'Trip completed!' : r.status);
      set('trip-eta-text', r.status === 'completed' ? 'You have arrived' : 'Arriving in ' + r.etaMinutes + ' min');
      if (r.status === 'completed') {
        clearInterval(pollInterval);
        setTimeout(function() {
          alert('🎉 You have arrived! Thanks for riding with Routyride.');
          showScreen('home');
          currentRide = null;
        }, 1200);
      }
    } catch (e) {}
  }, 4000);
}

function initMap() {
  if (map) { map.remove(); map = null; }
  var mapEl = document.getElementById('map');
  if (!mapEl) return;
  map = L.map('map', { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false })
    .setView([(LOCATIONS.pickup.lat + LOCATIONS.dest.lat) / 2, (LOCATIONS.pickup.lng + LOCATIONS.dest.lng) / 2], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  L.marker([LOCATIONS.pickup.lat, LOCATIONS.pickup.lng], {
    icon: L.divIcon({ className: '', html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
  }).addTo(map);
  L.marker([LOCATIONS.dest.lat, LOCATIONS.dest.lng], {
    icon: L.divIcon({ className: '', html: '<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
  }).addTo(map);
  L.polyline([[LOCATIONS.pickup.lat, LOCATIONS.pickup.lng], [LOCATIONS.dest.lat, LOCATIONS.dest.lng]], { color: '#10b981', weight: 4, opacity: 0.85, lineCap: 'round' }).addTo(map);
  var midLat = (LOCATIONS.pickup.lat + LOCATIONS.dest.lat) / 2;
  var midLng = (LOCATIONS.pickup.lng + LOCATIONS.dest.lng) / 2;
  L.marker([midLat, midLng], {
    icon: L.divIcon({ className: '', html: '<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));transform:rotate(45deg)">🚗</div>', iconSize: [28, 28], iconAnchor: [14, 14] })
  }).addTo(map);
  map.fitBounds([[LOCATIONS.pickup.lat, LOCATIONS.pickup.lng], [LOCATIONS.dest.lat, LOCATIONS.dest.lng]], { padding: [40, 40] });
}

async function cancelRide() {
  if (currentRide) {
    try {
      await fetch(API + '/api/rides/' + currentRide.id, {
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
      title: 'My Routyride trip',
      text: "I'm on a Routyride to " + (currentRide.destination && currentRide.destination.name ? currentRide.destination.name : 'my destination') + '. Track me!',
      url: window.location.href
    }).catch(function() {});
  } else {
    alert('Share link copied! (Demo)');
  }
}

window.showScreen = showScreen;
window.selectRideType = selectRideType;
window.setDestination = setDestination;
window.setPayment = setPayment;
window.requestRide = requestRide;
window.cancelRide = cancelRide;
window.shareRide = shareRide;
window.prepareBooking = prepareBooking;
window.swapLocations = swapLocations;