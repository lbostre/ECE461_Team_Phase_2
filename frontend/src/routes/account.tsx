import CreateUser from "@/components/CreateUser";
import DeleteUserAdmin from "@/components/DeleteUserAdmin";
import DeleteUserButton from "@/components/DeleteUserButton";
import ResetRegistryButton from "@/components/ResetRegistryButton";
import { getAuthToken } from "@/utils/auth";
import axios from "axios";
import { useEffect, useState } from "react";

export type User = {
    name: string;
    password: string;
    isAdmin: boolean;
    permissions: Array<"upload" | "search" | "download">; // Enum-like permissions
    group: string; // Group can be 'default' or other strings
};

export default function Account() {
    const [userInfo, setUserInfo] = useState<User>();
    const token = getAuthToken();
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const authenticate = async () => {
            try {
                const response = await axios.get(`${apiUrl}/users`, {
                    headers: {
                        "x-Authorization": token,
                    },
                });
                console.log("Authenticated user data:", response.data.User);
                setUserInfo(response.data.User);
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        };

        authenticate();
    }, [token]);

    return (
        <div className="flex flex-col items-center justify-center w-screen p-10">
            <div className="flex flex-col gap-4 w-[600px] h-fit mt-20">
                <div className="flex flex-col gap-4 border p-4 rounded-lg">
                    <div className="flex flex-row justify-between items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="font-bold text-2xl">Account Info</h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <p className="text-xl">
                            Username:{" "}
                            <span className="font-bold">{userInfo?.name}</span>
                        </p>
                        <p className="text-xl">
                            Admin?:{" "}
                            <span className="font-bold">
                                {JSON.stringify(userInfo?.isAdmin)}
                            </span>
                        </p>
                        <p className="text-xl">
                            Permissions:{" "}
                            <span className="font-bold">
                                {userInfo?.permissions?.join(", ")}
                            </span>
                        </p>
                        <p className="text-xl">
                            Group:{" "}
                            <span className="font-bold">
                                {userInfo?.group ?? "N/A"}
                            </span>
                        </p>
                    </div>
                </div>
                {userInfo?.isAdmin && (
                    <div className="flex flex-col border p-4 rounded-lg">
                        <CreateUser />
                    </div>
                )}
                {userInfo?.isAdmin && (
                    <div className="flex flex-col border p-4 rounded-lg">
                        <DeleteUserAdmin />
                    </div>
                )}
                {userInfo?.isAdmin && (
                    <div className="flex flex-col border p-4 rounded-lg">
                        <h1 className="text-2xl font-bold mb-1">
                            Reset registry
                        </h1>
                        <div className="flex flex-col gap-2">
                            <p>Reset the registry to a system default state.</p>
                            <ResetRegistryButton />
                        </div>
                    </div>
                )}
                {userInfo && <DeleteUserButton username={userInfo?.name} />}
            </div>
        </div>
    );
}
