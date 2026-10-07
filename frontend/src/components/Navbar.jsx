import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { clearTokens } from '../utils/auth.js';

function Navbar() {
    const { cartItems, clearCart } = useCart();
    const navigate = useNavigate();

    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    const handleLogout = () => {
        clearTokens();
        clearCart();
        navigate('/login', { replace: true });
    };

    return (
        <nav className='bg-white shadow-md px-6 py-6 flex justify-between items-center fixed w-full top-0 z-50'>
            <Link to='/' className='text-2xl font-bold text-gray-800'>
                🛍️ KirtiCart
            </Link>

            <div className='flex items-center gap-6'>
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