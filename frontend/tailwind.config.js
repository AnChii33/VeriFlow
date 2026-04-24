module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#020617',
          card: '#0f172a',
          blue: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          border: '#1e293b'
        }
      }
    },
  },
  plugins: [],
};