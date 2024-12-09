import { Button } from "@/components/ui/button";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import { useState } from "react";
import { MdError } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
    username: z.string().min(1, {
        message: "Username must be at least 1 character.",
    }),
    password: z.string().min(1, {
        message: "Password must be at least 1 character.",
    }),
    isAdmin: z.boolean().default(false).optional(),
});
export default function Login() {
    const [isValidLogin, setIsValidLogin] = useState(true);
    const navigate = useNavigate();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            isAdmin: false,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const requestBody = {
                User: {
                    name: values.username,
                    isAdmin: values.isAdmin,
                },
                Secret: {
                    password: values.password,
                },
            };
            const apiUrl = import.meta.env.VITE_API_URL;

            const response = await axios.put(
                `${apiUrl}/authenticate`,
                requestBody
            );

            // Assuming the token is in the response data
            const token = response.data;
            console.log(JSON.stringify(requestBody), token);
            if (token) {
                // Store the token securely (use secure storage in production if possible)
                localStorage.setItem("authToken", token);

                // Redirect to the homepage
                navigate("/");
            }

            // Ensure `isValidLogin` is set to true
            setIsValidLogin(true);
        } catch (error) {
            console.error("Login failed:", error);

            // Set `isValidLogin` to false when an error occurs
            setIsValidLogin(false);

            // Optionally log error details or show a user-friendly message
            if (axios.isAxiosError(error)) {
                console.error("Axios error details:", error.response?.data);
            } else {
                console.error("Unexpected error:", error);
            }
        }
    }

    return (
        <div className="flex flex-col items-center justify-center w-screen p-10">
            <div className="flex flex-col gap-4 w-[600px] h-fit mt-32">
                <h1 className="text-2xl font-bold mb-1">Log in</h1>
                <p className="text-sm text-secondary">
                    Enter your username and password to log in to your account.
                </p>

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
                                            placeholder="Enter your username"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Your username to log in.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Password Field */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Enter your password"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Your password must be at least 1
                                        character long.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isAdmin"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 ">
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Admin?</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            aria-label="Admin switch"
                                            aria-labelledby="isAdmin"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Submit Button */}
                        <Button type="submit" className="w-full">
                            Submit
                        </Button>
                    </form>
                </Form>
                {!isValidLogin && (
                    <div className="flex flex-col w-full items-center">
                        <div className="flex flex-row gap-2 items-center font-semibold text-red-500">
                            <MdError />
                            <p>Invalid login!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
