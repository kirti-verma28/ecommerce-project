import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveTokens } from "../utils/auth";
import { useCart } from "../context/CartContext";
import AuthLayout from "../components/AuthLayout";
import { useWishlist } from "../context/WishlistContext";

function Login() {
  const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
  const [form, setForm] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { fetchCart } = useCart();
  const { fetchWishlist } = useWishlist();
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setIsError(false);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        saveTokens(data);
        await fetchCart();
        await fetchWishlist();
        nav("/", { replace: true });
      } else {
        setIsError(true);
        setMsg(data.detail || "Incorrect username or password");
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMsg("Could not connect to the server. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login"
      subtitle="Get access to your cart, orders and recommendations"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Username"
          required
          className="w-full border-b-2 border-gray-300 focus:border-blue-600 outline-none py-2"
        />
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          required
          className="w-full border-b-2 border-gray-300 focus:border-blue-600 outline-none py-2"
        />

        {msg && (
          <p className={`text-sm ${isError ? "text-red-600" : "text-green-700"}`}>{msg}</p>
        )}

        <button
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-sm disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        {loading && (
          <p className="text-xs text-gray-500 text-center">
            The server may take up to a minute to wake up on the first try.
          </p>
        )}
      </form>

      <p className="mt-8 text-center">
        <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
          New to KirtiCart? Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;