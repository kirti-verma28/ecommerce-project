import { useEffect, useState } from "react";
import { authFetch } from "../utils/auth";
import AddressForm from "../components/AddressForm";
import Loader from "../components/Loader";

function AccountPage() {
    const BASEURL = import.meta.env.VITE_DJANGO_BASE_URL;
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");

    const loadAddresses = async () => {
        try {
            const res = await authFetch(`${BASEURL}/api/addresses/`);
            if (!res.ok) throw new Error("Failed to load your addresses");
            setAddresses(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAddresses();
    }, []);

    const setDefault = async (id) => {
        await authFetch(`${BASEURL}/api/addresses/${id}/`, {
            method: "PATCH",
            body: JSON.stringify({ is_default: true }),
        });
        loadAddresses();
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this address?")) return;
        await authFetch(`${BASEURL}/api/addresses/${id}/`, { method: "DELETE" });
        loadAddresses();
    };

    const handleSaved = () => {
        setShowForm(false);
        loadAddresses();
    };

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-gray-100 pt-24 pb-10">
            <div className="max-w-3xl mx-auto px-4">
                <h1 className="text-2xl font-bold mb-4">My account</h1>

                <div className="bg-white rounded-lg shadow p-5">
                    <h2 className="text-lg font-bold mb-3">Saved addresses</h2>
                    {error && <p className="text-red-600 mb-3">{error}</p>}

                    {addresses.length === 0 && !showForm && (
                        <p className="text-gray-500 mb-3">You have not saved any address yet.</p>
                    )}

                    <div className="space-y-3 mb-4">
                        {addresses.map((a) => (
                            <div key={a.id} className="border rounded p-3 text-sm">
                                <p className="font-semibold">
                                    {a.full_name} <span className="font-normal text-gray-600">{a.phone}</span>
                                    {a.is_default && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Default</span>
                                    )}
                                </p>
                                <p className="text-gray-700 mb-2">
                                    {a.address_line}, {a.city}, {a.state} - {a.pincode}
                                </p>
                                <div className="flex gap-4">
                                    {!a.is_default && (
                                        <button onClick={() => setDefault(a.id)} className="text-blue-600 hover:underline">
                                            Set as default
                                        </button>
                                    )}
                                    <button onClick={() => remove(a.id)} className="text-red-600 hover:underline">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showForm ? (
                        <AddressForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
                    ) : (
                        <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">
                            + Add a new address
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AccountPage;