const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== IN-MEMORY DATA ====================
const drivers = [
  { id: 'd1', name: 'Tunde Adesina', rating: 4.8, rides: 1200, car: 'Toyota Corolla', plate: 'ABC 123 XY', photo: '👨‍💼', lat: 6.5244, lng: 3.3792, available: true },
  { id: 'd2', name: 'Chioma Okeke', rating: 4.9, rides: 850, car: 'Honda Accord', plate: 'XYZ 456 AB', photo: '👩‍💼', lat: 6.4550, lng: 3.3941, available: true },
  { id: 'd3', name: 'Emeka Nwosu', rating: 4.7, rides: 2100, car: 'Toyota Camry', plate: 'LAG 789 CD', photo: '👨‍✈️', lat: 6.6018, lng: 3.3515, available: true },
  { id: 'd4', name: 'Aisha Bello', rating: 4.95, rides: 560, car: 'Mercedes C300', plate: 'PRE 001 NG', photo: '👩‍🦱', lat: 6.4281, lng: 3.4219, available: true },
];

const rideTypes = [
  { id: 'economy', name: 'Economy', icon: '🚗', basePrice: 800, perKm: 120, eta: 4, seats: 4 },
  { id: 'comfort', name: 'Comfort', icon: '🚙', basePrice: 1500, perKm: 180, eta: 6, seats: 4 },
  { id: 'suv', name: 'SUV', icon: '🚐', basePrice: 2500, perKm: 250, eta: 8, seats: 6 },
  { id: 'premium', name: 'Premium', icon: '🚘', basePrice: 4000, perKm: 350, eta: 10, seats: 4 },
];

const popularDestinations = [
  { id: 'airport', name: 'Airport', desc: 'Travel hassle-free', icon: '✈️', lat: 6.5774, lng: 3.3212 },
  { id: 'mall', name: 'Mall', desc: 'Shop & relax', icon: '🛍️', lat: 6.4281, lng: 3.4219 },
  { id: 'office', name: 'Office', desc: 'Get there on time', icon: '🏢', lat: 6.4550, lng: 3.3941 },
  { id: 'home', name: 'Home', desc: 'Back to what matters', icon: '🏠', lat: 6.6018, lng: 3.3515 },
];

let rides = [];
let users = [
  { id: 'u1', name: 'Guest User', email: 'guest@routyride.com', phone: '+234 800 000 0000', wallet: 25000 }
];

// Simple distance calculation (Haversine approx for Lagos)
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function estimatePrice(typeId, distanceKm) {
  const type = rideTypes.find(t => t.id === typeId);
  if (!type) return 0;
  return Math.round(type.basePrice + type.perKm * distanceKm);
}

// ==================== API ROUTES ====================

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Routyride API', time: new Date().toISOString() });
});

// Get ride types
app.get('/api/ride-types', (req, res) => {
  res.json(rideTypes);
});

// Get popular destinations
app.get('/api/destinations', (req, res) => {
  res.json(popularDestinations);
});

// Estimate fare
app.post('/api/estimate', (req, res) => {
  const { pickupLat, pickupLng, destLat, destLng, rideTypeId } = req.body;
  if (!pickupLat || !destLat) {
    return res.status(400).json({ error: 'Pickup and destination required' });
  }
  const distance = getDistanceKm(pickupLat, pickupLng, destLat, destLng);
  const price = estimatePrice(rideTypeId || 'economy', distance);
  const type = rideTypes.find(t => t.id === (rideTypeId || 'economy'));
  res.json({
    distanceKm: Math.round(distance * 10) / 10,
    price,
    currency: '₦',
    etaMinutes: type?.eta || 5,
    rideType: type
  });
});

// Request a ride
app.post('/api/rides', (req, res) => {
  const { pickup, destination, rideTypeId, paymentMethod = 'cash' } = req.body;
  if (!pickup || !destination || !rideTypeId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const type = rideTypes.find(t => t.id === rideTypeId);
  if (!type) return res.status(400).json({ error: 'Invalid ride type' });

  // Find nearest available driver (simplified)
  const available = drivers.filter(d => d.available);
  if (available.length === 0) {
    return res.status(503).json({ error: 'No drivers available right now' });
  }
  const driver = available[Math.floor(Math.random() * available.length)];
  driver.available = false;

  const distance = getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
  const price = estimatePrice(rideTypeId, distance);

  const ride = {
    id: uuidv4(),
    status: 'searching', // searching -> driver_assigned -> arriving -> on_trip -> completed | cancelled
    pickup,
    destination,
    rideType: type,
    price,
    currency: '₦',
    paymentMethod,
    driver: null,
    createdAt: new Date().toISOString(),
    etaMinutes: type.eta,
    distanceKm: Math.round(distance * 10) / 10
  };

  rides.push(ride);

  // Simulate driver assignment after 2-4 seconds
  setTimeout(() => {
    const r = rides.find(x => x.id === ride.id);
    if (r && r.status === 'searching') {
      r.status = 'driver_assigned';
      r.driver = { ...driver };
      r.etaMinutes = Math.max(3, Math.round(type.eta * 0.8));
    }
  }, 2500 + Math.random() * 1500);

  res.status(201).json(ride);
});

// Get ride by ID
app.get('/api/rides/:id', (req, res) => {
  const ride = rides.find(r => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

// Update ride status (for simulation / cancel)
app.patch('/api/rides/:id', (req, res) => {
  const ride = rides.find(r => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  const { status } = req.body;
  if (status) {
    ride.status = status;
    if (status === 'cancelled' || status === 'completed') {
      if (ride.driver) {
        const d = drivers.find(dr => dr.id === ride.driver.id);
        if (d) d.available = true;
      }
    }
    if (status === 'on_trip') {
      ride.startedAt = new Date().toISOString();
    }
    if (status === 'completed') {
      ride.completedAt = new Date().toISOString();
    }
  }
  res.json(ride);
});

// List recent rides (activity)
app.get('/api/rides', (req, res) => {
  res.json(rides.slice(-20).reverse());
});

// Get user wallet (demo)
app.get('/api/user', (req, res) => {
  res.json(users[0]);
});

// Simulate progress of a ride (for frontend polling)
app.post('/api/rides/:id/progress', (req, res) => {
  const ride = rides.find(r => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  // Auto-advance demo flow
  if (ride.status === 'driver_assigned') {
    ride.status = 'arriving';
    ride.etaMinutes = Math.max(1, ride.etaMinutes - 2);
  } else if (ride.status === 'arriving') {
    ride.status = 'on_trip';
    ride.etaMinutes = Math.round(ride.distanceKm * 2.5); // rough remaining
  } else if (ride.status === 'on_trip') {
    ride.etaMinutes = Math.max(0, ride.etaMinutes - 1);
    if (ride.etaMinutes <= 0) {
      ride.status = 'completed';
      if (ride.driver) {
        const d = drivers.find(dr => dr.id === ride.driver.id);
        if (d) d.available = true;
      }
    }
  }
  res.json(ride);
});

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚗  Routyride server running at http://localhost:${PORT}`);
  console.log(`    Your ride, your way.\n`);
});
