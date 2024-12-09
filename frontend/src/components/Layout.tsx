import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { getAuthToken } from "@/utils/auth";
import axios from "axios";

const Layout = () => {
    const token = getAuthToken();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate("/login"); // Redirect to login if token doesn't exist
            return;
        }

        const authenticate = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const response = await axios.get(`${apiUrl}/users`, {
                    headers: {
                        "x-Authorization": token,
                    },
                });
                console.log("Authenticated user data:", response.data);
            } catch (error) {
                console.error("Authentication failed:", error);
                navigate("/login"); // Redirect to login if the response is invalid
            }
        };

        authenticate();
    }, [token, navigate]);

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
