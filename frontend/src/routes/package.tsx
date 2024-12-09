import CostTable from "@/components/CostTable";
// import DeletePackageButton from "@/components/DeletePackageButton";
import MetricsTable from "@/components/MetricsTable";
import { Button } from "@/components/ui/button";
import { AiOutlineLoading } from "react-icons/ai";
import UpdatePackageButton from "@/components/UpdatePackageButton";
import { getAuthToken } from "@/utils/auth";
import { downloadFile } from "@/utils/downloadFile";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type PackageMetadata = {
    Name: string;
    Version: string;
    ID: string;
};

type PackageData = {
    URL?: string;
    JSProgram: string;
    Content: string;
};

type PackageSchema = {
    metadata: PackageMetadata;
    data: PackageData;
};

export type Ratings = {
    BusFactor: number;
    BusFactorLatency: number;
    Correctness: number;
    CorrectnessLatency: number;
    RampUp: number;
    RampUpLatency: number;
    ResponsiveMaintainer: number;
    ResponsiveMaintainerLatency: number;
    LicenseScore: number;
    LicenseScoreLatency: number;
    GoodPinningPractice: number;
    GoodPinningPracticeLatency: number;
    PullRequest: number;
    PullRequestLatency: number;
    NetScore: number;
    NetScoreLatency: number;
};

export type CostData = Record<
    string,
    {
        standaloneCost?: number;
        totalCost?: number;
    }
>;

export default function Package() {
    let { name } = useParams();
    const token = getAuthToken();
    const apiUrl = import.meta.env.VITE_API_URL;
    const [packageData, setPackageData] = useState<PackageSchema>();
    const [ratingsData, setRatingsData] = useState<Ratings>();
    const [costData, setCostData] = useState<CostData>();
    const [hasDownloadPerms, setHasDownloadPerms] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const formattedName = packageData?.metadata?.Name
        ? packageData.metadata.Name.charAt(0).toUpperCase() +
          packageData.metadata.Name.slice(1).toLowerCase()
        : "";

    useEffect(() => {
        const fetchData = async () => {
            const authenticate = async () => {
                try {
                    const response = await axios.get(`${apiUrl}/users`, {
                        headers: {
                            "x-Authorization": token,
                        },
                    });
                    console.log(
                        "Authenticated user permissions:",
                        response.data.User.permissions
                    );
                    setHasDownloadPerms(
                        response.data.User.permissions.includes("download")
                    );
                } catch (error) {
                    console.error("Authentication failed:", error);
                }
            };

            authenticate();
            setIsLoading(true);
            const packageResponse = await axios.get(
                `${apiUrl}/package/${name}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            setPackageData(packageResponse.data);

            const ratingsResponse = await axios.get(
                `${apiUrl}/package/${name}/rate`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            setRatingsData(ratingsResponse.data);

            const costResponse = await axios.get(
                `${apiUrl}/package/${name}/cost`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            setCostData(costResponse.data);
            setIsLoading(false);
        };
        fetchData();
    }, [name]);

    const handleDownload = () => {
        if (packageData?.data.Content) {
            console.log(JSON.stringify(packageData.data.Content));
            downloadFile(packageData.data.Content, packageData.metadata.Name);
        } else {
            console.error("Content is undefined");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-screen p-10">
            <div className="flex flex-col gap-4 w-[600px] h-fit">
                <div className="flex flex-row justify-between items-center mt-12">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-bold text-2xl">{formattedName}</h1>
                        <h5>Version {packageData?.metadata.Version}</h5>
                        <h5>id: {packageData?.metadata.ID}</h5>
                    </div>
                    {hasDownloadPerms && (
                        <Button className="w-fit" onClick={handleDownload}>
                            Download
                        </Button>
                    )}
                </div>
                {isLoading && (
                    <div className="flex flex-col items-center justify-center gap-3 w-full">
                        <AiOutlineLoading className="animate-spin" size={24} />
                        <p>Loading cost and metrics...</p>
                    </div>
                )}
                {costData && (
                    <div className="flex flex-col gap-2">
                        <h1 className="font-bold text-lg">Cost</h1>
                        <div className="border rounded-md overflow-hidden">
                            <CostTable costData={costData} />
                        </div>
                    </div>
                )}
                {ratingsData && (
                    <div className="flex flex-col gap-2">
                        <h1 className="font-bold text-lg">Ratings</h1>
                        <div className="border rounded-md overflow-hidden">
                            <MetricsTable ratingsData={ratingsData} />
                        </div>
                    </div>
                )}
                <div className="flex flex-row gap-2">
                    {/* <DeletePackageButton packageID={name || ""} /> */}
                    {packageData && (
                        <UpdatePackageButton
                            packageID={name || ""}
                            packageData={packageData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
