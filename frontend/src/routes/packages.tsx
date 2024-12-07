import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Package {
    Version: string;
    Name: string;
    ID: string;
}

export default function Packages() {
    const [packages, setPackages] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            const response = await axios.post(
                "https://lbuuau0feg.execute-api.us-east-1.amazonaws.com/dev/packages",
                [
                    {
                        Version: "Exact (5.0.0)",
                        Name: "express",
                    },
                ],
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization":
                            "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGVzdHVzZXIiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3MzM0MjM1NjgsImV4cCI6MTczMzQ1OTU2OH0.KB_7Ffo7r1JYVW6sYPVN-aVkhp5GJLdkIlUGLYIeV6c",
                    },
                }
            );
            setPackages(response.data);
        };
        fetchData();
    }, []);
    return (
        <div className="flex flex-col items-center justify-center w-screen p-10">
            <div className="flex flex-col gap-4 w-[600px] h-fit">
                <h1 className="font-bold text-2xl">Packages</h1>

                <div className="flex flex-row justify-between items-center">
                    {packages.map((pkg: Package) => (
                        <Link to={`/package/${pkg.ID}`} className="w-full">
                            <div
                                key={pkg.ID}
                                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow w-full"
                            >
                                <div className="flex flex-row justify-between items-center">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="font-bold text-xl">
                                            {pkg.Name}
                                        </h2>
                                        <div className="flex items-center">
                                            id:
                                            <span className="font-medium">
                                                &nbsp;{pkg.ID}
                                            </span>
                                        </div>
                                    </div>
                                    <p>Version: {pkg.Version}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
