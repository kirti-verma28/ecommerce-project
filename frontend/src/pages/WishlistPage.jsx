import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/auth";
import { useWishlist } from "../context/WishlistContext";
import ProductCard from "../components/ProductCard";
import Loader from "../components/Loader";

function WishlistPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const { ids } = useWishlist();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        authFetch(`${BASEURL}/api/wishlist/`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load your wishlist");
                return res.json();
            })
            .then((data) => setProducts(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [BASEURL]);

    if (loading) return <Loader />;

    // Hide a product right away when the heart is un-clicked
    const visible = products.filter((p) => ids.includes(p.id));

    return (
        <div className="min-h-screen bg-gray-100 pt-24 pb-10">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-2xl font-bold mb-4">My wishlist ({visible.length})</h1>

                {error && <p className="text-red-600 mb-4">{error}</p>}

                {!error && visible.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600 mb-3">Your wishlist is empty. Tap the heart on a product to save it here.</p>
                        <Link to="/" className="text-blue-600 hover:underline">Browse products</Link>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {visible.map((p) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default WishlistPage;