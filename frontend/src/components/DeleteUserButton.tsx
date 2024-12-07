import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import axios from "axios";
import { getAuthToken } from "@/utils/auth";
import { useNavigate } from "react-router-dom";

type DeleteButtonProps = {
    username: string;
};

export default function DeleteUserButton(props: DeleteButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const deleteUser = async () => {
        const token = getAuthToken();
        try {
            const response = await axios.delete(
                `${import.meta.env.VITE_API_URL}/users/${props.username}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );

            console.log("Response:", response);

            if (response.status === 200) {
                // Check for success status
                console.log("User deleted successfully. Redirecting...");
                navigate("/login"); // Redirect to /login
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 rounded-md bg-red-500 text-white font-medium text-sm flex gap-2 items-center w-fit"
                >
                    Delete Account
                </button>
            </DialogTrigger>
            <DialogContent className="px-8 py-6">
                <DialogHeader>
                    <DialogTitle>
                        Are you sure you want to delete your account?
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-secondary">
                    Username:{" "}
                    <span className="font-semibold">{props.username}</span>
                </p>
                <div className="flex flex-col items-end">
                    <button
                        onClick={() => deleteUser()}
                        className="px-4 py-2 rounded-md bg-red-500 text-white font-medium text-sm flex gap-2 items-center w-fit"
                    >
                        Delete
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
