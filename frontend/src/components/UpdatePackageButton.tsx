import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import axios from "axios";
import { getAuthToken } from "@/utils/auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

type PackageMetadata = {
    Name: string;
    Version: string; // Should follow semantic versioning format (e.g., "1.2.3")
    ID: string; // Unique identifier, likely a string
};

type PackageSchema = {
    metadata: PackageMetadata;
    data: {
        URL?: string;
        JSProgram: string;
        Content: string;
    };
};
type UpdatePackageProps = {
    packageID: string;
    packageData: PackageSchema;
};

const formSchema = z.object({
    metadata: z.object({
        Name: z.string().min(1, { message: "Metadata Name is required" }),
        Version: z.string().regex(/^\d+\.\d+\.\d+$/, {
            message: "Version must follow semantic versioning (e.g., 1.2.3)",
        }),
        ID: z.string().min(1, { message: "Metadata ID is required" }),
    }),
    data: z.object({
        Name: z.string().min(1, { message: "Data Name is required" }),
        Content: z.string().optional(), // Make it optional if not always required
        URL: z
            .string()
            .url({ message: "Invalid URL" })
            .refine(
                (value) =>
                    value.includes("github.com") || value.includes("npmjs.com"),
                {
                    message: "URL must be a GitHub or npm URL",
                }
            ),
        debloat: z.boolean().optional().default(false), // Optional with a default value
        JSProgram: z.string().min(10, {
            message: "JavaScript program must be at least 10 characters.",
        }),
    }),
});

export default function UpdatePackageButton({
    packageID,
    packageData,
}: UpdatePackageProps) {
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            metadata: {
                Name: packageData.metadata.Name,
                Version: packageData.metadata.Version,
                ID: packageData.metadata.ID,
            },
            data: {
                Name: packageData.metadata.Name,
                Content: packageData.data.Content || "",
                URL: packageData.data.URL || "",
                debloat: false,
                JSProgram: packageData.data.JSProgram || "",
            },
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const token = getAuthToken();
        console.log(token);
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/package/${packageID}`,
                values,
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
                console.log("Package updated successfully. Redirecting...");
                // navigate("/"); // Redirect to /
            }
        } catch (error) {
            console.error("Error updating package:", error);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 rounded-md bg-amber-700 text-white font-medium text-sm flex gap-2 items-center w-fit"
                >
                    Update Package
                </button>
            </DialogTrigger>
            <DialogContent className="px-8 py-6 min-w-[620px]">
                <DialogHeader>
                    <DialogTitle>Update Package</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex flex-col items-start gap-4"
                    >
                        {/* Metadata Fields */}
                        <FormField
                            control={form.control}
                            name="metadata.Name"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Metadata Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter metadata name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="metadata.Version"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Metadata Version</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter version (e.g., 1.0.0)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="metadata.ID"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Metadata ID</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter metadata ID"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Data Fields */}
                        <FormField
                            control={form.control}
                            name="data.Name"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Data Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter data name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="data.Content"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Content</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter content (optional)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="data.URL"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>URL</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Package URL (GitHub or NPM)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This must be a GitHub or NPM URL.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="data.debloat"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel>Debloat</FormLabel>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="data.JSProgram"
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

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="bg-amber-700 text-white font-medium text-sm"
                        >
                            Update
                        </Button>
                    </form>
                </Form>

                {/* <div className="flex flex-col items-end">
                    <button
                        onClick={() => console.log("update")}
                        className="px-4 py-2 rounded-md bg-yellow-500 text-white font-medium text-sm flex gap-2 items-center w-fit"
                    >
                        Update
                    </button>
                </div> */}
            </DialogContent>
        </Dialog>
    );
}
