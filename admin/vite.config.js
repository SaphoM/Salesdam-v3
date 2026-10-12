import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // server: {
  //   port: 3002,
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:5001',
  //       changeOrigin: true,
  //       cookieDomainRewrite: { '*': '' },
  //       secure: false,
  //       configure: (proxy) => {
  //         proxy.on('proxyReq', (proxyReq) => {
  //           proxyReq.setHeader('origin', 'http://localhost:3002');
  //         });
  //         proxy.on('proxyRes', (proxyRes) => {
  //           const cookies = proxyRes.headers['set-cookie'];
  //           if (cookies) {
  //             proxyRes.headers['set-cookie'] = cookies.map((c) =>
  //               c
  //                 .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
  //                 .replace(/;\s*Secure/gi, '')
  //             );
  //           }
  //         });
  //       },
  //     },
  //   },
  // },
});
