import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { clearTokens } from '../utils/auth.js';

function Navbar() {
    const { cartItems, clearCart } = useCart();
    const { ids, clearWishlist } = useWishlist();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('search') || '');

    // Keep the box in sync with the URL (back button, clear filters, etc.)
    useEffect(() => {
        setQuery(searchParams.get('search') || '');
    }, [searchParams]);

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    const handleSearch = (e) => {
        e.preventDefault();
        const q = query.trim();
        navigate(q ? `/?search=${encodeURIComponent(q)}` : '/');
    };

    const handleLogout = () => {
        clearTokens();
        clearCart();
        clearWishlist();
        navigate('/login', { replace: true });
    };

    const linkClass = 'text-gray-800 hover:text-gray-600 font-medium text-sm whitespace-nowrap';

    return (
        <nav className='bg-white shadow-md px-6 py-4 flex items-center gap-6 fixed w-full top-0 z-50'>
            <Link to='/' className='text-2xl font-bold text-gray-800 whitespace-nowrap'>
                🛍️ KirtiCart
            </Link>

            <form onSubmit={handleSearch} className='flex flex-1 max-w-xl'>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Search for products'
                    className='w-full border border-gray-300 rounded-l-md px-4 py-2 outline-none focus:border-blue-600'
                />
                <button className='bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-r-md'>
                    Search
                </button>
            </form>

            <div className='flex items-center gap-5 ml-auto'>
                <Link to='/orders' className={linkClass}>Orders</Link>
                <Link to='/wishlist' className={`relative ${linkClass}`}>
                    ♥ Wishlist
                    {ids.length > 0 && (
                        <span className='absolute -top-2 -right-4 bg-red-500 text-white text-xs font-bold rounded-full px-2'>
                            {ids.length}
                        </span>
                    )}
                </Link>
                <Link to='/account' className={linkClass}>Account</Link>
                <Link to='/cart' className={`relative ${linkClass}`}>
                    🛒 Cart
                    {cartCount > 0 && (
                        <span className='absolute -top-2 -right-4 bg-red-500 text-white text-xs font-bold rounded-full px-2'>
                            {cartCount}
                        </span>
                    )}
                </Link>
                <button onClick={handleLogout} className={linkClass}>
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;