/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is served from https://apps.josh.earth/boxbuilder/, so every asset URL needs that prefix.
export default defineConfig({
    base: '/boxbuilder/',
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: false,
    },
})
