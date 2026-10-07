import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PrivateRouter from "./components/PrivateRouter";
import PublicRoute from "./components/PublicRoute";
import MainLayout from "./components/MainLayout";

function App() {
    return (
        <Router>
            <Routes>
                {/* Login se pehle: sirf Login aur Signup, bina Navbar */}
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Route>

                {/* Login ke baad: Navbar ke saath baaki pages */}
                <Route element={<PrivateRouter />}>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<ProductList />} />
                        <Route path="/product/:id" element={<ProductDetails />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                    </Route>
                </Route>

                {/* Koi bhi galat address */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;