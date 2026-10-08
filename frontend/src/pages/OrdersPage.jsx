import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/auth";
import { imgUrl } from "../utils/imgUrl";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";

function OrdersPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        authFetch(`${BASEURL}/api/orders/`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load your orders");
                return res.json();
            })
            .then((data) => setOrders(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [BASEURL]);

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-gray-100 pt-24 pb-10">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-2xl font-bold mb-4">My orders</h1>

                {error && <p className="text-red-600 mb-4">{error}</p>}

                {!error && orders.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600 mb-3">You have not placed any orders yet.</p>
                        <Link to="/" className="text-blue-600 hover:underline">Start shopping</Link>
                    </div>
                )}

                <div className="space-y-4">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            to={`/orders/${order.id}`}
                            className="block bg-white rounded-lg shadow p-4 hover:shadow-md"
                        >
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <div>
                                    <p className="font-semibold">Order #{order.id}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString("en-IN")}
                                    </p>
                                </div>
                                <StatusBadge status={order.status} label={order.status_display} />
                            </div>

                            <div className="flex gap-2 mb-3">
                                {order.items.slice(0, 4).map((item) => (
                                    <img
                                        key={item.id}
                                        src={imgUrl(item.product_image)}
                                        alt={item.product_name}
                                        className="w-14 h-14 object-cover rounded bg-gray-100"
                                    />
                                ))}
                                {order.items.length > 4 && (
                                    <span className="self-center text-sm text-gray-500">+{order.items.length - 4} more</span>
                                )}
                            </div>

                            <p className="text-sm text-gray-700">
                                {order.items.length} {order.items.length === 1 ? "item" : "items"} · Total{" "}
                                <span className="font-semibold">₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default OrdersPage;