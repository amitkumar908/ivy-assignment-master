import { useState, useEffect } from 'react';
import './App.css'
const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = import.meta.env.VITE_API_KEY;

function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [email, setEmail] = useState('demo1@ivy.homes');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [filterLocality, setFilterLocality] = useState('');

  // Selected Item state for Detail Page
  const [selectedItem, setSelectedItem] = useState(null);

  // Favorites state — persisted to localStorage as a small store of saved items
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('favourite_ids') || '[]');
      return new Set(stored);
    } catch {
      return new Set();
    }
  });
  const [favoriteItems, setFavoriteItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favourite_items') || '{}');
    } catch {
      return {};
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      const newAccessToken = data.access_token;

      localStorage.setItem('access_token', newAccessToken);
      setToken(newAccessToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setListings([]);
    setRentals([]);
    setProjects([]);
    setSelectedItem(null);
  };

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setFetchingData(true);
      const headers = {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${token}`
      };

      try {
        const [listingsRes, rentalsRes, projectsRes] = await Promise.all([
          fetch(`${BASE_URL}/v1/listings?page=1&limit=50`, { headers }),
          fetch(`${BASE_URL}/v1/rentals?page=1&limit=50`, { headers }),
          fetch(`${BASE_URL}/v1/projects?page=1&limit=50`, { headers })
        ]);

        if (listingsRes.status === 401 || rentalsRes.status === 401 || projectsRes.status === 401) {
          handleLogout();
          throw new Error('Session expired (15-min limit reached). Please log in again.');
        }

        const listingsData = await listingsRes.json();
        const rentalsData = await rentalsRes.json();
        const projectsData = await projectsRes.json();

        setListings(listingsData.results || []);
        setRentals(rentalsData.results || []);
        setProjects(projectsData.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [token]);

  const toggleFavorite = async (listingId, item) => {
    const headers = {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      if (favorites.has(listingId)) {
        await fetch(`${BASE_URL}/v1/favourites/${listingId}`, { method: 'DELETE', headers });
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          localStorage.setItem('favourite_ids', JSON.stringify([...next]));
          return next;
        });
        setFavoriteItems(prev => {
          const next = { ...prev };
          delete next[listingId];
          localStorage.setItem('favourite_items', JSON.stringify(next));
          return next;
        });
      } else {
        await fetch(`${BASE_URL}/v1/favourites`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ listing_id: listingId })
        });
        setFavorites(prev => {
          const next = new Set(prev).add(listingId);
          localStorage.setItem('favourite_ids', JSON.stringify([...next]));
          return next;
        });
        setFavoriteItems(prev => {
          const next = { ...prev, [listingId]: item };
          localStorage.setItem('favourite_items', JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to update favorite status', err);
    }
  };

  const currentData =
    activeTab === 'listings' ? listings :
    activeTab === 'rentals' ? rentals :
    activeTab === 'favourites' ? Object.values(favoriteItems) :
    projects;

  const filteredData = currentData.filter(item =>
    filterLocality === '' || item.locality?.toLowerCase().includes(filterLocality.toLowerCase())
  );

  const tabCounts = {
    listings: listings.length,
    rentals: rentals.length,
    projects: projects.length,
    favourites: favorites.size
  };

  const tabIcon = {
    listings: 'M4 21V9l8-6 8 6v12h-6v-7h-4v7z',
    rentals: 'M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-6h6v6',
    projects: 'M4 20V8l5-4 5 4v2l5-3v13H4Zm5-8h2m-2 4h2',
    insights: 'M4 19V5m5 14V9m5 10V4m5 15v-7',
    favourites: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z'
  };

  const iconFor = (item) => {
    if (item.property_type === 'apartment') return tabIcon.rentals;
    if (item.total_towers) return tabIcon.projects;
    return tabIcon.listings;
  };

  // 1. LOGIN PAGE
  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-visual-grid" />
          <div className="auth-visual-content">
            <span className="wordmark">Ivy Homes</span>
            <h1>The record of every<br />address that matters.</h1>
            <p>Listings, rentals and projects, reconciled into a single
              source of truth for the teams who price and place them.</p>
            <div className="auth-stat-row">
              <div>
                <strong>3,200</strong>
                <span>records tracked</span>
              </div>
              <div>
                <strong>50</strong>
                <span>verified properties</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-form-card">
            <h2>Sign in</h2>
            <p className="auth-form-sub">Access your analytical dashboard.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" placeholder="you@ivy.homes" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. DETAIL PAGE
  if (selectedItem) {
    const item = selectedItem;
    return (
      <div className="app-shell single-column">
        <header className="detail-topbar">
          <button onClick={() => setSelectedItem(null)} className="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Dashboard
          </button>
          <span className="wordmark small">Ivy Homes</span>
        </header>

        <div className="detail-hero">
          <div className="detail-hero-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={iconFor(item)} /></svg>
          </div>
          <span className="detail-badge">{item.property_type || 'Project'}</span>
          <h1>{item.title || item.apartment_name}</h1>
          <p className="detail-location">{item.locality} — Reference {item.listing_id || item.project_id}</p>
        </div>

        <div className="detail-body">
          <section className="detail-section">
            <h3>Overview</h3>
            <div className="spec-strip">
              {item.price && <div className="spec"><span>Price</span><strong>₹{item.price.toLocaleString('en-IN')}</strong></div>}
              {item.price_min && <div className="spec"><span>Price range</span><strong>{item.price_min}–{item.price_max} Cr</strong></div>}
              {item.bedroom && <div className="spec"><span>Bedrooms</span><strong>{item.bedroom} BHK</strong></div>}
              {item.bathroom && <div className="spec"><span>Bathrooms</span><strong>{item.bathroom}</strong></div>}
              {item.carpet_area && <div className="spec"><span>Carpet area</span><strong>{item.carpet_area} sqft</strong></div>}
              {item.furnishing && <div className="spec"><span>Furnishing</span><strong>{item.furnishing}</strong></div>}
              {item.deposit && <div className="spec"><span>Deposit</span><strong>₹{item.deposit.toLocaleString('en-IN')}</strong></div>}
              {item.maintenance && <div className="spec"><span>Maintenance</span><strong>₹{item.maintenance.toLocaleString('en-IN')}</strong></div>}
              {item.developer_name && <div className="spec"><span>Developer</span><strong>{item.developer_name}</strong></div>}
              {item.project_status && <div className="spec"><span>Status</span><strong>{item.project_status}</strong></div>}
              {item.possession_date && <div className="spec"><span>Possession</span><strong>{item.possession_date}</strong></div>}
              {item.total_units && <div className="spec"><span>Total units</span><strong>{item.total_units}</strong></div>}
            </div>
          </section>

          {item.description && (
            <section className="detail-section">
              <h3>Description</h3>
              <p className="detail-description">{item.description}</p>
            </section>
          )}

          {item.amenities && (
            <section className="detail-section">
              <h3>Amenities</h3>
              <div className="amenity-row">
                {item.amenities.map(amenity => (
                  <span key={amenity} className="amenity-pill">{amenity}</span>
                ))}
              </div>
            </section>
          )}

          {item.posted_by_name && (
            <section className="contact-strip">
              <div>
                <span>Contact {item.posted_by}</span>
                <strong>{item.posted_by_name}</strong>
              </div>
              <a href={`tel:${item.posted_by_contact}`} className="btn-primary contact-btn">
                Call {item.posted_by_contact}
              </a>
            </section>
          )}
        </div>
      </div>
    );
  }

  // 3. MAIN DASHBOARD
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="wordmark">Ivy Homes</span>
          <span className="sidebar-sub">Analytical dashboard</span>
        </div>

        <nav className="sidebar-nav">
          {['listings', 'rentals', 'projects'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d={tabIcon[tab]} /></svg>
              <span>{tab}</span>
              <em>{tabCounts[tab]}</em>
            </button>
          ))}
          <button
            onClick={() => setActiveTab('favourites')}
            className={`nav-item ${activeTab === 'favourites' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d={tabIcon.favourites} /></svg>
            <span>Favourites</span>
            <em>{tabCounts.favourites}</em>
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d={tabIcon.insights} /></svg>
            <span>Insights</span>
          </button>
        </nav>

        <button onClick={handleLogout} className="nav-item logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          <span>Log out</span>
        </button>
      </aside>

      <main className="main-panel">
        <header className="main-topbar">
          <h1>{activeTab === 'insights' ? 'Insights & discrepancies' : activeTab === 'favourites' ? 'Your favourites' : `Browse ${activeTab}`}</h1>
          {activeTab !== 'insights' && (
            <div className="search-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input
                type="text"
                placeholder="Filter by locality — sector 49, DLF Phase 2…"
                value={filterLocality}
                onChange={(e) => setFilterLocality(e.target.value)}
              />
            </div>
          )}
        </header>

        {error && <div className="banner-error">{error}</div>}

        {activeTab === 'insights' ? (
          <div className="insights-panel">
            <p className="insights-lead">A summary of the core analytical findings and documentation
              discrepancies discovered during the assessment.</p>
            <div className="insights-grid">
              <div className="insight-card">
                <span>Total retrievable listings</span>
                <strong>3,200</strong>
              </div>
              <div className="insight-card accent-teal">
                <span>Unique properties (GPS)</span>
                <strong>50</strong>
              </div>
              <div className="insight-card accent-warn">
                <span>Fake listings detected</span>
                <strong>14</strong>
              </div>
              <div className="insight-card accent-warn">
                <span>Corrupt Listing IDs</span>
                <strong>4</strong>
              </div>
            </div>
          </div>
        ) : fetchingData ? (
          <div className="loading-state">Loading records…</div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <p>
              {activeTab === 'favourites'
                ? 'You haven\u2019t saved anything yet. Tap the heart on a listing to keep it here.'
                : `No ${activeTab} match "${filterLocality}".`}
            </p>
            {filterLocality && (
              <button onClick={() => setFilterLocality('')} className="btn-ghost">Clear filter</button>
            )}
          </div>
        ) : (
          <div className="property-grid">
            {filteredData.map(item => {
              const id = item.listing_id || item.project_id;
              const isFav = favorites.has(id);
              return (
                <article key={id} className="property-card" onClick={() => setSelectedItem(item)}>
                  <div className="property-card-media">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={iconFor(item)} /></svg>
                    {item.listing_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.listing_id, item); }}
                        className={`fav-btn ${isFav ? 'is-fav' : ''}`}
                        title="Toggle favourite"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="property-card-body">
                    <h3>{item.title || item.apartment_name}</h3>
                    <p className="property-locality">{item.locality}</p>
                    <div className="property-card-footer">
                      <div>
                        <span>Price</span>
                        <strong>{item.price ? `₹${item.price.toLocaleString('en-IN')}` : `${item.price_min}–${item.price_max} Cr`}</strong>
                      </div>
                      <div className="align-right">
                        <span>{item.bedroom ? 'Configuration' : 'Units'}</span>
                        <strong>{item.bedroom ? `${item.bedroom} BHK` : item.total_units}</strong>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
