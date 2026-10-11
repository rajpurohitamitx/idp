export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { ink: '#10151b', panel: '#161d25', panel2: '#1d2630', line: '#2a3440', safety: '#f5a623',
      hazard: { low: '#5b8cff', medium: '#f5a623', high: '#ff6b4a', critical: '#ff3b3b' }, ok: '#2fbf71' },
    fontFamily: { display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'], mono: ['"IBM Plex Mono"', 'monospace'] },
  } },
  plugins: [],
};
