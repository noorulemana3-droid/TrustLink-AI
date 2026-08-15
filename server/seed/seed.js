require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Provider = require('../models/Provider');
const Review = require('../models/Review');
const Request = require('../models/Request');
const { slugify } = require('../utils/helpers');

const CATEGORIES = [
  'Electrician',
  'Plumber',
  'AC Technician',
  'Carpenter',
  'Painter',
  'Tutor',
  'Photographer',
  'Mechanic',
  'Beautician',
  'Cleaner',
  'Internet Technician',
  'Computer Repair',
  'Mobile Repair',
  'Home Appliance Repair',
  'Interior Designer',
];

const PLACEHOLDER = (text, bg = '0f2f38') =>
  `https://placehold.co/800x500/${bg}/e8f4f2?text=${encodeURIComponent(text)}`;

/** Demo + market-polish providers across major PK cities */
const PROVIDER_DEFS = [
  // --- Demo accounts (keep emails stable) ---
  {
    user: {
      name: 'Ahmed Ali',
      email: 'electrician@trustlink.ai',
      phone: '03001112233',
      city: 'Lahore',
    },
    businessName: 'SparkFix Electricians',
    category: 'Electrician',
    description:
      'Home wiring, fan installation, DB repair and emergency electrical work across Lahore.',
    city: 'Lahore',
    area: 'Johar Town',
    address: 'Block C, Johar Town, Lahore',
    experienceYears: 8,
    priceRange: { min: 1500, max: 8000 },
    services: ['Home wiring', 'Fan installation', 'DB repair', 'Short circuit fix'],
    workingHours: { from: '09:00', to: '20:00' },
    verified: true,
    status: 'approved',
    responseRate: 92,
    hoursAgo: 0,
    color: '0f2f38',
  },
  {
    user: {
      name: 'Bilal Hussain',
      email: 'plumber@trustlink.ai',
      phone: '03002223344',
      city: 'Lahore',
    },
    businessName: 'FlowRight Plumbing',
    category: 'Plumber',
    description:
      'Leak fixes, bathroom fittings, and kitchen plumbing with same-day availability.',
    city: 'Lahore',
    area: 'Gulberg',
    address: 'Main Boulevard, Gulberg III, Lahore',
    experienceYears: 6,
    priceRange: { min: 1000, max: 6000 },
    services: ['Leak repair', 'Tap replacement', 'Drain cleaning'],
    workingHours: { from: '08:00', to: '19:00' },
    verified: true,
    status: 'approved',
    responseRate: 85,
    hoursAgo: 18,
    color: '143a45',
  },
  {
    user: {
      name: 'Sara Malik',
      email: 'tutor@trustlink.ai',
      phone: '03003334455',
      city: 'Lahore',
    },
    businessName: 'BrightMind Tutors',
    category: 'Tutor',
    description:
      'Math and Physics tutoring for Matric and Intermediate students near Model Town.',
    city: 'Lahore',
    area: 'Model Town',
    address: 'Model Town Link Road, Lahore',
    experienceYears: 5,
    priceRange: { min: 2000, max: 12000 },
    services: ['Math', 'Physics', 'Home tuition'],
    workingHours: { from: '15:00', to: '21:00' },
    verified: true,
    status: 'approved',
    responseRate: 78,
    hoursAgo: 40,
    color: '1b4652',
  },
  {
    user: {
      name: 'Usman Raza',
      email: 'ac@trustlink.ai',
      phone: '03004445566',
      city: 'Karachi',
    },
    businessName: 'CoolAir AC Services',
    category: 'AC Technician',
    description: 'AC install, gas refill, and deep cleaning for homes and offices.',
    city: 'Karachi',
    area: 'Clifton',
    address: 'Clifton Block 5, Karachi',
    experienceYears: 10,
    priceRange: { min: 2500, max: 15000 },
    services: ['AC install', 'Gas refill', 'Deep cleaning'],
    workingHours: { from: '10:00', to: '21:00' },
    verified: true,
    status: 'approved',
    responseRate: 88,
    hoursAgo: 6,
    color: '0d333d',
  },
  {
    user: {
      name: 'Hina Shah',
      email: 'cleaner@trustlink.ai',
      phone: '03005556677',
      city: 'Islamabad',
    },
    businessName: 'FreshNest Cleaners',
    category: 'Cleaner',
    description: 'Home deep cleaning and move-in cleaning packages.',
    city: 'Islamabad',
    area: 'F-10',
    address: 'F-10 Markaz, Islamabad',
    experienceYears: 4,
    priceRange: { min: 3000, max: 18000 },
    services: ['Deep cleaning', 'Move-in cleaning', 'Kitchen cleaning'],
    workingHours: { from: '09:00', to: '18:00' },
    verified: false,
    status: 'pending',
    responseRate: 0,
    hoursAgo: 72,
    color: '12404c',
  },
  // --- Extra market coverage ---
  {
    user: {
      name: 'Farhan Qureshi',
      email: 'wirepro.lhr@trustlink.ai',
      phone: '03016667788',
      city: 'Lahore',
    },
    businessName: 'WirePro Electrical',
    category: 'Electrician',
    description: 'DHA & Bahria Town electrician — panel upgrades and smart switches.',
    city: 'Lahore',
    area: 'DHA Phase 5',
    address: 'Y Block, DHA Phase 5, Lahore',
    experienceYears: 12,
    priceRange: { min: 2000, max: 12000 },
    services: ['Panel upgrade', 'Smart switches', 'Generator wiring'],
    workingHours: { from: '09:00', to: '21:00' },
    verified: true,
    status: 'approved',
    responseRate: 95,
    hoursAgo: 2,
    color: '0a2a32',
  },
  {
    user: {
      name: 'Nadia Akhtar',
      email: 'paint.lhr@trustlink.ai',
      phone: '03017778899',
      city: 'Lahore',
    },
    businessName: 'ColorCraft Painters',
    category: 'Painter',
    description: 'Interior & exterior painting with dust-free prep for homes in Lahore.',
    city: 'Lahore',
    area: 'Cantt',
    address: 'Sarwar Road, Lahore Cantt',
    experienceYears: 7,
    priceRange: { min: 4000, max: 45000 },
    services: ['Interior paint', 'Exterior paint', 'Texture finish'],
    workingHours: { from: '08:00', to: '18:00' },
    verified: true,
    status: 'approved',
    responseRate: 81,
    hoursAgo: 12,
    color: '164850',
  },
  {
    user: {
      name: 'Imran Sheikh',
      email: 'wood.lhr@trustlink.ai',
      phone: '03018889900',
      city: 'Lahore',
    },
    businessName: 'Oak & Nail Carpentry',
    category: 'Carpenter',
    description: 'Custom cabinets, door fitting, and furniture repair near Township.',
    city: 'Lahore',
    area: 'Township',
    address: 'Sector A1, Township, Lahore',
    experienceYears: 9,
    priceRange: { min: 2500, max: 35000 },
    services: ['Cabinets', 'Door fitting', 'Furniture repair'],
    workingHours: { from: '09:00', to: '19:00' },
    verified: true,
    status: 'approved',
    responseRate: 74,
    hoursAgo: 28,
    color: '1a505c',
  },
  {
    user: {
      name: 'Kamran Ali',
      email: 'plumb.khi@trustlink.ai',
      phone: '03019990011',
      city: 'Karachi',
    },
    businessName: 'PipeLine Karachi',
    category: 'Plumber',
    description: '24/7 plumbing for Gulshan and North Nazimabad — tanks & motors.',
    city: 'Karachi',
    area: 'Gulshan-e-Iqbal',
    address: 'Block 13-D, Gulshan-e-Iqbal, Karachi',
    experienceYears: 11,
    priceRange: { min: 1200, max: 9000 },
    services: ['Motor install', 'Tank cleaning', 'Pipe replacement'],
    workingHours: { from: '00:00', to: '23:59' },
    verified: true,
    status: 'approved',
    responseRate: 90,
    hoursAgo: 1,
    color: '0e3640',
  },
  {
    user: {
      name: 'Sana Rizvi',
      email: 'beauty.khi@trustlink.ai',
      phone: '03020001122',
      city: 'Karachi',
    },
    businessName: 'Glow Studio by Sana',
    category: 'Beautician',
    description: 'Bridal & party makeup, facial, and home salon visits in DHA Karachi.',
    city: 'Karachi',
    area: 'DHA Phase 6',
    address: 'Khayaban-e-Shamsheer, DHA Phase 6, Karachi',
    experienceYears: 6,
    priceRange: { min: 3000, max: 40000 },
    services: ['Bridal makeup', 'Facial', 'Home visit'],
    workingHours: { from: '10:00', to: '20:00' },
    verified: true,
    status: 'approved',
    responseRate: 87,
    hoursAgo: 8,
    color: '123c48',
  },
  {
    user: {
      name: 'Tariq Mehmood',
      email: 'mech.khi@trustlink.ai',
      phone: '03021112233',
      city: 'Karachi',
    },
    businessName: 'AutoCare Garage',
    category: 'Mechanic',
    description: 'Car diagnostics, oil change, and brake service near Saddar.',
    city: 'Karachi',
    area: 'Saddar',
    address: 'Preedy Street, Saddar, Karachi',
    experienceYears: 15,
    priceRange: { min: 1500, max: 25000 },
    services: ['Diagnostics', 'Oil change', 'Brake service'],
    workingHours: { from: '09:00', to: '21:00' },
    verified: true,
    status: 'approved',
    responseRate: 83,
    hoursAgo: 5,
    color: '0c3038',
  },
  {
    user: {
      name: 'Amina Javed',
      email: 'photo.isb@trustlink.ai',
      phone: '03022223344',
      city: 'Islamabad',
    },
    businessName: 'Lens & Light Studio',
    category: 'Photographer',
    description: 'Event, portrait, and product photography across Islamabad & Rawalpindi.',
    city: 'Islamabad',
    area: 'F-7',
    address: 'Jinnah Super Market, F-7, Islamabad',
    experienceYears: 8,
    priceRange: { min: 5000, max: 80000 },
    services: ['Events', 'Portraits', 'Product shoots'],
    workingHours: { from: '10:00', to: '19:00' },
    verified: true,
    status: 'approved',
    responseRate: 91,
    hoursAgo: 4,
    color: '15444f',
  },
  {
    user: {
      name: 'Omar Farooq',
      email: 'net.isb@trustlink.ai',
      phone: '03023334455',
      city: 'Islamabad',
    },
    businessName: 'NetLink Technicians',
    category: 'Internet Technician',
    description: 'Wi-Fi setup, router config, and office LAN for Islamabad homes.',
    city: 'Islamabad',
    area: 'G-11',
    address: 'G-11 Markaz, Islamabad',
    experienceYears: 5,
    priceRange: { min: 1000, max: 8000 },
    services: ['Wi-Fi setup', 'Router config', 'Office LAN'],
    workingHours: { from: '09:00', to: '20:00' },
    verified: true,
    status: 'approved',
    responseRate: 86,
    hoursAgo: 9,
    color: '184c58',
  },
  {
    user: {
      name: 'Rizwan Malik',
      email: 'pc.rwp@trustlink.ai',
      phone: '03024445566',
      city: 'Rawalpindi',
    },
    businessName: 'ByteFix Computers',
    category: 'Computer Repair',
    description: 'Laptop repair, OS install, and data recovery in Saddar Rawalpindi.',
    city: 'Rawalpindi',
    area: 'Saddar',
    address: 'Bank Road, Saddar, Rawalpindi',
    experienceYears: 10,
    priceRange: { min: 800, max: 15000 },
    services: ['Laptop repair', 'OS install', 'Data recovery'],
    workingHours: { from: '10:00', to: '20:00' },
    verified: true,
    status: 'approved',
    responseRate: 79,
    hoursAgo: 14,
    color: '103840',
  },
  {
    user: {
      name: 'Asad Khan',
      email: 'mobile.fsd@trustlink.ai',
      phone: '03025556677',
      city: 'Faisalabad',
    },
    businessName: 'QuickFix Mobile',
    category: 'Mobile Repair',
    description: 'Screen replacement and software unlock near D Ground Faisalabad.',
    city: 'Faisalabad',
    area: 'D Ground',
    address: 'Chen One Road, D Ground, Faisalabad',
    experienceYears: 7,
    priceRange: { min: 500, max: 12000 },
    services: ['Screen replacement', 'Battery change', 'Software unlock'],
    workingHours: { from: '11:00', to: '21:00' },
    verified: true,
    status: 'approved',
    responseRate: 88,
    hoursAgo: 3,
    color: '1c545f',
  },
  {
    user: {
      name: 'Maham Noor',
      email: 'appliance.mul@trustlink.ai',
      phone: '03026667788',
      city: 'Multan',
    },
    businessName: 'HomeCare Appliances',
    category: 'Home Appliance Repair',
    description: 'Washing machine, fridge, and microwave repair across Multan Cantt.',
    city: 'Multan',
    area: 'Cantt',
    address: 'Abdali Road, Multan Cantt',
    experienceYears: 6,
    priceRange: { min: 1500, max: 10000 },
    services: ['Washing machine', 'Fridge', 'Microwave'],
    workingHours: { from: '09:00', to: '19:00' },
    verified: true,
    status: 'approved',
    responseRate: 76,
    hoursAgo: 22,
    color: '0f3a44',
  },
  {
    user: {
      name: 'Zainab Hashmi',
      email: 'interior.lhr@trustlink.ai',
      phone: '03027778899',
      city: 'Lahore',
    },
    businessName: 'SpaceForm Interiors',
    category: 'Interior Designer',
    description: 'Apartment makeovers and space planning for Gulberg & DHA clients.',
    city: 'Lahore',
    area: 'Gulberg',
    address: 'MM Alam Road, Gulberg, Lahore',
    experienceYears: 9,
    priceRange: { min: 15000, max: 250000 },
    services: ['Space planning', 'Apartment makeover', '3D concepts'],
    workingHours: { from: '10:00', to: '18:00' },
    verified: true,
    status: 'approved',
    responseRate: 70,
    hoursAgo: 36,
    color: '13424d',
  },
  {
    user: {
      name: 'Haris Butt',
      email: 'ac.rwp@trustlink.ai',
      phone: '03028889900',
      city: 'Rawalpindi',
    },
    businessName: 'ChillZone AC Repair',
    category: 'AC Technician',
    description: 'Split & window AC service for Bahria Town and Satellite Town.',
    city: 'Rawalpindi',
    area: 'Bahria Town',
    address: 'Phase 7, Bahria Town, Rawalpindi',
    experienceYears: 8,
    priceRange: { min: 2000, max: 14000 },
    services: ['Split AC service', 'Gas refill', 'Installation'],
    workingHours: { from: '09:00', to: '20:00' },
    verified: true,
    status: 'approved',
    responseRate: 84,
    hoursAgo: 7,
    color: '0b2e36',
  },
];

const REVIEW_TEMPLATES = [
  { rating: 5, comment: 'On time, fair price, and clean work. Highly recommended.' },
  { rating: 4, comment: 'Good service overall — slight delay but quality was solid.' },
  { rating: 5, comment: 'Professional and polite. Would book again without hesitation.' },
  { rating: 4, comment: 'Fixed the issue quickly. Transparent about costs.' },
  { rating: 5, comment: 'Excellent communication and neat finish.' },
];

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Provider.deleteMany({}),
    Review.deleteMany({}),
    Request.deleteMany({}),
  ]);

  const categories = await Category.insertMany(
    CATEGORIES.map((name) => ({
      name,
      slug: slugify(name),
      icon: name.split(' ')[0].toLowerCase(),
      description: `Trusted local ${name.toLowerCase()} professionals`,
    }))
  );

  const byName = Object.fromEntries(categories.map((c) => [c.name, c]));

  const adminPassword = await User.hashPassword(
    process.env.ADMIN_PASSWORD || 'Admin123!'
  );
  const customerPassword = await User.hashPassword('Customer123!');
  const providerPassword = await User.hashPassword('Provider123!');

  const admin = await User.create({
    name: 'TrustLink Admin',
    email: process.env.ADMIN_EMAIL || 'admin@trustlink.ai',
    passwordHash: adminPassword,
    role: 'admin',
    city: 'Lahore',
  });

  const customer = await User.create({
    name: 'Ayesha Khan',
    email: 'customer@trustlink.ai',
    passwordHash: customerPassword,
    role: 'customer',
    phone: '03001234567',
    city: 'Lahore',
  });

  const customer2 = await User.create({
    name: 'Hassan Iqbal',
    email: 'hassan@trustlink.ai',
    passwordHash: customerPassword,
    role: 'customer',
    phone: '03007654321',
    city: 'Lahore',
  });

  const customer3 = await User.create({
    name: 'Fatima Noor',
    email: 'fatima@trustlink.ai',
    passwordHash: customerPassword,
    role: 'customer',
    phone: '03008889900',
    city: 'Karachi',
  });

  const providerUsers = await User.insertMany(
    PROVIDER_DEFS.map((def) => ({
      name: def.user.name,
      email: def.user.email,
      passwordHash: providerPassword,
      role: 'provider',
      phone: def.user.phone,
      city: def.user.city,
    }))
  );

  const providers = await Provider.insertMany(
    PROVIDER_DEFS.map((def, i) => ({
      owner: providerUsers[i]._id,
      businessName: def.businessName,
      category: byName[def.category]._id,
      description: def.description,
      city: def.city,
      area: def.area,
      address: def.address,
      experienceYears: def.experienceYears,
      priceRange: def.priceRange,
      services: def.services,
      workingHours: def.workingHours,
      paymentMethods: def.paymentMethods || ['jazzcash', 'easypaisa', 'card', 'cash'],
      contactPhone: def.user.phone,
      contactEmail: def.user.email,
      profileImage: PLACEHOLDER(def.businessName.split(' ')[0], def.color),
      images: [
        PLACEHOLDER(def.businessName.split(' ')[0], def.color),
        PLACEHOLDER(def.category, def.color),
      ],
      verified: def.verified,
      status: def.status,
      available: true,
      responseRate: def.responseRate,
      lastActiveAt: new Date(Date.now() - (def.hoursAgo || 0) * 60 * 60 * 1000),
      ratingAvg: 0,
      ratingCount: 0,
    }))
  );

  const reviewers = [customer, customer2, customer3];
  const reviewDocs = [];

  // Signature reviews for demo narrative
  reviewDocs.push(
    {
      provider: providers[0]._id,
      user: customer._id,
      rating: 5,
      comment: 'Fixed our home wiring quickly and cleanly. Fair price near Johar Town.',
    },
    {
      provider: providers[1]._id,
      user: customer._id,
      rating: 4,
      comment: 'Came on time and fixed the kitchen leak. Would book again.',
    },
    {
      provider: providers[0]._id,
      user: customer2._id,
      rating: 4,
      comment: 'Professional electrician, slightly delayed but good work.',
    },
    {
      provider: providers[2]._id,
      user: customer2._id,
      rating: 5,
      comment: 'Excellent tutor for Intermediate Physics.',
    },
    {
      provider: providers[3]._id,
      user: customer3._id,
      rating: 5,
      comment: 'CoolAir fixed our AC same day in Clifton. Transparent pricing.',
    }
  );

  // Extra reviews across approved providers for richer ratings
  providers.forEach((provider, idx) => {
    if (provider.status !== 'approved') return;
    if (idx < 4) return; // already covered above for first few
    const count = 1 + (idx % 3);
    for (let r = 0; r < count; r += 1) {
      const template = REVIEW_TEMPLATES[(idx + r) % REVIEW_TEMPLATES.length];
      const user = reviewers[(idx + r) % reviewers.length];
      reviewDocs.push({
        provider: provider._id,
        user: user._id,
        rating: template.rating,
        comment: `${template.comment} (${provider.area}, ${provider.city})`,
      });
    }
  });

  // Unique per (provider, user) — Review model may enforce that
  const seen = new Set();
  const uniqueReviews = [];
  for (const doc of reviewDocs) {
    const key = `${doc.provider}:${doc.user}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueReviews.push(doc);
  }

  const reviews = await Review.insertMany(uniqueReviews);

  for (const provider of providers) {
    const stats = await Review.aggregate([
      { $match: { provider: provider._id } },
      { $group: { _id: '$provider', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      provider.ratingAvg = Math.round(stats[0].avg * 10) / 10;
      provider.ratingCount = stats[0].count;
      await provider.save();
    }
  }

  customer.favorites = [providers[0]._id, providers[2]._id, providers[5]._id];
  await customer.save();

  await Request.insertMany([
    {
      customer: customer._id,
      provider: providers[0]._id,
      service: 'Home wiring',
      description: 'Need rewiring for two rooms under PKR 5000',
      preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      preferredTime: '4:00 PM',
      budget: 5000,
      location: 'Johar Town, Lahore',
      customerPhone: customer.phone,
      status: 'pending',
    },
    {
      customer: customer3._id,
      provider: providers[3]._id,
      service: 'Gas refill',
      description: 'AC not cooling properly — need gas check and refill',
      preferredDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      preferredTime: '11:00 AM',
      budget: 4500,
      location: 'Clifton Block 5, Karachi',
      customerPhone: customer3.phone,
      status: 'accepted',
      paymentStatus: 'paid',
      paymentMethod: 'jazzcash',
      paymentAmount: 4500,
      paymentRef: 'TL-DEMO-AC',
      paidAt: new Date(),
    },
  ]);

  const cities = [...new Set(providers.map((p) => p.city))];

  console.log('Seed complete');
  console.log('Admin:', admin.email, process.env.ADMIN_PASSWORD || 'Admin123!');
  console.log('Customer: customer@trustlink.ai / Customer123!');
  console.log('Provider: electrician@trustlink.ai / Provider123!');
  console.log('Categories:', categories.length);
  console.log('Providers:', providers.length);
  console.log('Cities:', cities.join(', '));
  console.log('Reviews seeded:', reviews.length);

  await mongoose.connection.close();
};

seed().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
