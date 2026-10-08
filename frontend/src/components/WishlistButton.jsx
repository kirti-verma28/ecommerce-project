import { useWishlist } from "../context/WishlistContext";

function WishlistButton({ productId, className = "" }) {
    const { ids, toggleWishlist } = useWishlist();
    const active = ids.includes(productId);

    const handleClick = (e) => {
        // The card is wrapped in a link, so stop the click from opening the product page
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
            className={`leading-none ${active ? "text-red-500" : "text-gray-400 hover:text-red-400"} ${className}`}
        >
            {active ? "♥" : "♡"}
        </button>
    );
}

export default WishlistButton;