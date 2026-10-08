import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { authFetch } from "../utils/auth";
import { imgUrl } from "../utils/imgUrl";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";

const STEPS = [
    { key: "PLACED", label: "Order placed" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "SHIPPED", label: "Shipped" },
    { key: "DELIVERED", label: "Delivered" },
];

function OrderDetailPage() {
    const { id } = useParams();
    const { state } = useLocation();
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        setLoading(true);
        authFetch(`${BASEURL}/api/orders/${id}/`)
            .then((res) => {
                if (!res.ok) throw new Error("Order not found");
                return res.json();
            })
            .then((data) => setOrder(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [BASEURL, id]);

    const cancelOrder = async () => {
        if (!window.confirm("Do you want to cancel this order?")) return;
        setCancelling(true);
        setMsg("");
        try {
            const res = await authFetch(`${BASEURL}/api/orders/${id}/cancel/`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setOrder(data);
            } else {
                setMsg(data.error || "Could not cancel the order");
            }
        } catch (err) {
            console.error(err);
            setMsg("Could not cancel the order");
        } finally {
            setCancelling(false);
        }
    };

    if (loading) return <Loader />;

    if (error) {
        return (
            <div className="pt-28 text-center">
                <p className="text-red-600 mb-3">{error}</p>
                <Link to="/orders" className="text-blue-600 hover:underline">Back to my orders</Link>
            </div>
        );
    }

    const currentIndex = STEPS.findIndex((s) => s.key === order.status);
    const cancelled = order.status === "CANCELLED";

    return (
        <div className="min-h-screen bg-gray-100 pt-24 pb-10">
            <div className="max-w-4xl mx-auto px-4 space-y-5">
                <Link to="/orders" className="text-blue-600 hover:underline">&larr; Back to my orders</Link>

                {state?.justPlaced && !cancelled && (
                    <div className="bg-green-100 text-green-800 rounded-lg p-4 font-medium">
                        Thank you! Your order has been placed successfully.
                    </div>
                )}

                <div className="bg-white rounded-lg shadow p-5">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                        <div>
                            <h1 className="text-xl font-bold">Order #{order.id}</h1>
                            <p className="text-sm text-gray-500">
                                Placed on {new Date(order.created_at).toLocaleString("en-IN")}
                            </p>
                        </div>
                        <StatusBadge status={order.status} label={order.status_display} />
                    </div>

                    {cancelled ? (
                        <p className="text-red-600 font-medium">This order was cancelled.</p>
                    ) : (
                        <ol className="flex items-start">
                            {STEPS.map((step, i) => {
                                const done = i <= currentIndex;
                                return (
                                    <li key={step.key} className="flex-1 flex flex-col items-center relative">
                                        {i > 0 && (
                                            <div
                                                className={`absolute top-3 right-1/2 w-full h-1 ${done ? "bg-green-500" : "bg-gray-200"
                                                    }`}
                                            />
                                        )}
                                        <div
                                            className={`z-10 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm ${done ? "bg-green-500" : "bg-gray-300"
                                                }`}
                                        >
                                            {done ? "✓" : ""}
                                        </div>
                                        <span className="mt-2 text-xs text-center">{step.label}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                    <h2 className="font-bold mb-3">Items</h2>
                    <ul className="divide-y">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-center gap-4 py-3">
                                <img
                                    src={imgUrl(item.product_image)}
                                    alt={item.product_name}
                                    className="w-16 h-16 object-cover rounded bg-gray-100"
                                />
                                <div className="flex-1">
                                    <Link to={`/product/${item.product}`} className="font-medium hover:underline">
                                        {item.product_name}
                                    </Link>
                                    <p className="text-sm text-gray-500">
                                        ₹{Number(item.price).toLocaleString("en-IN")} × {item.quantity}
                                    </p>
                                </div>
                                <p className="font-semibold">₹{Number(item.subtotal).toLocaleString("en-IN")}</p>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t pt-3 mt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h2 className="font-bold mb-1">Delivery address</h2>
                        {order.ship_name ? (
                            <>
                                <p>{order.ship_name} · {order.ship_phone}</p>
                                <p className="text-gray-700">
                                    {order.ship_address}, {order.ship_city}, {order.ship_state} - {order.ship_pincode}
                                </p>
                            </>
                        ) : (
                            <p className="text-gray-500">Not available for this order.</p>
                        )}
                    </div>
                    <div>
                        <h2 className="font-bold mb-1">Payment</h2>
                        <p>{order.payment_method === "COD" ? "Cash on Delivery" : order.payment_method}</p>
                    </div>
                </div>

                {order.can_cancel && (
                    <div>
                        <button
                            onClick={cancelOrder}
                            disabled={cancelling}
                            className="border border-red-500 text-red-600 hover:bg-red-50 px-5 py-2 rounded disabled:opacity-60"
                        >
                            {cancelling ? "Cancelling..." : "Cancel order"}
                        </button>
                        {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrderDetailPage;