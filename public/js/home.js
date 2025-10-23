// home.js: send playlist input to server, store songs in sessionStorage, redirect to game
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('playlist-input');
  const btn = document.getElementById('start-btn');
  const msg = document.getElementById('form-msg');

  btn.addEventListener('click', async () => {
    const val = input.value && input.value.trim();
    if (!val) {
      msg.textContent = 'Please paste a Spotify playlist link or ID.';
      return;
    }
    msg.textContent = 'Loading playlist... this may take a few seconds.';
    btn.disabled = true;

    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: val })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');

      if (!data.songs || data.songs.length === 0) {
        msg.textContent = 'No songs found in that playlist.';
        btn.disabled = false;
        return;
      }

      // store songs in sessionStorage for game.html
      sessionStorage.setItem('musicle_songs', JSON.stringify(data.songs));
      sessionStorage.setItem('musicle_playlist_name', data.playlistName || '');
      // also clear previous result
      sessionStorage.removeItem('musicle_result');
      // redirect to game
      location.href = '/game.html';
    } catch (err) {
      console.error(err);
      msg.textContent = 'Error loading playlist: ' + (err.message || err);
      btn.disabled = false;
    }
  });
});
