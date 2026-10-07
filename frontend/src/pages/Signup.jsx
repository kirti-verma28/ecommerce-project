import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

function Signup() {
  const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setIsError(false);

    if (form.password !== form.password2) {
      setIsError(true);
      setMsg("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Account created! Redirecting to login...");
        setTimeout(() => nav("/login"), 1200);
      } else {
        setIsError(true);
        setMsg(Object.values(data).flat().join(" "));
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMsg("Could not connect to the server. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border-b-2 border-gray-300 focus:border-blue-600 outline-none py-2";

  return (
    <AuthLayout
      title="Sign Up"
      subtitle="Create your account and start shopping in seconds"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <input name="username" value={form.username} onChange={handleChange} placeholder="Username" required className={inputClass} />
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" className={inputClass} />
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required className={inputClass} />
        <input name="password2" type="password" value={form.password2} onChange={handleChange} placeholder="Confirm Password" required className={inputClass} />

        {msg && (
          <p className={`text-sm ${isError ? "text-red-600" : "text-green-700"}`}>{msg}</p>
        )}

        <button
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-sm disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-8 text-center">
        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
          Already have an account? Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;