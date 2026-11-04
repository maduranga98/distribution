import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { BusinessProvider, useBusiness } from "./context/BusinessContext";
import { DataProvider } from "./context/DataContext";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import FirstBusiness from "./pages/FirstBusiness";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Stock from "./pages/Stock";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import Accounting from "./pages/Accounting";
import RoutesPage from "./pages/Routes";

function Shell() {
  const { current, loading } = useBusiness();
  if (loading) return <Spinner />;
  if (!current) return <FirstBusiness />;
  return (
    <DataProvider key={current.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sales" element={<Sales />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="stock" element={<Stock />} />
          <Route path="customers" element={<Customers />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <BusinessProvider><Shell /></BusinessProvider>
    </BrowserRouter>
  </StrictMode>
);
