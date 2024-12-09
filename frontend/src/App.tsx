import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

function App() {
    const [packageName, setPackageName] = useState("");
    return (
        <div className="flex flex-col w-full items-center bg-red-200">
            <div className="flex flex-col gap-4 items-center w-[600px]">
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
                <Button className="w-fit">Upload</Button>
            </div>
        </div>
    );
}

export default App;
