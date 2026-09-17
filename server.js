const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'routeride-secret-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATA ====================
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
  // demo account: email demo@routeride.com / password: demo1234
  {
    id: 'u1',
    name: 'Demo User',
    email: 'demo@routeride.com',
    phone: '+234 800 000 0000',
    passwordHash: bcrypt.hashSync('demo1234', 10),
    wallet: 25000,
    createdAt: new Date().toISOString()
  }
];

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimatePrice(typeId, distanceKm) {
  const type = rideTypes.find(t => t.id === typeId);
  if (!type) return 0;
  return Math.round(type.basePrice + type.perKm * distanceKm);
}

// Auth middleware
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, name: user.name, email: user.email, phone: user.phone, wallet: user.wallet };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone || '', wallet: u.wallet };
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      passwordHash,
      wallet: 5000, // welcome bonus
      createdAt: new Date().toISOString()
    };
    users.push(user);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json(req.user);
});

// ==================== PUBLIC API ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Routeride API', time: new Date().toISOString() });
});

app.get('/api/ride-types', (req, res) => {
  res.json(rideTypes);
});

app.get('/api/destinations', (req, res) => {
  res.json(popularDestinations);
});

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

// ==================== PROTECTED / USER ROUTES ====================
app.get('/api/user', authRequired, (req, res) => {
  res.json(req.user);
});

app.post('/api/rides', authRequired, (req, res) => {
  const { pickup, destination, rideTypeId, paymentMethod = 'cash' } = req.body;
  if (!pickup || !destination || !rideTypeId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const type = rideTypes.find(t => t.id === rideTypeId);
  if (!type) return res.status(400).json({ error: 'Invalid ride type' });

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
    userId: req.user.id,
    status: 'searching',
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

app.get('/api/rides/:id', authRequired, (req, res) => {
  const ride = rides.find(r => r.id === req.params.id && r.userId === req.user.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

app.patch('/api/rides/:id', authRequired, (req, res) => {
  const ride = rides.find(r => r.id === req.params.id && r.userId === req.user.id);
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
    if (status === 'on_trip') ride.startedAt = new Date().toISOString();
    if (status === 'completed') ride.completedAt = new Date().toISOString();
  }
  res.json(ride);
});

app.get('/api/rides', authRequired, (req, res) => {
  const userRides = rides.filter(r => r.userId === req.user.id).slice(-20).reverse();
  res.json(userRides);
});

app.post('/api/rides/:id/progress', authRequired, (req, res) => {
  const ride = rides.find(r => r.id === req.params.id && r.userId === req.user.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  if (ride.status === 'driver_assigned') {
    ride.status = 'arriving';
    ride.etaMinutes = Math.max(1, ride.etaMinutes - 2);
  } else if (ride.status === 'arriving') {
    ride.status = 'on_trip';
    ride.etaMinutes = Math.round(ride.distanceKm * 2.5);
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

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚗  Routyride server running at http://localhost:${PORT}`);
  console.log(`    Demo login: demo@routyride.com / demo1234\n`);
});