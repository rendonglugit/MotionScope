/** One cancellable callback chain per video; paused inspection never starts playback. */
export function createVideoFrameDriver({video, render, fps, raf = requestAnimationFrame, caf = cancelAnimationFrame, onError = () => {}}) {
  const frameCallbacks = typeof video.requestVideoFrameCallback === 'function' && typeof video.cancelVideoFrameCallback === 'function';
  let running = false, disposed = false, pending = null, generation = 0, lastFrame = null;
  const stats = {mode: frameCallbacks ? 'requestVideoFrameCallback' : 'requestAnimationFrame', rendered: 0, callbacks: 0};
  function cancel() {
    generation++;
    if (pending !== null) {
      if (frameCallbacks) video.cancelVideoFrameCallback(pending); else caf(pending);
      pending = null;
    }
  }
  function draw(time = video.currentTime, force = false) {
    if (disposed || video.readyState < 2 || video.seeking) return;
    const frame = Math.floor(time * fps + 1e-4);
    if (!force && lastFrame === frame) return;
    render(time);
    lastFrame = frame;
    stats.rendered++;
  }
  function schedule() {
    if (!running || disposed || pending !== null) return;
    const token = generation;
    const callback = (_now, metadata) => {
      if (disposed || !running || token !== generation) return;
      pending = null;
      stats.callbacks++;
      try {
        if (!video.paused) draw(metadata?.mediaTime ?? video.currentTime);
      } catch (error) {
        pause();
        onError(error);
        return;
      }
      schedule();
    };
    pending = frameCallbacks ? video.requestVideoFrameCallback(callback) : raf(callback);
  }
  function pause() { running = false; cancel(); }
  return {
    start() { if (disposed || running) return; running = true; lastFrame = null; schedule(); },
    pause,
    draw(force = true) { draw(video.currentTime, force); },
    dispose() { if (disposed) return; pause(); disposed = true; },
    diagnostics() { return {...stats, running, pending: pending !== null}; },
  };
}

/** Serialize decoder seeks and discard intermediate drag targets before starting them. */
export function createLatestTask() {
  let pending = null, running = false, disposed = false;
  async function drain() {
    if (running || disposed) return;
    running = true;
    while (pending && !disposed) {
      const item = pending; pending = null;
      try { await item.task(); item.resolve(); } catch (error) { item.reject(error); }
    }
    running = false;
  }
  return {
    run(task) {
      if (disposed) return Promise.resolve();
      if (pending) pending.resolve();
      const promise = new Promise((resolve, reject) => { pending = {task, resolve, reject}; });
      void drain(); return promise;
    },
    dispose() { disposed = true; pending?.resolve(); pending = null; },
  };
}
