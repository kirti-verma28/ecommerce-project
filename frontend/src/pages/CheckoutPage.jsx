import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../utils/auth";
import { useCart } from "../context/CartContext";
import AddressForm from "../components/AddressForm";
import Loader from "../components/Loader";

const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

function CheckoutPage() {
  const nav = useNavigate();
  const { cartItems, total, clearCart } = useCart();
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);

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

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponMsg(null);
    try {
      const res = await authFetch(`${BASEURL}/api/coupons/apply/`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon({ code: data.code, discount: Number(data.discount) });
        setCouponMsg({ text: `Coupon ${data.code} applied. You save ${rupees(data.discount)}.`, isError: false });
      } else {
        setAppliedCoupon(null);
        setCouponMsg({ text: data.error || "Could not apply the coupon", isError: true });
      }
    } catch (err) {
      console.error(err);
      setCouponMsg({ text: "Could not apply the coupon", isError: true });
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMsg(null);
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
        body: JSON.stringify({
          address_id: selectedId,
          payment_method: "COD",
          coupon_code: appliedCoupon ? appliedCoupon.code : "",
        }),
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

  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const payable = total - discount;

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
                <span>{rupees(Number(item.product_price) * item.quantity)}</span>
              </li>
            ))}
          </ul>

          {/* Coupon */}
          <div className="border-t pt-3 mb-3">
            {appliedCoupon ? (
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700 font-medium">{appliedCoupon.code} applied</span>
                <button onClick={removeCoupon} className="text-red-600 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 min-w-0 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={applyCoupon}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 rounded text-sm"
                >
                  Apply
                </button>
              </div>
            )}
            {couponMsg && (
              <p className={`mt-2 text-xs ${couponMsg.isError ? "text-red-600" : "text-green-700"}`}>
                {couponMsg.text}
              </p>
            )}
          </div>

          <div className="border-t pt-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{rupees(total)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>-{rupees(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span>{rupees(payable)}</span>
            </div>
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