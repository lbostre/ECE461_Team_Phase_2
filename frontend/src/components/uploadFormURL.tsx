"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
    url: z
        .string()
        .url({ message: "Invalid URL" })
        .refine(
            (value) =>
                value.includes("github.com") || value.includes("npmjs.com"),
            {
                message: "URL must be a GitHub or npm URL",
            }
        ),
    jsProgram: z.string().min(10, {
        message: "JavaScript program must be at least 10 characters.",
    }),
});

export function UploadFormURL() {
    // ...
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: "",
            jsProgram: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(import.meta.env.VITE_API_URL + "/package");
        const response = await axios.post(
            // `${import.meta.env.VITE_API_URL}/package`,
            "https://lbuuau0feg.execute-api.us-east-1.amazonaws.com/dev/package",
            values,
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Authorization": "test",
                },
            }
        );
        console.log(response);
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col w-[600px] items-start gap-4"
            >
                <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel className="text-left">URL</FormLabel>
                            <FormControl>
                                <Input placeholder="Package URL" {...field} />
                            </FormControl>
                            <FormDescription>
                                This must be a Github or NPM URL.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="jsProgram"
                    render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel>JavaScript Program</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter JavaScript code"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                This is your JavaScript program.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    );
}
