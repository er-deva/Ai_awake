/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'meet-dark': '#092635',       // Deep Blue
                'meet-gray': '#1B4242',       // Dark Green
                'meet-mid': '#5C8374',        // Sage
                'meet-light': '#9EC8B9',      // Mint
                'meet-glass': 'rgba(255, 255, 255, 0.05)',
                'meet-glass-hover': 'rgba(255, 255, 255, 0.1)',
                'meet-blue': '#9EC8B9',       // Mint (as Primary)
                'meet-purple': '#5C8374',     // Sage (as Secondary)
                'meet-red': '#EF4444',        // Red
                'meet-text': '#E5E7EB',       // Soft White
                'meet-text-dim': '#9CA3AF',   // Dimmed Text
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #1B4242 0%, #092635 100%)',
                'gradient-dark': 'linear-gradient(to bottom, #092635, #0f2e3f)',
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'neon': '0 0 10px rgba(59, 130, 246, 0.5)',
            },
        },
    },
    plugins: [],
}
