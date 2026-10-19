import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { SiteProvider } from './SiteContext';
import { ZonesProvider } from './ZonesContext';
import { FavoritesProvider } from './FavoritesContext';
import { ToastProvider } from './components/ToastProvider';
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
import { Profile } from './pages/Profile';
import { LegalPage } from './pages/Legal';

/** Scroll ao topo em cada mudança de rota (a cabeçalho fixo somam-se 2 faixas). */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Dá tempo ao browser de trocar de página antes de reposicionar.
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <SiteProvider>
          <ZonesProvider>
            <CartProvider>
              <FavoritesProvider>
                <ToastProvider>
                  <ErrorBoundary>
                    {/* pt-28 accounts for the fixed header + persistent delivery banner (Feature 2) */}
                    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">                      <Navbar />
                        <main className="flex-grow pt-28">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/menu" element={<Menu />} />
                          <Route path="/carrinho" element={<Cart />} />
                          <Route path="/contacto" element={<Contact />} />
                          <Route path="/sobre" element={<About />} />
                          <Route path="/galeria" element={<Gallery />} />
                          <Route path="/perfil" element={<Profile />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/politica-privacidade" element={<LegalPage doc="privacidade" />} />
                          <Route path="/termos" element={<LegalPage doc="termos" />} />
                          <Route path="/politica-encomendas" element={<LegalPage doc="encomendas" />} />
                          <Route path="/admin" element={<Admin />} />
                        </Routes>
                      </main>
                      <Footer />
                    </div>
                  </ErrorBoundary>
                </ToastProvider>
              </FavoritesProvider>
            </CartProvider>
          </ZonesProvider>
        </SiteProvider>
      </AuthProvider>
    </Router>
  );
}
