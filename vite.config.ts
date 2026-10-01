import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function patchFirebaseAuthPlugin() {
  return {
    name: 'patch-firebase-auth-plugin',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if ((id.includes('firebase') || id.includes('auth')) && code.includes('Pending promise was never set')) {
        return {
          code: code
            .replaceAll("debugAssert(this.pendingPromise, 'Pending promise was never set');", 'if (!this.pendingPromise) { return; }')
            .replaceAll('debugAssert(this.pendingPromise, "Pending promise was never set");', 'if (!this.pendingPromise) { return; }'),
          map: null,
        };
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [patchFirebaseAuthPlugin(), react(), tailwindcss()],
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
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
