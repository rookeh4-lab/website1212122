import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ResourceDetail from './pages/ResourceDetail';
import UploadPage from './pages/Upload';
import AdminPage from './pages/Admin';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'transparent',
        color: 'var(--text)',
        position: 'relative',
      }}
    >
      <div className="bg-veil" />
      <ScrollToTop />
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/clients" element={<Browse defaultCategory="Clients" />} />
          <Route path="/sources" element={<Browse defaultCategory="Source Codes" />} />
          <Route path="/tools" element={<Browse defaultCategory="Tools" />} />
          <Route path="/macros" element={<Browse defaultCategory="Macros" />} />
          <Route path="/launchers" element={<Browse defaultCategory="Launchers" />} />
          <Route path="/resources" element={<Browse defaultCategory="All" />} />
          <Route path="/resource/:idOrSlug" element={<ResourceDetail />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
