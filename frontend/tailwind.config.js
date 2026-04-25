/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content tells Tailwind where to look for your classes
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  
  // CRITICAL: This was missing and is why you get the "NativeWind preset" error
  presets: [require("nativewind/preset")], 
  
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#080808',
          card: '#1A1412',
          border: '#3D2C24',
          primary: '#EAB308',
          primaryDark: '#CA8A04',
          text: '#FAFAF9',
          muted: '#A8A29E',
          danger: '#EF4444',
          success: '#84CC16',
        }
      }
    },
  },
  plugins: [],
}