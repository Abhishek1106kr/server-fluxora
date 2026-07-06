/**
 * seed-events.js  — Run once to populate the UpcomingEvent collection
 * Usage: node seed-events.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import UpcomingEvent from './models/UpcomingEvent.Model.js';

const EVENTS = [
  {
    title: "HackIndia 2025 — National Hackathon",
    type: "Hackathon",
    source: "platform_curated",
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: "Online + Delhi (Hybrid)",
    registrationLink: "https://hackindia.xyz",
    tags: ["AI/ML", "Web3", "FinTech", "Open Source"],
  },
  {
    title: "Google Cloud Next '25 Extended — India",
    type: "Conference",
    source: "platform_curated",
    startDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    location: "Bengaluru, India",
    registrationLink: "https://cloud.google.com/next",
    tags: ["Cloud", "GCP", "AI", "DevOps"],
  },
  {
    title: "React India Meetup — July 2025",
    type: "Meetup",
    source: "platform_curated",
    startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    location: "Pune, India",
    registrationLink: "https://reactindia.io",
    tags: ["React", "JavaScript", "Frontend"],
  },
  {
    title: "Node.js & Backend Architecture Webinar",
    type: "Webinar",
    source: "platform_curated",
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    location: "Online",
    registrationLink: "https://nodejs.org/en/events",
    tags: ["Node.js", "Backend", "Microservices", "API Design"],
  },
  {
    title: "Smart India Hackathon 2025",
    type: "Hackathon",
    source: "platform_curated",
    startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    location: "Pan-India (Multiple Venues)",
    registrationLink: "https://www.sih.gov.in",
    tags: ["AI/ML", "IoT", "Government", "Social Impact"],
  },
  {
    title: "AWS Community Day India 2025",
    type: "Conference",
    source: "platform_curated",
    startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    location: "Mumbai, India",
    registrationLink: "https://aws.amazon.com/developer/community",
    tags: ["AWS", "Cloud", "Serverless", "DevOps"],
  },
  {
    title: "Startup & Developer Networking Night",
    type: "Meetup",
    source: "platform_curated",
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    location: "Hyderabad, India",
    registrationLink: "https://fluxora.io/events",
    tags: ["Networking", "Startups", "Career", "Founders"],
  },
  {
    title: "Full Stack Web Dev Bootcamp — Live Webinar",
    type: "Webinar",
    source: "platform_curated",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    location: "Online",
    registrationLink: "https://fluxora.io/webinars",
    tags: ["React", "Node.js", "MongoDB", "Full Stack"],
  },
  {
    title: "HackWith India — Open Innovation Hackathon",
    type: "Hackathon",
    source: "platform_curated",
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    location: "Online",
    registrationLink: "https://devfolio.co/hackathons",
    tags: ["Open Innovation", "EdTech", "HealthTech"],
  },
  {
    title: "DevFest 2025 — Google Developer Groups",
    type: "Conference",
    source: "platform_curated",
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    location: "Chennai, India",
    registrationLink: "https://developers.google.com/community/devfest",
    tags: ["Flutter", "Firebase", "Angular", "TensorFlow"],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Avoid duplicating on repeated runs
    const existingCount = await UpcomingEvent.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ️  Already have ${existingCount} events. Delete them first to re-seed.`);
      console.log('   To reset: node -e "import(\'dotenv/config\'); import mongoose from \'mongoose\'; mongoose.connect(process.env.MONGODB_URI).then(() => mongoose.connection.db.dropCollection(\'upcomingevents\')).then(() => { console.log(\'dropped\'); process.exit(); })"');
      process.exit(0);
    }

    const inserted = await UpcomingEvent.insertMany(EVENTS);
    console.log(`✅ Seeded ${inserted.length} events into UpcomingEvent collection`);
    inserted.forEach(e => console.log(`   → [${e.type}] ${e.title}`));
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected. Done.');
    process.exit(0);
  }
}

seed();
