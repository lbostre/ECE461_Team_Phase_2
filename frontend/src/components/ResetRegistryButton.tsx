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
import { Button } from "./ui/button";

export default function ResetRegistryButton() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const token = getAuthToken();

    const hanldleResetRegistry = async () => {
        const apiUrl = import.meta.env.VITE_API_URL;
        try {
            const response = await axios.delete(`${apiUrl}/reset`, {
                headers: {
                    "x-Authorization": token,
                },
            });
            if (response.status === 200) {
                // Check for success status
                console.log("Registry reset successfully. Redirecting...");
                navigate("/"); // Redirect to /login
            }
        } catch (error) {
            console.error("Error resetting register:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 rounded-md bg-red-500 text-white font-medium text-sm flex gap-2 items-center "
                >
                    Reset
                </Button>
            </DialogTrigger>
            <DialogContent className="px-8 py-6">
                <DialogHeader>
                    <DialogTitle>Reset Registry</DialogTitle>
                </DialogHeader>
                <p>
                    Are you sure you want to reset the registry to system
                    default state?
                </p>
                <div className="flex flex-col items-end">
                    <Button
                        onClick={() => hanldleResetRegistry()}
                        className="px-4 py-2 rounded-md bg-red-500 text-white font-medium text-sm flex gap-2 items-center w-fit"
                    >
                        Reset
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
