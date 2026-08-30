import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Clarity from '@microsoft/clarity';
import App from './App.jsx';
import './styles/shared.css';
import './styles/app.css';

if (typeof window !== 'undefined') {
  try {
    Clarity.init('y07yl1sf0l');
  } catch (err) {
    console.warn('Clarity init warning:', err);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
