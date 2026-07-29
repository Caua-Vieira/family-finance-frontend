import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/Auth/AuthPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SessionExpiredListener } from "./components/SessionExpiredListener";
import { CategoriesPage } from "./pages/Categories/CategoiresPage";

function App() {
  return (
    <BrowserRouter>
      <SessionExpiredListener />
      <Routes>
        <Route path="/login" element={<AuthPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<div>Painel</div>} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/transacoes" element={<div>Lançamentos</div>} />
          <Route path="/cartoes" element={<div>Cartões</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;