import { Link } from "react-router-dom";
import { imgUrl } from "../utils/imgUrl";
import WishlistButton from "./WishlistButton";

function ProductCard({ product }) {
  const outOfStock = product.stock < 1;
  const hasDiscount = product.discount_percent > 0;

  return (
    <Link to={`/product/${product.id}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-transform p-4 cursor-pointer h-full">
        <div className="relative">
          <img

            src={imgUrl(product.image)}
            alt={product.name}
            className="w-full h-56 object-cover rounded-lg mb-4 bg-gray-100"
          />
          <WishlistButton
            productId={product.id}
            className="absolute top-2 right-2 bg-white rounded-full w-9 h-9 flex items-center justify-center shadow text-xl"
          />
          {outOfStock && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
              Out of stock
            </span>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-800 truncate">{product.name}</h2>

        {product.review_count > 0 && (
          <span className="inline-block bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded mt-1">
            {product.average_rating} ★ <span className="opacity-80">({product.review_count})</span>
          </span>
        )}

        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          <span className="font-semibold text-gray-900">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <>
              <span className="text-sm text-gray-500 line-through">
                ₹{Number(product.mrp).toLocaleString("en-IN")}
              </span>
              <span className="text-sm font-medium text-green-600">
                {product.discount_percent}% off
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;