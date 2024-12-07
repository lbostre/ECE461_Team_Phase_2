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
import { getAuthToken } from "@/utils/auth";
import { useState } from "react";
import { MdError } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";

type PackageURLRequest = {
    JSProgram: string;
    URL: string;
};

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
    const [uploadError, setUploadError] = useState<string | undefined>(
        undefined
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            url: "",
            jsProgram: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true); // Start loading
        setUploadError(undefined); // Clear previous errors

        try {
            const token = getAuthToken();
            const requestBody: PackageURLRequest = {
                JSProgram: values.jsProgram,
                URL: values.url,
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/package`,
                requestBody,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );

            if (response.status === 201) {
                console.log("Request successful:", response);
                setUploadSuccess(true);
            } else {
                // Handle unexpected statuses (e.g., 400, 404, etc.)
                setUploadError(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                // Check if a response exists and has a status code
                if (error.response) {
                    // Handle specific status codes
                    if (error.response.status === 409) {
                        setUploadError(
                            "Error: The package already exists or has conflicting data."
                        );
                    } else {
                        setUploadError(
                            `Error: ${
                                error.response.data?.message ||
                                "Unexpected error occurred."
                            }`
                        );
                    }
                } else {
                    // Handle errors without a response (e.g., network issues)
                    setUploadError(
                        "Network error: Unable to connect to the server."
                    );
                }
            } else {
                // Handle non-Axios errors
                setUploadError("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false); // End loading
        }
    }

    return (
        <div>
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
                                    <Input
                                        placeholder="Package URL"
                                        {...field}
                                    />
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
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Submitting..." : "Submit"}
                    </Button>
                </form>
            </Form>
            {uploadError && (
                <div className="flex flex-col w-full items-center mt-3">
                    <div className="flex flex-row gap-2 items-center font-semibold text-red-500">
                        <MdError />
                        {uploadError && (
                            <p className="text-red-500">{uploadError}</p>
                        )}
                    </div>
                </div>
            )}
            {uploadSuccess && (
                <div className="flex flex-col w-full items-center mt-3">
                    <div className="flex flex-row gap-2 items-center font-semibold text-green-500">
                        <FaCheckCircle />
                        <p>Package uploaded!</p>
                    </div>
                </div>
            )}
        </div>
    );
}
