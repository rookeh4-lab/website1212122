import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Goodbye from './pages/Goodbye';

function AppShell() {
  return (
    <Routes>
      <Route path="*" element={<Goodbye />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
