// game.js: Spotify IFrame-based Musicle playback
(function(){
  const songs = JSON.parse(sessionStorage.getItem('musicle_songs') || 'null');
  const playlistName = sessionStorage.getItem('musicle_playlist_name') || '';
  if (!songs || !Array.isArray(songs) || songs.length === 0) {
    location.href = '/';
    return;
  }

  document.getElementById('title').textContent = 'Musicle — ' + (playlistName || 'Playlist');
  document.getElementById('meta').textContent = `${songs.length} tracks loaded.`;

  // game state
  let indexOrder = shuffle(Array.from({length: songs.length}, (_, i) => i));
  let currentIndex = 0;
  let fails = 0;
  let controller = null;
  let currentTrack = null;

  const trackInfoEl = document.getElementById('track-info');
  const playBtn = document.getElementById('spotify-play-btn');
  const playText = document.getElementById('play-text');
  const guessInput = document.getElementById('guess-input');
  const guessBtn = document.getElementById('guess-btn');
  const guessList = document.getElementById('guess-list');

  // shuffle helper
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
    currentTrack = getCurrentTrack();
    trackInfoEl.innerHTML = `<strong>Track ${currentIndex + 1}/${songs.length}</strong><div class="muted">${currentTrack.title} — ${currentTrack.artist}</div>`;
    guessList.innerHTML = '';
    guessInput.value = '';
    fails = 0;

    // load the new track in Spotify embed controller
    if (controller) {
      controller.loadUri(currentTrack.spotify_url.replace('https://open.spotify.com/', 'spotify:'));
    }
  }

  function finishGame(won, message) {
    sessionStorage.setItem('musicle_result', JSON.stringify({ won, message }));
    location.href = won ? '/win.html' : '/lose.html';
  }

  function checkGuess(guess) {
    const normalize = str => (str || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    const g = normalize(guess);
    const title = normalize(currentTrack.title);
    const artist = normalize(currentTrack.artist);
    return g && (title.includes(g) || artist.includes(g));
  }

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim();
    if (!guess) return;

    const li = document.createElement('li');
    li.textContent = guess;
    guessList.appendChild(li);

    if (checkGuess(guess)) {
      const msg = `Correct! "${currentTrack.title}" — ${currentTrack.artist}`;
      finishGame(true, msg);
    } else {
      fails++;
      if (fails >= 6) {
        const msg = `Out of attempts. Answer was "${currentTrack.title}" — ${currentTrack.artist}`;
        finishGame(false, msg);
      } else {
        alert(`Incorrect. ${3 - fails} attempts left.`);
      }
    }
    guessInput.value = '';
    guessInput.focus();
  });

  // Spotify IFrame API integration
  window.onSpotifyIframeApiReady = IFrameAPI => {
    const element = document.getElementById('embed-iframe');
    const options = { width: 0, height: 0, uri: '' };
    const callback = EmbedController => {
      controller = EmbedController;
      controller.addListener('ready', () => {
        console.log('Spotify IFrame ready');
        renderTrack();
      });

      controller.addListener('playback_update', e => {
        if (!e.data || e.data.isPaused === undefined) return;
        const seconds = parseInt(e.data.position / 1000, 10);

        // pause playback based on number of fails (like your PHP logic)
        const limits = [1, 3, 6, 10, 15, 30];
        if (seconds >= limits[Math.min(fails, limits.length - 1)]) {
          controller.pause();
        }

        // change button label dynamically
        if (e.data.isPaused) {
          playText.textContent = 'Play';
        } else {
          playText.textContent = 'Pause';
        }
      });
    };
    IFrameAPI.createController(element, options, callback);
  };

  playBtn.addEventListener('click', () => {
    if (controller) {
      controller.togglePlay();
    }
  });
})();
