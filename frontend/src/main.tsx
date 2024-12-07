import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root.tsx";
import Upload from "./routes/upload.tsx";
import Package from "./routes/package.tsx";
import Layout from "./components/Layout.tsx";
import Packages from "./routes/packages.tsx";
import Login from "./routes/login.tsx";
import Account from "./routes/account.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />, // Layout for most routes
        children: [
            {
                path: "/",
                element: <Root />,
            },
            {
                path: "/upload",
                element: <Upload />,
            },
            {
                path: "/package/:name",
                element: <Package />,
            },
            {
                path: "/packages",
                element: <Packages />,
            },
            {
                path: "/account",
                element: <Account />,
            },
        ],
    },
    {
        path: "/login",
        element: <Login />, // Login route without Layout
    },
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);
