"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Checkbox } from "./ui/checkbox";
import { useState } from "react";
import { MdError } from "react-icons/md";
import { getAuthToken } from "@/utils/auth";
import axios from "axios";
import { FaCheckCircle } from "react-icons/fa";

type PackageFileRequest = {
    Content: string;
    JSProgram: string;
    debloat: boolean;
    Name: string;
    Secret: boolean;
};

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    package: z.instanceof(File).refine((file) => file?.name.endsWith(".zip"), {
        message: "File must be a .zip file.",
    }),
    jsProgram: z.string().min(10, {
        message: "JavaScript program must be at least 10 characters.",
    }),
    debloat: z.boolean().default(false).optional(),
    secret: z.boolean().default(false).optional(),
});

export function UploadFormFile() {
    const [base64Data, setBase64Data] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | undefined>(
        undefined
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            debloat: false,
            secret: false,
        },
    });

    const handleFileChange = async (
        file: File | null
    ): Promise<string | null> => {
        if (!file) return null;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => {
                const result = reader.result as string; // The Base64 string
                resolve(result);
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(file);
        });
    };

    function cleanBase64String(base64String: string): string {
        return base64String.replace(/^data:application\/zip;base64,/, "");
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true); // Start loading
        setUploadError(undefined); // Clear previous errors

        try {
            const token = getAuthToken();
            const cleanedContent = base64Data
                ? cleanBase64String(base64Data)
                : "";
            const requestBody: PackageFileRequest = {
                Content: cleanedContent || "",
                JSProgram: values.jsProgram,
                debloat: values.debloat ?? false,
                Name: values.name,
                Secret: values.secret ?? false,
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
                    {/* Name Field */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel className="text-left">
                                    Name
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Package name"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    This is your package name.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* File Input */}
                    <FormField
                        control={form.control}
                        name="package"
                        render={() => (
                            <FormItem className="w-full">
                                <FormLabel>Package Zip File</FormLabel>
                                <FormControl>
                                    <Input
                                        type="file"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                form.setValue("package", file); // Update form state
                                                const base64 =
                                                    await handleFileChange(
                                                        file
                                                    );
                                                setBase64Data(base64 || "");
                                            }
                                        }}
                                        accept=".zip"
                                        className="cursor-pointer"
                                    />
                                </FormControl>
                                <FormDescription>
                                    This is your package zip file.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* JS Program Input */}
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

                    <FormField
                        control={form.control}
                        name="debloat"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 w-full">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Debloat</FormLabel>
                                    <FormDescription>
                                        Debloating removes unnecessary files to
                                        improve performance.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="secret"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 w-full">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Secret</FormLabel>
                                    <FormDescription>
                                        Make this package secret.
                                    </FormDescription>
                                </div>
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
