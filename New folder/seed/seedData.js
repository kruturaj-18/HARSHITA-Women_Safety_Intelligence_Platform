require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Area = require('../src/models/Area');
const PoliceStation = require('../src/models/PoliceStation');
const Incident = require('../src/models/Incident');

const MUMBAI_CENTER = [72.8777, 19.0760];

// Mumbai areas with approximate polygon boundaries
const areas = [
  { name: 'Colaba', center: [72.8326, 18.9067], offset: 0.012 },
  { name: 'Churchgate', center: [72.8272, 18.9322], offset: 0.010 },
  { name: 'Marine Lines', center: [72.8235, 18.9432], offset: 0.008 },
  { name: 'Grant Road', center: [72.8150, 18.9600], offset: 0.009 },
  { name: 'Mumbai Central', center: [72.8194, 18.9690], offset: 0.010 },
  { name: 'Dadar', center: [72.8438, 19.0178], offset: 0.012 },
  { name: 'Bandra', center: [72.8370, 19.0596], offset: 0.015 },
  { name: 'Andheri', center: [72.8497, 19.1197], offset: 0.018 },
  { name: 'Borivali', center: [72.8567, 19.2307], offset: 0.016 },
  { name: 'Malad', center: [72.8490, 19.1860], offset: 0.014 },
  { name: 'Goregaon', center: [72.8494, 19.1663], offset: 0.013 },
  { name: 'Jogeshwari', center: [72.8490, 19.1360], offset: 0.010 },
  { name: 'Kurla', center: [72.8796, 19.0726], offset: 0.012 },
  { name: 'Ghatkopar', center: [72.9080, 19.0868], offset: 0.013 },
  { name: 'Mulund', center: [72.9560, 19.1726], offset: 0.014 },
  { name: 'Thane', center: [72.9781, 19.2183], offset: 0.016 },
  { name: 'Powai', center: [72.9052, 19.1176], offset: 0.012 },
  { name: 'Vikhroli', center: [72.9296, 19.1110], offset: 0.010 },
  { name: 'Chembur', center: [72.8970, 19.0522], offset: 0.013 },
  { name: 'Vile Parle', center: [72.8479, 19.0963], offset: 0.010 },
  { name: 'Santacruz', center: [72.8402, 19.0830], offset: 0.009 },
  { name: 'Dharavi', center: [72.8553, 19.0430], offset: 0.008 },
  { name: 'Worli', center: [72.8183, 19.0000], offset: 0.010 },
  { name: 'Lower Parel', center: [72.8272, 18.9927], offset: 0.008 },
  { name: 'Juhu', center: [72.8296, 19.1075], offset: 0.010 },
];

function createPolygon(center, offset) {
  const [lng, lat] = center;
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ]],
  };
}

const policeStations = [
  { name: 'Colaba Police Station', address: 'Shahid Bhagat Singh Rd, Colaba, Mumbai 400005', phone: '022-22821855', coordinates: [72.8326, 18.9067], jurisdiction: 'Colaba' },
  { name: 'Cuffe Parade Police Station', address: 'Cuffe Parade, Mumbai 400005', phone: '022-22180271', coordinates: [72.8200, 18.8930], jurisdiction: 'Colaba' },
  { name: 'Marine Drive Police Station', address: 'Netaji Subhash Chandra Rd, Mumbai 400020', phone: '022-22822214', coordinates: [72.8235, 18.9432], jurisdiction: 'Marine Lines' },
  { name: 'Azad Maidan Police Station', address: 'DN Road, Fort, Mumbai 400001', phone: '022-22620926', coordinates: [72.8340, 18.9390], jurisdiction: 'Churchgate' },
  { name: 'VP Road Police Station', address: 'VP Road, Grant Road, Mumbai 400004', phone: '022-23877241', coordinates: [72.8150, 18.9600], jurisdiction: 'Grant Road' },
  { name: 'Agripada Police Station', address: 'Agripada, Mumbai Central 400011', phone: '022-23002669', coordinates: [72.8194, 18.9690], jurisdiction: 'Mumbai Central' },
  { name: 'Dadar Police Station', address: 'LJ Road, Dadar West, Mumbai 400028', phone: '022-24376811', coordinates: [72.8438, 19.0178], jurisdiction: 'Dadar' },
  { name: 'Shivaji Park Police Station', address: 'Keluskar Road, Dadar, Mumbai 400028', phone: '022-24381541', coordinates: [72.8390, 19.0280], jurisdiction: 'Dadar' },
  { name: 'Bandra Police Station', address: 'Hill Road, Bandra West, Mumbai 400050', phone: '022-26415959', coordinates: [72.8370, 19.0596], jurisdiction: 'Bandra', isWomenCell: true },
  { name: 'Khar Police Station', address: 'SV Road, Khar West, Mumbai 400052', phone: '022-26001616', coordinates: [72.8360, 19.0710], jurisdiction: 'Bandra' },
  { name: 'Andheri Police Station', address: 'SV Road, Andheri West, Mumbai 400058', phone: '022-26282626', coordinates: [72.8497, 19.1197], jurisdiction: 'Andheri' },
  { name: 'DN Nagar Police Station', address: 'New Link Road, Andheri West 400053', phone: '022-26344950', coordinates: [72.8340, 19.1290], jurisdiction: 'Andheri' },
  { name: 'MIDC Police Station', address: 'MIDC, Andheri East, Mumbai 400093', phone: '022-28362828', coordinates: [72.8700, 19.1150], jurisdiction: 'Andheri' },
  { name: 'Borivali Police Station', address: 'SV Road, Borivali West, Mumbai 400092', phone: '022-28932121', coordinates: [72.8567, 19.2307], jurisdiction: 'Borivali' },
  { name: 'Malad Police Station', address: 'SV Road, Malad West, Mumbai 400064', phone: '022-28820100', coordinates: [72.8490, 19.1860], jurisdiction: 'Malad', isWomenCell: true },
  { name: 'Goregaon Police Station', address: 'SV Road, Goregaon, Mumbai 400062', phone: '022-28722121', coordinates: [72.8494, 19.1663], jurisdiction: 'Goregaon' },
  { name: 'Kurla Police Station', address: 'LBS Marg, Kurla West, Mumbai 400070', phone: '022-26502222', coordinates: [72.8796, 19.0726], jurisdiction: 'Kurla' },
  { name: 'Ghatkopar Police Station', address: 'MG Road, Ghatkopar, Mumbai 400077', phone: '022-25013636', coordinates: [72.9080, 19.0868], jurisdiction: 'Ghatkopar' },
  { name: 'Mulund Police Station', address: 'LBS Marg, Mulund West, Mumbai 400080', phone: '022-25631414', coordinates: [72.9560, 19.1726], jurisdiction: 'Mulund' },
  { name: 'Powai Police Station', address: 'Hiranandani Gardens, Powai, Mumbai 400076', phone: '022-25709400', coordinates: [72.9052, 19.1176], jurisdiction: 'Powai' },
  { name: 'Chembur Police Station', address: 'RC Marg, Chembur, Mumbai 400071', phone: '022-25222121', coordinates: [72.8970, 19.0522], jurisdiction: 'Chembur' },
  { name: 'Vile Parle Police Station', address: 'Dixit Road, Vile Parle East, Mumbai 400057', phone: '022-26121717', coordinates: [72.8530, 19.0963], jurisdiction: 'Vile Parle' },
  { name: 'Santacruz Police Station', address: 'Santacruz West, Mumbai 400054', phone: '022-26491212', coordinates: [72.8402, 19.0830], jurisdiction: 'Santacruz' },
  { name: 'Dharavi Police Station', address: '90 Feet Road, Dharavi, Mumbai 400017', phone: '022-24058484', coordinates: [72.8553, 19.0430], jurisdiction: 'Dharavi' },
  { name: 'Worli Police Station', address: 'Annie Besant Road, Worli, Mumbai 400018', phone: '022-24935757', coordinates: [72.8183, 19.0000], jurisdiction: 'Worli' },
  { name: 'NM Joshi Marg Police Station', address: 'Delisle Road, Lower Parel, Mumbai 400013', phone: '022-23070707', coordinates: [72.8272, 18.9927], jurisdiction: 'Lower Parel' },
  { name: 'Juhu Police Station', address: 'Juhu Tara Road, Juhu, Mumbai 400049', phone: '022-26161601', coordinates: [72.8296, 19.1075], jurisdiction: 'Juhu' },
  { name: 'Jogeshwari Police Station', address: 'SV Road, Jogeshwari, Mumbai 400060', phone: '022-26781010', coordinates: [72.8490, 19.1360], jurisdiction: 'Jogeshwari' },
  { name: 'Vikhroli Police Station', address: 'LBS Marg, Vikhroli, Mumbai 400079', phone: '022-25789090', coordinates: [72.9296, 19.1110], jurisdiction: 'Vikhroli' },
  { name: 'Thane Nagar Police Station', address: 'Station Road, Thane 400601', phone: '022-25362222', coordinates: [72.9781, 19.2183], jurisdiction: 'Thane' },
  { name: 'Women Safety Cell - Mumbai', address: 'Commissioner Office, Crawford Market, Mumbai 400001', phone: '103', coordinates: [72.8347, 18.9476], jurisdiction: 'All Mumbai', isWomenCell: true },
];

const categories = ['harassment', 'stalking', 'assault', 'theft', 'eve_teasing', 'unsafe_area', 'other'];
const severities = ['low', 'medium', 'high'];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIncidents(areaName, center, count) {
  const incidents = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date(now - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

    const lng = center[0] + randomBetween(-0.01, 0.01);
    const lat = center[1] + randomBetween(-0.01, 0.01);

    const category = randomFromArray(categories);
    const severity = randomFromArray(severities);

    const descriptions = {
      harassment: [
        'Verbal harassment reported near bus stop',
        'Group of men making inappropriate comments',
        'Persistent harassment by auto driver',
        'Catcalling incident near market area',
      ],
      stalking: [
        'Being followed by unknown person for several blocks',
        'Same person seen repeatedly near workplace',
        'Stalking incident reported near college',
        'Unknown person following at night',
      ],
      assault: [
        'Attempted snatching of belongings',
        'Physical assault reported near station',
        'Assault incident in parking area',
        'Incident reported near isolated stretch',
      ],
      theft: [
        'Phone snatching incident on crowded street',
        'Bag snatching near traffic signal',
        'Theft from parked vehicle',
        'Pickpocketing in crowded market',
      ],
      eve_teasing: [
        'Eve teasing on public transport',
        'Inappropriate behavior at bus stop',
        'Eve teasing near school area',
        'Whistling and comments on main road',
      ],
      unsafe_area: [
        'Poorly lit street creates unsafe feeling',
        'Deserted area with no security presence',
        'Construction site area feels unsafe at night',
        'No CCTV or security in this stretch',
      ],
      other: [
        'Suspicious activity observed near residential area',
        'Unsafe driving creating road safety concern',
        'Alcohol-related disturbance reported',
        'General safety concern in this locality',
      ],
    };

    incidents.push({
      location: { type: 'Point', coordinates: [lng, lat] },
      areaName,
      category,
      severity,
      description: randomFromArray(descriptions[category]),
      isAnonymous: Math.random() > 0.3,
      status: Math.random() > 0.15 ? 'approved' : 'pending',
      incidentDate: date,
    });
  }

  return incidents;
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Area.deleteMany({}),
      PoliceStation.deleteMany({}),
      Incident.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@wsip.com',
      password: 'Admin@123',
      role: 'admin',
    });
    console.log(`Admin created: admin@wsip.com / Admin@123`);

    // Create demo user
    const user = await User.create({
      name: 'Demo User',
      email: 'user@wsip.com',
      password: 'User@1234',
      role: 'user',
    });
    console.log(`Demo user created: user@wsip.com / User@1234`);

    // Create areas
    const areaDocs = areas.map((a) => ({
      name: a.name,
      geometry: createPolygon(a.center, a.offset),
      safetyScore: Math.floor(Math.random() * 60) + 30,
    }));

    const createdAreas = await Area.insertMany(areaDocs);
    createdAreas.forEach((a) => {
      a.updateRiskLevel();
      a.save();
    });
    console.log(`Created ${createdAreas.length} areas`);

    // Create police stations
    const stationDocs = policeStations.map((s) => ({
      name: s.name,
      address: s.address,
      phone: s.phone,
      location: { type: 'Point', coordinates: s.coordinates },
      jurisdiction: s.jurisdiction,
      isWomenCell: s.isWomenCell || false,
    }));

    const createdStations = await PoliceStation.insertMany(stationDocs);
    console.log(`Created ${createdStations.length} police stations`);

    // Generate incidents per area (variable count to simulate risk differences)
    const highIncidentAreas = ['Andheri', 'Kurla', 'Dharavi', 'Dadar', 'Grant Road', 'Jogeshwari'];
    const mediumIncidentAreas = ['Bandra', 'Malad', 'Goregaon', 'Ghatkopar', 'Chembur', 'Thane'];

    let allIncidents = [];
    for (const area of areas) {
      let count;
      if (highIncidentAreas.includes(area.name)) {
        count = Math.floor(Math.random() * 15) + 20;
      } else if (mediumIncidentAreas.includes(area.name)) {
        count = Math.floor(Math.random() * 10) + 10;
      } else {
        count = Math.floor(Math.random() * 8) + 3;
      }
      allIncidents = allIncidents.concat(generateIncidents(area.name, area.center, count));
    }

    // Assign some incidents to the demo user
    allIncidents.slice(0, 10).forEach((inc) => {
      inc.reportedBy = user._id;
      inc.isAnonymous = false;
    });

    await Incident.insertMany(allIncidents);
    console.log(`Created ${allIncidents.length} incidents`);

    // Update safety scores
    const SafetyScoreService = require('../src/services/safetyScore');
    await SafetyScoreService.updateAllAreaScores();
    console.log('Updated safety scores');

    console.log('\n✅ Seed data inserted successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin login: admin@wsip.com / Admin@123');
    console.log('User login:  user@wsip.com / User@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
