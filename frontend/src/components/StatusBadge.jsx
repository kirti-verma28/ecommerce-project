const STYLES = {
    PLACED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    SHIPPED: "bg-orange-100 text-orange-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
};

function StatusBadge({ status, label }) {
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STYLES[status] || "bg-gray-100 text-gray-700"}`}>
            {label || status}
        </span>
    );
}

export default StatusBadge;