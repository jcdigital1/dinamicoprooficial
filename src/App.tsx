import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './firebase/authContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GenerateBatch } from './pages/GenerateBatch';
import { MyBatches } from './pages/MyBatches';
import { BatchDetail } from './pages/BatchDetail';
import { PlateEditor } from './pages/PlateEditor';
import { ModelsCatalog } from './pages/ModelsCatalog';
import { QrCalibrator } from './pages/QrCalibrator';
import { Settings } from './pages/Settings';
import { SystemTests } from './pages/SystemTests';
import { PublicRedirect } from './pages/PublicRedirect';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Dynamic QR Code Scanning & NFC Tap Route */}
            <Route path="/q/:slug" element={<PublicRedirect />} />

            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Commercial System Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="gerar-lote" element={<GenerateBatch />} />
              <Route path="meus-lotes" element={<MyBatches />} />
              <Route path="lotes/:batchId" element={<BatchDetail />} />
              <Route path="placas/:id/editar" element={<PlateEditor />} />
              <Route path="modelos" element={<ModelsCatalog />} />
              <Route path="calibrar/:modelId" element={<QrCalibrator />} />
              <Route path="configuracoes" element={<Settings />} />
              <Route path="testes" element={<SystemTests />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
