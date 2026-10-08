import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { clearTokens } from '../utils/auth.js';

function Navbar() {
    const { cartItems, clearCart } = useCart();
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
        navigate('/login', { replace: true });
    };

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

            <div className='flex items-center gap-6 ml-auto'>
                <Link to='/cart' className='relative text-gray-800 hover:text-gray-600 font-medium'>
                    🛒 Cart
                    {cartCount > 0 && (
                        <span className='absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full px-2'>
                            {cartCount}
                        </span>
                    )}
                </Link>
                <button onClick={handleLogout} className='text-gray-800 hover:text-gray-600 font-medium'>
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;