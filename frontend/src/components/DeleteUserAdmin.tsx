import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    Form,
} from "./ui/form";
import { Input } from "./ui/input";
import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { MdError } from "react-icons/md";
import axios from "axios";
import { getAuthToken } from "@/utils/auth";

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Must provide a username.",
    }),
});

export default function DeleteUserAdmin() {
    const token = getAuthToken();
    const apiUrl = import.meta.env.VITE_API_URL;
    const [userDeleted, setUserDeleted] = useState(false);
    const [error, setError] = useState<string>();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(undefined);
        try {
            console.log("Token: ", token);

            if (!token) {
                setError("Authorization token is missing.");
                console.error("Missing token for authorization");
                return;
            }

            const response = await axios.delete(
                `${apiUrl}/users/${values.username}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );

            console.log("Response received: ", response);

            if (response.status === 200) {
                setUserDeleted(true); // Indicate success
                setError(undefined); // Clear any previous error
            } else {
                setError("Unexpected response from server.");
                setUserDeleted(false); // Handle unexpected success responses
            }
        } catch (error) {
            console.error("Error during form submission: ", error);

            // Error handling based on response status or generic errors
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;

                switch (status) {
                    case 400:
                        setError("Invalid user ID or user ID not provided.");
                        break;
                    case 401:
                        setError(
                            "Authentication failed. Invalid or missing token."
                        );
                        break;
                    case 403:
                        setError(
                            "You do not have permission to delete this account."
                        );
                        break;
                    case 404:
                        setError("User does not exist.");
                        break;
                    default:
                        setError(
                            "An unexpected error occurred. Please try again."
                        );
                }
            } else {
                setError(
                    "A network error occurred. Please check your connection."
                );
            }

            setUserDeleted(false); // Indicate failure
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-1">Delete a User</h1>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col w-full items-start gap-4"
                >
                    {/* Username Field */}
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        placeholder="Enter a username"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Submit Button */}
                    <Button type="submit" className="w-full mt-3">
                        Delete user
                    </Button>
                </form>
            </Form>
            {userDeleted && (
                <div className="flex flex-col w-full items-center mt-3">
                    <div className="flex flex-row gap-2 items-center font-semibold text-green-500">
                        <FaCheckCircle />
                        <p>User deleted!</p>
                    </div>
                </div>
            )}
            {error && (
                <div className="flex flex-col w-full items-center mt-3">
                    <div className="flex flex-row gap-2 items-center font-semibold text-red-500">
                        <MdError />
                        <p>{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
