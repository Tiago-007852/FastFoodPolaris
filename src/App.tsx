import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { SiteProvider } from './SiteContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages (to be implemented)
import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { Cart } from './pages/Cart';
import { Contact } from './pages/Contact';
import { About } from './pages/About';
import { Gallery } from './pages/Gallery';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SiteProvider>
          <CartProvider>
            <ErrorBoundary>
              <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
                <Navbar />
                <main className="flex-grow pt-20">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/carrinho" element={<Cart />} />
                    <Route path="/contacto" element={<Contact />} />
                    <Route path="/sobre" element={<About />} />
                    <Route path="/galeria" element={<Gallery />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/login" element={<Login />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </ErrorBoundary>
          </CartProvider>
        </SiteProvider>
      </AuthProvider>
    </Router>
  );
}
