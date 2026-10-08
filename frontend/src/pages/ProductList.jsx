import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import Loader from "../components/Loader";

const SORT_OPTIONS = [
    { value: "-created_at", label: "Newest First" },
    { value: "price", label: "Price: Low to High" },
    { value: "-price", label: "Price: High to Low" },
    { value: "name", label: "Name: A to Z" },
];

const pillClass = (active) =>
    `px-4 py-1.5 rounded-full text-sm whitespace-nowrap border ${active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-gray-700 border-gray-300 hover:border-blue-600"
    }`;

function ProductList() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters live in the URL
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const ordering = searchParams.get("ordering") || "-created_at";
    const minPrice = searchParams.get("min_price") || "";
    const maxPrice = searchParams.get("max_price") || "";

    const [products, setProducts] = useState([]);
    const [count, setCount] = useState(0);
    const [categories, setCategories] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [priceForm, setPriceForm] = useState({ min: minPrice, max: maxPrice });

    useEffect(() => {
        setPriceForm({ min: minPrice, max: maxPrice });
    }, [minPrice, maxPrice]);

    const updateParam = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        setSearchParams(next);
    };

    const applyPrice = (e) => {
        e.preventDefault();
        const next = new URLSearchParams(searchParams);
        if (priceForm.min) next.set("min_price", priceForm.min);
        else next.delete("min_price");
        if (priceForm.max) next.set("max_price", priceForm.max);
        else next.delete("max_price");
        setSearchParams(next);
    };

    // Categories (once)
    useEffect(() => {
        fetch(`${BASEURL}/api/categories/`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
            .catch(() => setCategories([]));
    }, [BASEURL]);

    // Products (every time a filter changes)
    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (minPrice) params.set("min_price", minPrice);
        if (maxPrice) params.set("max_price", maxPrice);
        params.set("ordering", ordering);

        setLoading(true);
        setError(null);

        fetch(`${BASEURL}/api/products/?${params.toString()}`, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch products");
                }
                return response.json();
            })
            .then((data) => {
                setProducts(data.results || []);
                setCount(data.count || 0);
                setLoading(false);
                setInitialLoading(false);
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                setError(err.message);
                setLoading(false);
                setInitialLoading(false);
            });

        return () => controller.abort();
    }, [BASEURL, search, category, ordering, minPrice, maxPrice]);

    if (initialLoading) {
        return <Loader />;
    }

    if (error) {
        return <div className="pt-28 text-center text-red-600">Error: {error}</div>;
    }

    const hasFilters = search || category || minPrice || maxPrice;

    return (
        <div className="min-h-screen bg-gray-100 pt-24 pb-10">
            <div className="max-w-7xl mx-auto px-4">
                {/* Category buttons */}
                <div className="flex gap-2 overflow-x-auto pb-3">
                    <button onClick={() => updateParam("category", "")} className={pillClass(!category)}>
                        All
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => updateParam("category", c.slug)}
                            className={pillClass(category === c.slug)}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Sort and price filter */}
                <div className="bg-white rounded-md shadow-sm p-4 mb-4 flex flex-wrap items-end gap-6">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Sort by</label>
                        <select
                            value={ordering}
                            onChange={(e) => updateParam("ordering", e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2"
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <form onSubmit={applyPrice} className="flex items-end gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Min price</label>
                            <input
                                type="number"
                                min="0"
                                value={priceForm.min}
                                onChange={(e) => setPriceForm({ ...priceForm, min: e.target.value })}
                                className="w-28 border border-gray-300 rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Max price</label>
                            <input
                                type="number"
                                min="0"
                                value={priceForm.max}
                                onChange={(e) => setPriceForm({ ...priceForm, max: e.target.value })}
                                className="w-28 border border-gray-300 rounded px-3 py-2"
                            />
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                            Apply
                        </button>
                    </form>

                    {hasFilters && (
                        <button
                            onClick={() => setSearchParams({})}
                            className="text-blue-600 hover:underline ml-auto"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>

                <p className="text-gray-600 mb-4">
                    {search ? `Showing results for "${search}"` : "All products"} ({count})
                </p>

                {/* Product grid */}
                <div
                    className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${loading ? "opacity-50" : ""
                        }`}
                >
                    {products.length > 0 ? (
                        products.map((product) => <ProductCard key={product.id} product={product} />)
                    ) : (
                        <p className="col-span-full text-center text-gray-500 py-10">
                            No products found. Try a different search or clear the filters.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductList;