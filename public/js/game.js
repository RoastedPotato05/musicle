// game.js: client-side game logic
(function(){
  const songs = JSON.parse(sessionStorage.getItem('musicle_songs') || 'null');
  const playlistName = sessionStorage.getItem('musicle_playlist_name') || '';
  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    // nothing loaded — go back
    location.href = '/';
    return;
  }

  document.getElementById('title').textContent = 'Musicle — ' + (playlistName || 'Playlist');
  document.getElementById('meta').textContent = `${songs.length} tracks loaded.`;

  // state
  let indexOrder = shuffle(Array.from({length: songs.length}, (_, i) => i));
  let currentIndex = 0;
  let attemptsLeft = 3;
  let audio = null;

  const trackInfoEl = document.getElementById('track-info');
  const playBtn = document.getElementById('play-btn');
  const skipBtn = document.getElementById('skip-btn');
  const guessInput = document.getElementById('guess-input');
  const guessBtn = document.getElementById('guess-btn');
  const guessList = document.getElementById('guess-list');
  const debug = document.getElementById('debug');

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getCurrentTrack() {
    return songs[indexOrder[currentIndex]];
  }

  function renderTrack() {
    const t = getCurrentTrack();
    trackInfoEl.innerHTML = `<strong>Track ${currentIndex + 1}/${songs.length}</strong><div class="muted">Preview available: ${t.preview ? 'Yes' : 'No'}</div>`;
    attemptsLeft = 3;
    guessList.innerHTML = '';
    if (audio) { audio.pause(); audio = null; }
  }

  async function playPreview() {
    const t = getCurrentTrack();
    if (!t) {
      return;
    }
    if (!t.preview) {
      alert('No preview available for this track. You may still guess from memory or skip.');
      return;
    }
    if (audio) { audio.pause(); audio = null; }
    audio = new Audio(t.preview);
    try {
      await audio.play();
    } catch (err) {
      console.warn('Playback error', err);
      alert('Playback failed. Your browser may block autoplay — try clicking Play again or allow audio.');
    }
  }

  function finishGame(won, message) {
    sessionStorage.setItem('musicle_result', JSON.stringify({ won, message }));
    location.href = won ? '/win.html' : '/lose.html';
  }

  function checkGuess(guess) {
    if (!guess) return false;
    const t = getCurrentTrack();
    // check title or artist loosely
    const title = t.title || t.title_name || t.track || '';
    const artist = t.artist || '';
    const { looseMatch } = window; // util functions added below
    const matchedTitle = looseMatch(guess, title);
    const matchedArtist = looseMatch(guess, artist);
    return matchedTitle || matchedArtist;
  }

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value && guessInput.value.trim();
    if (!guess) return;
    // add to history
    const li = document.createElement('li');
    li.textContent = guess;
    guessList.appendChild(li);

    if (checkGuess(guess)) {
      // win for this round; advance or finish
      const t = getCurrentTrack();
      const message = `Correct! "${t.title}" — ${t.artist}`;
      // decide whether to finish the entire game or move to next track
      // For parity with your PHP flow, assume winning the round finishes game
      finishGame(true, message);
      return;
    } else {
      attemptsLeft--;
      if (attemptsLeft <= 0) {
        // out of attempts => lose
        const t = getCurrentTrack();
        const message = `Out of attempts. Answer was "${t.title}" — ${t.artist}`;
        finishGame(false, message);
        return;
      } else {
        alert(`Incorrect. ${attemptsLeft} attempts left for this track.`);
      }
    }
    guessInput.value = '';
    guessInput.focus();
  });

  skipBtn.addEventListener('click', () => {
    // skip goes to next track; if no more tracks, lose
    currentIndex++;
    if (currentIndex >= indexOrder.length) {
      finishGame(false, 'No more tracks to play.');
      return;
    }
    renderTrack();
  });

  playBtn.addEventListener('click', () => playPreview());

  // expose util functions for simpler imports (we didn't bundle util.js here)
  // to keep things self-contained, copy the utility functions inline:
  window.normalize = function(str){
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  window.looseMatch = function(guess, answer) {
    const g = window.normalize(guess || '');
    const a = window.normalize(answer || '');
    if (!g || !a) return false;
    if (g === a) return true;
    if (a.includes(g)) return true;
    const aw = a.split(' ').filter(Boolean).filter(w => w.length > 2);
    const gw = g.split(' ').filter(Boolean).filter(w => w.length > 2);
    if (!aw.length || !gw.length) return false;
    const matches = aw.filter(w => gw.includes(w));
    return matches.length >= 1;
  };

  // initialize first track
  renderTrack();
})();
