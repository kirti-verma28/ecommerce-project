import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../utils/auth";
import { useCart } from "../context/CartContext";
import AddressForm from "../components/AddressForm";
import Loader from "../components/Loader";

function CheckoutPage() {
  const nav = useNavigate();
  const { cartItems, total, clearCart } = useCart();
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch(`${BASEURL}/api/addresses/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setAddresses(data);
        const preferred = data.find((a) => a.is_default) || data[0];
        setSelectedId(preferred ? preferred.id : null);
        setShowForm(data.length === 0);
        setLoadingAddresses(false);
      })
      .catch(() => setLoadingAddresses(false));
  }, [BASEURL]);

  const handleSaved = (address) => {
    setAddresses((prev) => [
      address,
      ...prev.map((a) => (address.is_default ? { ...a, is_default: false } : a)),
    ]);
    setSelectedId(address.id);
    setShowForm(false);
    setError("");
  };

  const placeOrder = async () => {
    if (!selectedId) {
      setError("Please select a delivery address");
      return;
    }
    setPlacing(true);
    setError("");
    try {
      const res = await authFetch(`${BASEURL}/api/orders/create/`, {
        method: "POST",
        body: JSON.stringify({ address_id: selectedId, payment_method: "COD" }),
      });
      const data = await res.json();
      if (res.ok) {
        clearCart();
        nav(`/orders/${data.order_id}`, { state: { justPlaced: true } });
      } else {
        setError(data.error || "Failed to place the order. Please try again.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (loadingAddresses) {
    return <Loader />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="pt-28 text-center">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link to="/" className="text-blue-600 hover:underline">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-10">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Delivery address */}
          <div className="bg-white shadow rounded-lg p-5">
            <h2 className="text-lg font-bold mb-3">1. Delivery address</h2>

            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex gap-3 border rounded p-3 mb-3 cursor-pointer ${selectedId === a.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedId === a.id}
                  onChange={() => setSelectedId(a.id)}
                />
                <div className="text-sm">
                  <p className="font-semibold">
                    {a.full_name} <span className="font-normal text-gray-600">{a.phone}</span>
                    {a.is_default && (
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">Default</span>
                    )}
                  </p>
                  <p className="text-gray-700">
                    {a.address_line}, {a.city}, {a.state} - {a.pincode}
                  </p>
                </div>
              </label>
            ))}

            {showForm ? (
              <AddressForm
                onSaved={handleSaved}
                onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
              />
            ) : (
              <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">
                + Add a new address
              </button>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white shadow rounded-lg p-5">
            <h2 className="text-lg font-bold mb-3">2. Payment method</h2>
            <label className="flex items-center gap-3 mb-2">
              <input type="radio" checked readOnly />
              <span>Cash on Delivery</span>
            </label>
            <label className="flex items-center gap-3 text-gray-400">
              <input type="radio" disabled />
              <span>Online payment (coming soon)</span>
            </label>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white shadow rounded-lg p-5 h-fit">
          <h2 className="text-lg font-bold mb-3">Order summary</h2>
          <ul className="text-sm space-y-2 mb-4">
            {cartItems.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="truncate">{item.product_name} × {item.quantity}</span>
                <span>₹{(Number(item.product_price) * item.quantity).toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
          <div className="border-t pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={placeOrder}
            disabled={placing}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded disabled:opacity-60"
          >
            {placing ? "Placing order..." : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;