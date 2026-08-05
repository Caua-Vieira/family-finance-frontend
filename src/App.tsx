import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/Auth/AuthPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SessionExpiredListener } from "./components/SessionExpiredListener";
import { CategoriesPage } from "./pages/Categories/CategoiresPage";
import { CardsPage } from "./pages/Card/CardsPage";
import { TransactionsPage } from "./pages/Transactions/TransactionsPage";
import { BudgetPage } from "./pages/Budget/BudgetPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";

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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/transacoes" element={<TransactionsPage />} />
          <Route path="/cartoes" element={<CardsPage />} />
          <Route path="/orcamento" element={<BudgetPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;