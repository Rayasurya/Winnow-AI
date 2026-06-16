import './index.css'
import WinnowAI from './WinnowAI'
import DesignGallery from './DesignGallery'

export default function App() {
  if (window.location.hash === "#gallery") {
    return <DesignGallery />
  }
  return <WinnowAI />
}
