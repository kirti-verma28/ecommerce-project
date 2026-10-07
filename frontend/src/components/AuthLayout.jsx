function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white shadow-lg rounded-md overflow-hidden flex flex-col md:flex-row">
                {/* Left panel */}
                <div className="md:w-2/5 bg-blue-600 text-white p-8 flex flex-col justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-4">{title}</h1>
                        <p className="text-blue-100 text-lg">{subtitle}</p>
                    </div>
                    <p className="text-2xl font-bold mt-8">🛍️ KirtiCart</p>
                </div>

                {/* Right panel: form */}
                <div className="md:w-3/5 p-8">{children}</div>
            </div>
        </div>
    );
}

export default AuthLayout;