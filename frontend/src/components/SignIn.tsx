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

const formSchema = z.object({
    username: z.string().email({
        message: "Invalid email address.",
    }),
    password: z.string().min(8, {
        message: "Password must be at least 8 characters.",
    }),
});

type SignInProps = {
    setIsOpen: (isOpen: boolean) => void;
};

export default function SignIn(props: SignInProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);
        // Perform sign-in logic here
        props.setIsOpen(false); // Close dialog on successful submit
    }

    return (
        <>
            <DialogHeader>
                <h1 className="text-2xl font-bold mb-1">Log in</h1>
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
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="Enter your email"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Your email address to log in.
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
                    {/* Submit Button */}
                    <Button type="submit" className="w-full">
                        Submit
                    </Button>
                </form>
            </Form>
        </>
    );
}
