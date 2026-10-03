import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/auth";
import { useCart } from "../context/CartContext";

function CheckoutPage() {
  const nav = useNavigate();
  const { clearCart } = useCart();
  const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    payment_method: "COD",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await authFetch(`${BASEURL}/api/orders/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Order placed successfully!");
        clearCart();
        setTimeout(() => {
          nav("/");
        }, 2000);
      } else {
        setIsError(true);
        setMessage(data.error || "Failed to place order. Please try again.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setIsError(true);
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 p-6">
      <div className="max-w-lg mx-auto bg-white p-6 shadow rounded">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="w-full p-2 border rounded-lg"
          />

          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder=" Full Address"
            required
            className="w-full p-2 border rounded-lg"
          />

          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            required
            className="w-full p-2 border rounded-lg"
          />

          <select
            name="payment_method"
            value={form.payment_method}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          >
            <option value="COD">Cash on Delivery</option>
            <option value="CreditCard">Online Payment</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            {loading ? "Processing..." : "Place Order"}
          </button>

          {message && (
            <p
              className={`text-center font-semibold mt-4 ${
                isError ? "text-red-600" : "text-green-700"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default CheckoutPage;