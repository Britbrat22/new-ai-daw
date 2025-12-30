import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Theme toggle support
const root = document.documentElement
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (prefersDark) root.classList.add('dark')
else root.classList.remove('dark')

createRoot(document.getElementById('root')!).render(<App />)
