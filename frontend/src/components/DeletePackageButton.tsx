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

type DeletePackageButton = {
    packageID: string;
};

export default function DeletePackageButton(props: DeletePackageButton) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const deletePackage = async () => {
        const token = getAuthToken();
        try {
            const response = await axios.delete(
                `${import.meta.env.VITE_API_URL}/users/${props.packageID}`,
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
                console.log("Package deleted successfully. Redirecting...");
                navigate("/"); // Redirect to /
            }
        } catch (error) {
            console.error("Error deleting package:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 rounded-md bg-red-500 text-white font-medium text-sm flex gap-2 items-center w-fit"
                >
                    Delete Package
                </button>
            </DialogTrigger>
            <DialogContent className="px-8 py-6">
                <DialogHeader>
                    <DialogTitle>
                        Are you sure you want to delete this package?
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-secondary">
                    packageID:{" "}
                    <span className="font-semibold">{props.packageID}</span>
                </p>
                <div className="flex flex-col items-end">
                    <button
                        onClick={() => deletePackage()}
                        className="px-4 py-2 rounded-md bg-red-500 text-white font-medium text-sm flex gap-2 items-center w-fit"
                    >
                        Delete
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
