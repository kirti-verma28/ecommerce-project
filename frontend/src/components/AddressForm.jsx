import { useState } from "react";
import { authFetch } from "../utils/auth";

const EMPTY = {
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
    is_default: false,
};

const inputClass = "w-full border border-gray-300 rounded px-3 py-2";

function AddressForm({ onSaved, onCancel }) {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            const res = await authFetch(`${BASEURL}/api/addresses/`, {
                method: "POST",
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(Object.values(data).flat().join(" ") || "Could not save the address");
                return;
            }
            setForm(EMPTY);
            onSaved(data);
        } catch (err) {
            console.error(err);
            setError("Could not save the address");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 border rounded p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Full name" required className={inputClass} />
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number (10 digits)" required inputMode="numeric" className={inputClass} />
            </div>
            <textarea name="address_line" value={form.address_line} onChange={handleChange} placeholder="House no., building, street, area" required rows={2} className={inputClass} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input name="city" value={form.city} onChange={handleChange} placeholder="City" required className={inputClass} />
                <input name="state" value={form.state} onChange={handleChange} placeholder="State" required className={inputClass} />
                <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode (6 digits)" required maxLength={6} inputMode="numeric" className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleChange} />
                Make this my default address
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
                <button disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded disabled:opacity-60">
                    {saving ? "Saving..." : "Save address"}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="px-5 py-2 rounded border">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

export default AddressForm;