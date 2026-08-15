import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Also ignore the local lowdb JSON file(s) under /data — the server
      // writes to these on every request as a fallback/cache, and without
      // this exclusion Vite treats each write as a source change and forces
      // a full browser page reload mid-request. That reload wipes React
      // state (e.g. a "Confirm & Activate Account" click that just set the
      // request to "approved" in memory) and cancels any in-flight fetches,
      // so the UI snaps back to showing the request as "Pending" even
      // though the approval may have actually succeeded on the server.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/**'] },
    },
  };
});
