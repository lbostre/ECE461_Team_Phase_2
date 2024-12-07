import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    Form,
} from "./ui/form";
import { Input } from "./ui/input";
import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { Switch } from "./ui/switch";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox from ShadCN's components
import { group } from "console";
import axios from "axios";
import { getAuthToken } from "@/utils/auth";

const formSchema = z
    .object({
        username: z.string().min(1, {
            message: "Username must be at least 1 character.",
        }),
        password: z.string().min(1, {
            message: "Password must be at least 1 character.",
        }),
        confirmPassword: z.string().min(1, {
            message: "Confirm Password must be at least 1 character.",
        }),
        isAdmin: z.boolean().default(false).optional(),
        permissions: z.array(z.string()).min(1, {
            message: "At least one permission must be selected.",
        }),
        group: z.string().min(1, {
            message: "Group must be at least 1 character.",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match.",
        path: ["confirmPassword"],
    });

export default function CreateUser() {
    const token = getAuthToken();
    const [userCreated, setUserCreated] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            confirmPassword: "",
            isAdmin: false,
            permissions: [],
            group: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // Ensure groups are parsed safely
            const newUser = {
                name: values.username,
                password: values.password,
                isAdmin: values.isAdmin,
                permissions: values.permissions, // Example permissions
                group: group, // Example group
            };

            console.log(
                "Form submitted with values: ",
                JSON.stringify(newUser)
            );

            const apiUrl = import.meta.env.VITE_API_URL;
            console.log("Token: ", token);

            if (!token) {
                console.error("Missing token for authorization");
                return;
            }

            const response = await axios.post(`${apiUrl}/users`, newUser, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Authorization": token,
                },
            });

            console.log("Response received: ", response);

            setUserCreated(true); // Indicate success
        } catch (error) {
            console.error("Error during form submission: ", error);
            setUserCreated(false); // Handle submission failure
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-1">Create a User</h1>
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
                                        placeholder="Enter a password"
                                        {...field}
                                    />
                                </FormControl>

                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Confirm Password Field */}
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="Confirm your password"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Is Admin Field */}
                    <FormField
                        control={form.control}
                        name="isAdmin"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3">
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Admin?</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {/* Permissions Section */}
                    <div className="w-full">
                        <FormLabel>Permissions</FormLabel>
                        <div className="flex flex-row gap-6 mt-2">
                            {["upload", "search", "download"].map((perm) => (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        key={perm}
                                        checked={
                                            form
                                                .watch("permissions")
                                                ?.includes(perm) || false
                                        }
                                        onCheckedChange={(checked) => {
                                            const currentPermissions =
                                                form.watch("permissions") || [];
                                            if (checked) {
                                                form.setValue("permissions", [
                                                    ...currentPermissions,
                                                    perm,
                                                ]);
                                            } else {
                                                form.setValue(
                                                    "permissions",
                                                    currentPermissions.filter(
                                                        (p) => p !== perm
                                                    )
                                                );
                                            }
                                        }}
                                    >
                                        {perm}
                                    </Checkbox>
                                    <label
                                        htmlFor="terms"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {perm}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <FormMessage />
                    </div>
                    <FormField
                        control={form.control}
                        name="group"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel>Group</FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        placeholder="Enter group"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter a user group.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Submit Button */}
                    <Button type="submit" className="w-full mt-3">
                        Create user
                    </Button>
                </form>
            </Form>
            {userCreated && (
                <div className="flex flex-col w-full items-center mt-3">
                    <div className="flex flex-row gap-2 items-center font-semibold text-green-500">
                        <FaCheckCircle />
                        <p>User created!</p>
                    </div>
                </div>
            )}
        </div>
    );
}
