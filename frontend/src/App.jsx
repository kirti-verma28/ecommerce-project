import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import AccountPage from "./pages/AccountPage";
import WishlistPage from "./pages/WishlistPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PrivateRouter from "./components/PrivateRouter";
import PublicRoute from "./components/PublicRoute";
import MainLayout from "./components/MainLayout";

function App() {
    return (
        <Router>
            <Routes>
                {/* Before login: only Login and Signup, without the Navbar */}
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Route>

                {/* After login: all pages, with the Navbar */}
                <Route element={<PrivateRouter />}>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<ProductList />} />
                        <Route path="/product/:id" element={<ProductDetails />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/orders/:id" element={<OrderDetailPage />} />
                        <Route path="/account" element={<AccountPage />} />
                        <Route path="/wishlist" element={<WishlistPage />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;