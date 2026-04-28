const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';

const pkg = {
  "name": "scorito-rondes-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.470.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3",
    "vite": "^5.4.1"
  }
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2));

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scorito Puzzler</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
fs.writeFileSync(path.join(out, 'index.html'), indexHtml);

const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
`;
fs.writeFileSync(path.join(out, 'vite.config.ts'), viteConfig);

const tsconfig = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;
fs.writeFileSync(path.join(out, 'tsconfig.json'), tsconfig);

const tsconfigNode = `{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`;
fs.writeFileSync(path.join(out, 'tsconfig.node.json'), tsconfigNode);

const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
fs.writeFileSync(path.join(out, 'tailwind.config.js'), tailwindConfig);

const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
fs.writeFileSync(path.join(out, 'postcss.config.js'), postcssConfig);

fs.mkdirSync(path.join(out, 'src'), {recursive: true});

const maintsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
fs.writeFileSync(path.join(out, 'src/main.tsx'), maintsx);

const apptsx = `import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <h1 className="text-3xl font-bold text-neutral-900">Scorito Grand Tour Puzzler</h1>
    </div>
  )
}
`;
fs.writeFileSync(path.join(out, 'src/App.tsx'), apptsx);

const indexcss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
fs.writeFileSync(path.join(out, 'src/index.css'), indexcss);
