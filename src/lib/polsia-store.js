// Tiny shared reactive store for the interactive map. The search box and
// outlier toggle (in IdeaMap) drive both the scatter and the themes bar
// (a separate component), mirroring Observable's reactive cells. Pinned to
// `window` so it's a single instance regardless of how Astro bundles the
// per-component client scripts.

function store() {
    if (!window.__polsia) {
        window.__polsia = {
            state: { query: '', includeOutliers: true, tweets: null, clusters: null },
            bus: new EventTarget(),
        };
    }
    return window.__polsia;
}

export const state = () => store().state;

const emit = () => store().bus.dispatchEvent(new Event('change'));

export function setFilter(patch) {
    Object.assign(store().state, patch);
    emit();
}

export function setData(tweets, clusters) {
    const s = store().state;
    s.tweets = tweets;
    s.clusters = clusters;
    emit();
}

export function onChange(cb) {
    const b = store().bus;
    b.addEventListener('change', cb);
    return () => b.removeEventListener('change', cb);
}

// Apply the current text query + outlier toggle to the corpus.
// Trimmed records use short keys: x, y, c (cluster), t (text).
export function filteredTweets() {
    const s = store().state;
    if (!s.tweets) return [];
    const q = (s.query || '').trim().toLowerCase();
    const f = q ? s.tweets.filter((d) => d.t.toLowerCase().includes(q)) : s.tweets;
    return s.includeOutliers ? f : f.filter((d) => d.c !== -1);
}
