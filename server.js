require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const DATABASE_FILE = process.env.DATABASE_FILE || './safeher.db';

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function createDb() {
  const db = await open({
    filename: DATABASE_FILE,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS location_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

app.get('/api/contacts', async (req, res) => {
  const db = await createDb();
  const contacts = await db.all('SELECT * FROM contacts ORDER BY id DESC;');
  res.json({ success: true, contacts });
});

app.post('/api/contacts', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone required' });
  }

  const db = await createDb();
  const result = await db.run('INSERT INTO contacts (name, phone) VALUES (?, ?)', [name, phone]);

  res.json({ success: true, contact: { id: result.lastID, name, phone } });
});

app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const db = await createDb();
  await db.run('DELETE FROM contacts WHERE id = ?', [id]);
  res.json({ success: true });
});

app.post('/api/share-location', async (req, res) => {
  const { latitude, longitude, message } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  const db = await createDb();
  const insertResult = await db.run(
    'INSERT INTO location_updates (latitude, longitude, message) VALUES (?, ?, ?)',
    [latitude, longitude, message || 'SOS Location']
  );

  const contacts = await db.all('SELECT * FROM contacts');
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    for (const contact of contacts) {
      try {
        await twilioClient.messages.create({
          body: `${message || 'Emergency!'}\nLocation: ${mapsUrl}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: contact.phone
        });
      } catch (error) {
        console.error('Twilio send failure:', error);
      }
    }
  }

  res.json({ success: true, id: insertResult.lastID, contactsSent: contacts.length, mapsUrl });
});

app.get('/api/location-updates', async (req, res) => {
  const db = await createDb();
  const updates = await db.all('SELECT * FROM location_updates ORDER BY created_at DESC;');
  res.json({ success: true, updates });
});

app.listen(PORT, () => {
  console.log(`SafeHer backend running on http://localhost:${PORT}`);
});
