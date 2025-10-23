require('dotenv').config();
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Spotify setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

let tokenExpiry = 0;

async function ensureToken() {
  const now = Date.now();
  if (!spotifyApi.getAccessToken() || now >= tokenExpiry) {
    const res = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(res.body['access_token']);
    // set expiry 5 seconds earlier than actual to be safe
    tokenExpiry = now + (res.body['expires_in'] * 1000) - 5000;
  }
}

// parse playlist id from many possible URL formats
function parsePlaylistId(urlOrId) {
  if (!urlOrId) return null;
  // spotify URI: spotify:playlist:ID
  let m = urlOrId.match(/spotify:playlist:([A-Za-z0-9]+)/);
  if (m) return m[1];
  // standard URL
  m = urlOrId.match(/playlist\/([A-Za-z0-9]+)/);
  if (m) return m[1];
  // query param ?list=...
  m = urlOrId.match(/[?&]list=([A-Za-z0-9]+)/);
  if (m) return m[1];
  // maybe user pasted only the id
  m = urlOrId.match(/^([A-Za-z0-9]+)$/);
  if (m) return m[1];
  return null;
}

// fetch all tracks from playlist (handles pagination)
async function fetchAllPlaylistTracks(playlistId) {
  const limit = 100;
  let offset = 0;
  let all = [];
  while (true) {
    const res = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
    const items = res.body.items || [];
    items.forEach(i => {
      const t = i.track;
      if (!t) return;
      const title = t.name || '';
      const artist = (t.artists && t.artists.length) ? t.artists.map(a => a.name).join(', ') : '';
      // prefer track preview_url (short MP3 snippet) — may be null
      const preview = t.preview_url || '';
      all.push({ title, artist, preview, spotify_url: t.external_urls && t.external_urls.spotify ? t.external_urls.spotify : '' });
    });
    if (items.length < limit) break;
    offset += items.length;
  }
  return all;
}

// API endpoint: POST /api/playlist { playlistUrl }
app.post('/api/playlist', async (req, res) => {
  try {
    const { playlistUrl } = req.body;
    if (!playlistUrl) return res.status(400).json({ error: 'playlistUrl required' });

    const playlistId = parsePlaylistId(playlistUrl.trim());
    if (!playlistId) return res.status(400).json({ error: 'Unable to parse playlist id from input' });

    await ensureToken();
    const playlistRes = await spotifyApi.getPlaylist(playlistId).catch(e => { throw e; });
    const playlistName = playlistRes.body.name || 'Playlist';

    const tracks = await fetchAllPlaylistTracks(playlistId);
    // remove tracks with no preview_url (we can still include them but likely not playable)
    const playable = tracks.filter(t => t.preview);
    // If none have preview_url fall back to returning all (user may want to use spotify url)
    const resultTracks = (playable.length > 0) ? playable : tracks;

    return res.json({ playlistName, count: resultTracks.length, songs: resultTracks });
  } catch (err) {
    console.error('API error', err.message || err);
    // return helpful error
    return res.status(500).json({ error: 'Failed to fetch playlist. Check playlist ID and that your Spotify credentials are correct.' });
  }
});

// fallback route serves index.html (static files handle the rest)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
