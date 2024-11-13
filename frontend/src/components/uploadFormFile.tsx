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
});

export function UploadFormFile() {
    // ...
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            debloat: false,
        },
    });

    // 2. Define a submit handler.
    function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        console.log(values);
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col w-[600px] items-start gap-4"
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel className="text-left">Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Package name" {...field} />
                            </FormControl>
                            <FormDescription>
                                This is your package name.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="package"
                    render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel>Package Zip File</FormLabel>
                            <FormControl>
                                <Input
                                    type="file"
                                    onChange={(e) =>
                                        field.onChange(e.target.files?.[0])
                                    }
                                    accept=".zip"
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </FormControl>
                            <FormDescription>
                                This is your package zip file.
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
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    );
}
