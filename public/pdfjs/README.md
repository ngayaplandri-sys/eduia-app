# PDF.js — décodeurs d'images sans WebAssembly

Copiés depuis `node_modules/pdfjs-dist/wasm/` (pdfjs-dist 6.4.299) pour le
lecteur PDF du « Professeur vocal » (`components/voice-tutor/pdf-document.ts`,
option `wasmUrl: "/pdfjs/wasm/"`, `useWasm: false`) : la CSP de l'app n'autorise
pas la compilation WebAssembly. Ils décodent les images JBIG2 et JPEG 2000 des
PDF scannés. À recopier si `pdfjs-dist` change de version.
