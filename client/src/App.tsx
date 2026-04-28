import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateStore from "./pages/CreateStore";
import StoreView from "./pages/StoreView";
import BuyerStoreView from "./pages/BuyerStoreView";
import Cart from "./pages/Cart";
import SearchPage from "./pages/SearchPage";
import ProductDetail from "./pages/ProductDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Success from "./pages/success";
import Cancel from "./pages/cancel";
import InventoryDashboard from "./pages/InventoryDashboard";
import AdAnalytics from "./pages/AdAnalytics";
import CreateAd from "./pages/CreateAd";
import MarketerDashboard from "./pages/MarketersDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/marketer/analytics" element={<AdAnalytics />} />
        <Route path="/marketer/create-ad" element={<CreateAd />} />
        <Route path="/seller/create-store" element={<CreateStore />} />
        <Route path="/seller/stores/:storeId" element={<StoreView />} />
        <Route path="/buyer/stores/:storeId" element={<BuyerStoreView />} />
        <Route path="/buyer/cart" element={<Cart />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/inventory/:storeId" element={<InventoryDashboard />} />
        <Route path="/marketer/dashboard" element={<MarketerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
