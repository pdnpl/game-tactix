import './style.css'
import { mount } from './ui/app'
import { initNative } from './ui/native'

mount()

// Native-only setup (haptics, status bar, back button, splash). Resolves
// immediately and does nothing on the web, so the game is interactive first.
void initNative()
