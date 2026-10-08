import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { authFetch } from "../utils/auth";
import { imgUrl } from "../utils/imgUrl";
import Loader from "../components/Loader";
import ProductCard from "../components/ProductCard";
import Stars from "../components/Stars";

function ProductDetails() {
    const { id } = useParams();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [similar, setSimilar] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [activeImage, setActiveImage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartMsg, setCartMsg] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
    const [reviewMsg, setReviewMsg] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Load everything again whenever the product id changes
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setCartMsg(null);
        setReviewMsg(null);
        window.scrollTo({ top: 0 });

        Promise.all([
            fetch(`${BASEURL}/api/products/${id}/`).then((res) => {
                if (!res.ok) throw new Error("Failed to fetch product details");
                return res.json();
            }),
            fetch(`${BASEURL}/api/products/${id}/similar/`).then((res) => (res.ok ? res.json() : [])),
            fetch(`${BASEURL}/api/products/${id}/reviews/`).then((res) => (res.ok ? res.json() : [])),
        ])
            .then(([productData, similarData, reviewData]) => {
                if (cancelled) return;
                setProduct(productData);
                setActiveImage(productData.image || productData.images?.[0]?.image || "");
                setSimilar(similarData);
                setReviews(reviewData);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.message);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id, BASEURL]);

    if (loading) {
        return <Loader />;
    }
    if (error) {
        return <div className="pt-28 text-center text-red-600">Error: {error}</div>;
    }
    if (!product) {
        return <div className="pt-28 text-center">No product found</div>;
    }

    const gallery = [product.image, ...(product.images || []).map((i) => i.image)].filter(Boolean);
    const outOfStock = product.stock < 1;
    const lowStock = !outOfStock && product.stock <= 5;
    const hasDiscount = product.discount_percent > 0;

    const handleAddToCart = async () => {
        setCartMsg(null);
        const result = await addToCart(product.id);
        setCartMsg(
            result.ok
                ? { text: "Added to your cart", isError: false }
                : { text: result.error, isError: true }
        );
    };

    const submitReview = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setReviewMsg(null);
        try {
            const res = await authFetch(`${BASEURL}/api/products/${id}/reviews/`, {
                method: "POST",
                body: JSON.stringify(reviewForm),
            });
            const data = await res.json();
            if (!res.ok) {
                setReviewMsg({
                    text: Object.values(data).flat().join(" ") || "Could not save your review",
                    isError: true,
                });
                return;
            }
            // Reload reviews and the product, so the average rating updates
            const [reviewData, productData] = await Promise.all([
                fetch(`${BASEURL}/api/products/${id}/reviews/`).then((r) => r.json()),
                fetch(`${BASEURL}/api/products/${id}/`).then((r) => r.json()),
            ]);
            setReviews(reviewData);
            setProduct(productData);
            setReviewMsg({ text: "Thanks! Your review has been saved.", isError: false });
        } catch (err) {
            console.error(err);
            setReviewMsg({ text: "Could not save your review", isError: true });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-4">
                <Link to="/" className="text-blue-600 hover:underline">
                    &larr; Back to products
                </Link>

                <div className="bg-white shadow-lg rounded-2xl p-6 mt-4">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Image gallery */}
                        <div className="md:w-1/2">
                            {activeImage ? (
                                <img
                                    src={imgUrl(activeImage)}
                                    alt={product.name}
                                    className="w-full h-96 object-contain rounded-lg bg-gray-50"
                                />
                            ) : (
                                <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                    No image available
                                </div>
                            )}
                            {gallery.length > 1 && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                    {gallery.map((img) => (
                                        <img
                                            key={img}
                                            src={imgUrl(img)}
                                            alt=""
                                            onClick={() => setActiveImage(img)}
                                            className={`w-16 h-16 object-cover rounded cursor-pointer border-2 ${img === activeImage ? "border-blue-600" : "border-transparent"
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="md:w-1/2">
                            <p className="text-sm text-gray-500">{product.category?.name}</p>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>

                            <div className="flex items-center gap-2 mb-4">
                                {product.review_count > 0 ? (
                                    <>
                                        <span className="bg-green-600 text-white text-sm font-semibold px-2 py-0.5 rounded">
                                            {product.average_rating} ★
                                        </span>
                                        <span className="text-gray-500 text-sm">
                                            {product.review_count} {product.review_count === 1 ? "review" : "reviews"}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-gray-500 text-sm">No reviews yet</span>
                                )}
                            </div>

                            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                                <span className="text-3xl font-semibold text-gray-900">
                                    ₹{Number(product.price).toLocaleString("en-IN")}
                                </span>
                                {hasDiscount && (
                                    <>
                                        <span className="text-lg text-gray-500 line-through">
                                            ₹{Number(product.mrp).toLocaleString("en-IN")}
                                        </span>
                                        <span className="text-lg font-semibold text-green-600">
                                            {product.discount_percent}% off
                                        </span>
                                    </>
                                )}
                            </div>

                            {outOfStock ? (
                                <p className="text-red-600 font-semibold mb-4">Out of stock</p>
                            ) : lowStock ? (
                                <p className="text-orange-600 font-semibold mb-4">
                                    Hurry, only {product.stock} left!
                                </p>
                            ) : (
                                <p className="text-green-700 font-semibold mb-4">In stock</p>
                            )}

                            <p className="text-gray-600 mb-6 whitespace-pre-line">{product.description}</p>

                            <button
                                onClick={handleAddToCart}
                                disabled={outOfStock}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {outOfStock ? "Out of stock" : "Add to Cart 🛒"}
                            </button>
                            {cartMsg && (
                                <p className={`mt-3 text-sm ${cartMsg.isError ? "text-red-600" : "text-green-700"}`}>
                                    {cartMsg.text}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reviews */}
                <div className="bg-white shadow-lg rounded-2xl p-6 mt-6">
                    <h2 className="text-xl font-bold mb-4">Ratings and reviews</h2>

                    <form onSubmit={submitReview} className="mb-8 border-b pb-6">
                        <p className="font-semibold mb-1">Write a review</p>
                        <div className="flex gap-1 text-3xl mb-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    type="button"
                                    key={n}
                                    onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                                    className={n <= reviewForm.rating ? "text-yellow-500" : "text-gray-300"}
                                    aria-label={`${n} star`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            placeholder="Share your experience with this product (optional)"
                            rows={3}
                            className="w-full border border-gray-300 rounded p-2 mb-2"
                        />
                        <button
                            disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded disabled:opacity-60"
                        >
                            {submitting ? "Saving..." : "Submit review"}
                        </button>
                        {reviewMsg && (
                            <p className={`mt-2 text-sm ${reviewMsg.isError ? "text-red-600" : "text-green-700"}`}>
                                {reviewMsg.text}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            You can review a product once. Submitting again updates your review.
                        </p>
                    </form>

                    {reviews.length === 0 ? (
                        <p className="text-gray-500">No reviews yet. Be the first to review this product.</p>
                    ) : (
                        <ul className="space-y-5">
                            {reviews.map((r) => (
                                <li key={r.id} className="border-b pb-4 last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <Stars value={r.rating} />
                                        <span className="font-semibold">{r.username}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(r.created_at).toLocaleDateString("en-IN")}
                                        </span>
                                    </div>
                                    {r.comment && <p className="text-gray-700 mt-1">{r.comment}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Similar products */}
                {similar.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4">Similar products</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {similar.map((p) => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProductDetails;