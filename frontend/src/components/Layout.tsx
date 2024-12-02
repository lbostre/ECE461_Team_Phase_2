// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

const Layout = () => {
    return (
        <div>
            <NavBar />
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
