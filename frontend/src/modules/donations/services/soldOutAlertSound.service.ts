let audioContext: AudioContext | null =
  null;

function getAudioContext():
  AudioContext | null {
  if (
    typeof window === 'undefined'
    || !window.AudioContext
  ) {
    return null;
  }

  if (!audioContext) {
    audioContext =
      new window.AudioContext();
  }

  return audioContext;
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  startsAt: number,
) {
  const oscillator =
    context.createOscillator();

  const gain =
    context.createGain();

  const duration = 0.16;
  const endsAt =
    startsAt + duration;

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(
    frequency,
    startsAt,
  );

  gain.gain.setValueAtTime(
    0.0001,
    startsAt,
  );

  gain.gain.exponentialRampToValueAtTime(
    0.16,
    startsAt + 0.025,
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    endsAt,
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startsAt);
  oscillator.stop(endsAt);

  oscillator.addEventListener(
    'ended',
    () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    { once: true },
  );
}

function playWithContext(
  context: AudioContext,
) {
  const startsAt =
    context.currentTime + 0.02;

  scheduleTone(
    context,
    740,
    startsAt,
  );

  scheduleTone(
    context,
    988,
    startsAt + 0.2,
  );
}

function prepare() {
  const context =
    getAudioContext();

  if (
    context
    && context.state === 'suspended'
  ) {
    void context.resume();
  }
}

function play() {
  const context =
    getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === 'running') {
    playWithContext(context);
    return;
  }

  void context
    .resume()
    .then(() => {
      playWithContext(context);
    })
    .catch(() => {
      // The visual alert remains available if browser audio is blocked.
    });
}

export const soldOutAlertSoundService = {
  prepare,
  play,
};