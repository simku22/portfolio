// Shared client-side helpers for the Polsia data-essay charts.
// Faithful port of the Observable Framework dashboard's chart logic to
// vanilla Observable Plot rendered into Astro island components.

// Base-path-aware fetch. Astro's BASE_URL may or may not carry a trailing
// slash depending on config; normalise so paths resolve under /portfolio.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export async function loadJSON(name) {
    const res = await fetch(`${BASE}/polsia/${name}`);
    if (!res.ok) throw new Error(`failed to load polsia/${name}: ${res.status}`);
    return res.json();
}

// The 20-colour categorical palette from the original dashboard.
export const palette = [
    '#4C78A8', '#F58518', '#E45756', '#72B7B2', '#54A24B',
    '#EECA3B', '#B279A2', '#FF9DA6', '#9D755D', '#BAB0AC',
    '#9ECAE9', '#FFBF79', '#88D27A', '#FF9D98', '#83BCB6',
    '#F2CF5B', '#D6A5C9', '#D8B5A5', '#79706E', '#D67195',
];

export const clusterColor = (id) =>
    id < 0 ? outlierColor() : palette[id % palette.length];

// Outlier dots: a faint neutral that reads on both themes.
export const outlierColor = () => (isDark() ? '#4b5563' : '#d4d6d8');

export const isDark = () => document.documentElement.classList.contains('dark');

// Re-run a callback whenever the site's light/dark class flips, so charts can
// recolour their theme-dependent bits (outliers, axis text via CSS vars).
export function onThemeChange(cb) {
    const obs = new MutationObserver((muts) => {
        for (const m of muts) {
            if (m.attributeName === 'class') {
                cb();
                return;
            }
        }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
}

// Fire `cb` once the element scrolls near the viewport — used to defer the
// heavy 24,860-point fetch + render until the reader reaches the map.
export function whenVisible(el, cb, rootMargin = '300px') {
    if (!('IntersectionObserver' in window)) {
        cb();
        return;
    }
    const io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    io.disconnect();
                    cb();
                    return;
                }
            }
        },
        { rootMargin }
    );
    io.observe(el);
}

export function debounce(fn, ms = 160) {
    let h;
    return (...args) => {
        clearTimeout(h);
        h = setTimeout(() => fn(...args), ms);
    };
}

// Per-visit teardown. The site uses Astro's ClientRouter (view transitions):
// the <body> is swapped but <html>, window, and ES modules persist. Without
// teardown, observers on <html> and listeners on the window-singleton store
// would stack on every navigation back to the post. Disposers registered here
// run on the next `astro:before-swap`. One document listener, ever.
const _disposers = [];
let _wired = false;

export function onCleanup(fn) {
    _disposers.push(fn);
    if (!_wired) {
        _wired = true;
        document.addEventListener('astro:before-swap', () => {
            while (_disposers.length) {
                try {
                    _disposers.pop()();
                } catch {
                    /* ignore teardown errors */
                }
            }
        });
    }
}

// Common Plot style so every chart inherits the essay's typography and the
// theme-driven text colour (axis ticks, labels) via CSS variables.
export const plotStyle = () => ({
    background: 'transparent',
    color: 'var(--polsia-fg-muted)',
    fontFamily: 'var(--polsia-sans)',
    fontSize: '12px',
    overflow: 'visible',
});

// Swap the rendered figure into a host node, clearing any prior render.
export function mount(host, figure) {
    host.replaceChildren(figure);
}

// Render a single chart into `host` responsively: `draw(width)` returns a Plot
// figure. Re-renders on container resize (debounced) and, when `onTheme`, on
// light/dark flips. Returns the render fn so callers can trigger manually.
export function makeChart(host, draw, { onTheme = false } = {}) {
    let lastW = 0;
    const render = () => {
        const width = Math.max(280, Math.floor(host.clientWidth) || 700);
        lastW = width;
        const fig = draw(width);
        if (fig) mount(host, fig);
    };
    render();
    const ro = new ResizeObserver(
        debounce(() => {
            if (Math.abs((host.clientWidth || 0) - lastW) > 2) render();
        }, 150)
    );
    ro.observe(host);
    const offTheme = onTheme ? onThemeChange(render) : null;
    onCleanup(() => {
        ro.disconnect();
        offTheme?.();
    });
    return render;
}
