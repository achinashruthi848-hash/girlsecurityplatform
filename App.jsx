import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_BACKEND_URL || '/api';

function App() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState(null);

  const fetchContacts = async () => {
    const res = await fetch(`${API}/contacts`);
    const data = await res.json();
    if (data.success) setContacts(data.contacts);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const addContact = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    const res = await fetch(`${API}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json();
    if (data.success) {
      setContacts(prev => [data.contact, ...prev]);
      setName('');
      setPhone('');
      setStatus('Contact saved.');
    }
  };

  const deleteContact = async (id) => {
    await fetch(`${API}/contacts/${id}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const sendSOS = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported');
      return;
    }

    setStatus('Fetching location...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const payload = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        message: 'Emergency SOS from SafeHer!'
      };
      setLocation({ lat: payload.latitude, lng: payload.longitude });

      const response = await fetch(`${API}/share-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setStatus(`SOS sent. Map: ${result.mapsUrl}`);

        // Native share or SMS fallback
        const shareText = `${payload.message}\nLocation: ${result.mapsUrl}`;
        if (navigator.share) {
          navigator.share({ title: 'SafeHer SOS', text: shareText });
        } else {
          const smsRecipients = contacts.map(c => c.phone).join(',');
          window.location.href = `sms:${smsRecipients}?body=${encodeURIComponent(shareText)}`;
        }
      } else {
        setStatus('Failed to send SOS');
      }
    }, (err) => {
      setStatus('Could not get position: ' + err.message);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="app-container">
      <h1>SafeHer React + Node.js + SQL</h1>
      <section className="panel">
        <h2>Emergency Contacts</h2>
        <form onSubmit={addContact}>
          <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
          <button type="submit">Add</button>
        </form>

        <ul>
          {contacts.map(c => (
            <li key={c.id}>
              {c.name} - {c.phone}
              <button onClick={() => deleteContact(c.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Emergency SOS</h2>
        <button className="sos" onClick={sendSOS}>Send SOS + Share</button>
        <p>{status}</p>
        {location && (
          <p>Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</p>
        )}
      </section>
    </div>
  );
}

export default App;
