import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161B28',
              color: '#E8ECF4',
              border: '1px solid #1E2535',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#0B0D12' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#0B0D12' } },
            duration: 3500,
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
