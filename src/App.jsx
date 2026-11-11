import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import AOS from 'aos';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Trial from './pages/Trial';
import Dashboard from './pages/Dashboard';
import Launcher from './pages/Launcher';
import Admin from './pages/Admin';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Download from './pages/Download';
import Affiliates from './pages/Affiliates';
import Status from './pages/Status';
import Stats from './pages/Stats';
import Changelog from './pages/Changelog';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';

function RouteTracker() {
  const { pathname, hash, search } = useLocation();

  useEffect(() => {
    if (hash && !hash.startsWith('#invite=') && !hash.startsWith('#token=')) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get('ref') || params.get('referral');
    if (ref && /^[A-Za-z0-9_-]{2,32}$/.test(ref.trim())) {
      localStorage.setItem('plutora_ref_code', ref.trim().toUpperCase());
    }
  }, [search]);

  return null;
}

export default function App() {
  useEffect(() => {
    AOS.init({
      once: true,
      duration: 600,
      easing: 'ease-out-cubic',
      offset: 40,
    });
  }, []);

  return (
    <BrowserRouter>
      <RouteTracker />
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 140px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login.html" element={<Login />} />
          <Route path="/trial" element={<Trial />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard.html" element={<Dashboard />} />
          <Route path="/launcher" element={<Launcher />} />
          <Route path="/launcher.html" element={<Launcher />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin.html" element={<Admin />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout.html" element={<Checkout />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/checkout-success.html" element={<CheckoutSuccess />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/success.html" element={<CheckoutSuccess />} />
          <Route path="/success" element={<CheckoutSuccess />} />
          <Route path="/success.html" element={<CheckoutSuccess />} />
          <Route path="/affiliates" element={<Affiliates />} />
          <Route path="/affiliates.html" element={<Affiliates />} />
          <Route path="/download" element={<Download />} />
          <Route path="/download.html" element={<Download />} />
          <Route path="/status" element={<Status />} />
          <Route path="/status.html" element={<Status />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/stats.html" element={<Stats />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/changelog.html" element={<Changelog />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms.html" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/privacy.html" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/refund.html" element={<Refund />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
