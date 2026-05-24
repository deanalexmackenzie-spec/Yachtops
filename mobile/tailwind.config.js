/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:        '#fafaf9',
        surface:   '#ffffff',
        surface2:  '#f5f5f4',
        ink:       '#1c1917',
        inkSoft:   '#57534e',
        inkMute:   '#a8a29e',
        rule:      '#e7e5e4',
        ruleStrong:'#d6d3d1',
        accent:    '#0c4a6e',
        accentSoft:'#f0f9ff',
        done:      '#15803d',
        doneSoft:  '#f0fdf4',
        warn:      '#c2410c',
        warnSoft:  '#fff7ed',
        alert:     '#b91c1c',
        alertSoft: '#fef2f2',
        bridge:    '#1e3a8a',
        deck:      '#0c4a6e',
        engine:    '#991b1b',
        interior:  '#6b21a8',
        purser:    '#854d0e',
        eto:       '#115e59',
      },
    },
  },
  plugins: [],
};
