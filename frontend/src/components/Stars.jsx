function Stars({ value, size = "text-lg" }) {
    const rounded = Math.round(value || 0);
    return (
        <span className={`${size} text-yellow-500`} aria-label={`${value || 0} out of 5`}>
            {"★".repeat(rounded)}
            <span className="text-gray-300">{"★".repeat(5 - rounded)}</span>
        </span>
    );
}

export default Stars;