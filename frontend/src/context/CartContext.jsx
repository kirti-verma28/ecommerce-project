import { createContext, useContext, useState, useEffect } from "react";
import { authFetch, getAccessToken } from "../utils/auth";
const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [cartItems, setCartItems] = useState([]);
    const [cartError, setCartError] = useState("");

    // Fetch cart from backend
    const fetchCart = async () => {
        if (!getAccessToken()) {
            setCartItems([]);
            return;
        }
        try {
            const res = await authFetch(`${BASEURL}/api/cart/`);
            if (!res.ok) {
                setCartItems([]);
                return;
            }
            const data = await res.json();
            setCartItems(data.items || []);
        } catch (error) {
            console.error("Error fetching cart:", error);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const readError = async (res, fallback) => {
        try {
            const data = await res.json();
            return data.error || data.detail || fallback;
        } catch {
            return fallback;
        }
    };

    // Add product to cart. Returns { ok, error }
    const addToCart = async (productID) => {
        try {
            const res = await authFetch(`${BASEURL}/api/cart/add/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productID }),
            });
            if (!res.ok) {
                return { ok: false, error: await readError(res, "Could not add to cart") };
            }
            await fetchCart();
            return { ok: true };
        } catch (error) {
            console.error("Error adding to cart:", error);
            return { ok: false, error: "Could not add to cart" };
        }
    };

    // Remove product from cart
    const removeFromCart = async (itemId) => {
        try {
            await authFetch(`${BASEURL}/api/cart/remove/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ item_id: itemId }),
            });
            await fetchCart();
        } catch (error) {
            console.error("Error removing from cart:", error);
        }
    };

    // Update quantity
    const updateQuantity = async (itemId, quantity) => {
        setCartError("");
        if (quantity < 1) {
            await removeFromCart(itemId);
            return;
        }
        try {
            const res = await authFetch(`${BASEURL}/api/cart/update/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ item_id: itemId, quantity }),
            });
            if (!res.ok) {
                setCartError(await readError(res, "Could not update quantity"));
            }
            await fetchCart();
        } catch (error) {
            console.error("Error updating quantity:", error);
        }
    };

    const clearCart = () => {
        setCartItems([]);
        setCartError("");
    };

    // Total price
    const total = cartItems.reduce(
        (acc, item) => acc + Number(item.product_price) * item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                total,
                cartError,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                fetchCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);