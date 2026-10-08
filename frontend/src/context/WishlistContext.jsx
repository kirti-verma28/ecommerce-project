import { createContext, useContext, useEffect, useState } from "react";
import { authFetch, getAccessToken } from "../utils/auth";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [ids, setIds] = useState([]);

    const fetchWishlist = async () => {
        if (!getAccessToken()) {
            setIds([]);
            return;
        }
        try {
            const res = await authFetch(`${BASEURL}/api/wishlist/`);
            if (!res.ok) {
                setIds([]);
                return;
            }
            const data = await res.json();
            setIds(data.map((p) => p.id));
        } catch (err) {
            console.error("Error fetching wishlist:", err);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, []);

    const toggleWishlist = async (productId) => {
        try {
            const res = await authFetch(`${BASEURL}/api/wishlist/toggle/`, {
                method: "POST",
                body: JSON.stringify({ product_id: productId }),
            });
            if (!res.ok) return;
            const data = await res.json();
            setIds((prev) =>
                data.in_wishlist ? [...prev, productId] : prev.filter((x) => x !== productId)
            );
        } catch (err) {
            console.error("Error updating wishlist:", err);
        }
    };

    const clearWishlist = () => setIds([]);

    return (
        <WishlistContext.Provider value={{ ids, toggleWishlist, fetchWishlist, clearWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => useContext(WishlistContext);