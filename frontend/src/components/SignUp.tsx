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
import { DialogHeader } from "./ui/dialog";

const formSchema = z
    .object({
        username: z.string().min(2, {
            message: "Username must be at least 2 characters.",
        }),
        password: z.string().min(8, {
            message: "Password must be at least 8 characters.",
        }),
        confirmPassword: z.string().min(8, {
            message: "Confirm Password must be at least 8 characters.",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match.",
        path: ["confirmPassword"],
    });

type SignUpProps = {
    setIsOpen: (isOpen: boolean) => void;
};

export default function SignUp(props: SignUpProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            confirmPassword: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);
        // Perform sign-up logic here
        props.setIsOpen(false); // Close dialog on successful submit
    }

    return (
        <>
            <DialogHeader>
                <h1 className="text-2xl font-bold mb-1">Create an account</h1>
                <p className="text-sm text-secondary">
                    Enter your email and password to log in to your account.
                </p>
            </DialogHeader>

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
                                    Choose a unique username.
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
                                    Your password must be at least 8 characters
                                    long.
                                </FormDescription>
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
                                <FormDescription>
                                    Please confirm your password.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {/* Submit Button */}
                    <Button type="submit" className="w-full">
                        Sign Up
                    </Button>
                </form>
            </Form>
        </>
    );
}
