import { UploadFormFile } from "@/components/uploadFormFile";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadFormURL } from "@/components/uploadFormURL";

export default function Upload() {
    return (
        <div className="w-screen h-screen flex flex-col items-center p-10">
            <h1 className="font-bold text-2xl mb-4">Upload</h1>
            <Tabs defaultValue="url" className="w-[640px]">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">via URL</TabsTrigger>
                    <TabsTrigger value="file">via File</TabsTrigger>
                </TabsList>
                <TabsContent value="url">
                    <Card>
                        <CardHeader>
                            <CardTitle>Via URL</CardTitle>
                            <CardDescription>
                                Upload your package by providing a URL.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <UploadFormURL />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="file">
                    <Card>
                        <CardHeader>
                            <CardTitle>Via File</CardTitle>
                            <CardDescription>
                                Upload your package by providing a zip file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <UploadFormFile />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
