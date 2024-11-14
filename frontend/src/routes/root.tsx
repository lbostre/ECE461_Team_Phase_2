import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

export default function Root() {
    const [packageName, setPackageName] = useState("");
    return (
        <div className="flex flex-col items-center justify-center w-screen h-screen">
            <div className="flex flex-col gap-4 items-center w-[600px] h-fit">
                <h1 className="font-bold text-2xl">Search Packages</h1>
                <div className="w-full flex flex-row gap-2">
                    <Input
                        className="text-black w-full"
                        placeholder="Search packages..."
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                    />
                    <Button className="w-fit">Search</Button>
                </div>
                <p>or</p>
                <Link to="/upload">
                    <Button className="w-fit">Upload</Button>
                </Link>
            </div>
        </div>
    );
}
