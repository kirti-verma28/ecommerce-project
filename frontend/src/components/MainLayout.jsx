import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

// Login ke baad ke pages: Navbar + page
export default function MainLayout() {
    return (
        <>
            <Navbar />
            <Outlet />
        </>
    );
}