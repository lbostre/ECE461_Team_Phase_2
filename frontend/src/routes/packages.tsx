import { useLocation, Link } from "react-router-dom";

interface PackageInfo {
    Version: string;
    Name: string;
    ID: string;
}

export default function Packages() {
    const location = useLocation();
    const responseData: PackageInfo[] = location.state?.data ?? []; // Default to empty array if no data

    if (!responseData.length) {
        return (
            <div className="flex flex-col items-center justify-center w-screen p-10">
                <div className="flex flex-col gap-4 w-[600px] h-fit">
                    <h1 className="font-bold text-2xl">Packages</h1>
                    <p>No packages found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center w-screen p-10">
            <div className="flex flex-col gap-4 w-[600px] h-fit">
                <h1 className="font-bold text-2xl">Packages</h1>

                <div className="flex flex-col gap-4">
                    {responseData.map((pkg) => (
                        <Link
                            key={pkg.ID} // Correct key placement
                            to={`/package/${pkg.ID}`}
                            className="w-full"
                        >
                            <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow w-full">
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
