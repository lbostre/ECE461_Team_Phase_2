import DeletePackageButton from "@/components/DeletePackageButton";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    URL: string;
    JSProgram: string;
    Content: string;
};

type PackageSchema = {
    metadata: PackageMetadata;
    data: PackageData;
};

// Type for the ratings object
export type Ratings = {
    License_Latency: number;
    Correctness_Latency: number;
    NetScore: number;
    License: number;
    ResponsiveMaintainer: number;
    BusFactor_Latency: number;
    RampUp: number;
    RampUp_Latency: number;
    NetScore_Latency: number;
    BusFactor: number;
    Correctness: number;
    ResponsiveMaintainer_Latency: number;
};

type CostData = Record<
    string,
    {
        standaloneCost?: number; // Optional since it might not exist
        totalCost: number; // Always required
    }
>;

export default function Package() {
    let { name } = useParams();
    const token = getAuthToken();
    const [packageData, setPackageData] = useState<PackageSchema>();
    const [ratingsData, setRatingsData] = useState<Ratings>();
    const [costData, seCostData] = useState<CostData>();
    const formattedName = packageData?.metadata?.Name
        ? packageData.metadata.Name.charAt(0).toUpperCase() +
          packageData.metadata.Name.slice(1).toLowerCase()
        : "";
    useEffect(() => {
        const fetchData = async () => {
            const packageResponse = await axios.get(
                `${import.meta.env.VITE_API_URL}/package/${name}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            setPackageData(packageResponse.data);
            const ratingsResponse = await axios.get(
                `${import.meta.env.VITE_API_URL}/package/${name}/rate`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            setRatingsData(ratingsResponse.data.PackageRating);
            const costResponse = await axios.get(
                `${import.meta.env.VITE_API_URL}/package/${name}/cost`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            seCostData(costResponse.data);
        };
        fetchData();
    }, [name]);
    const handleDownload = () => {
        if (packageData?.data.Content) {
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
                    <Button className="w-fit" onClick={handleDownload}>
                        Download
                    </Button>
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="font-bold text-lg">Cost</h1>
                    <div className="border rounded-md overflow-hidden">
                        {costData && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px]">
                                            ID
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Standalone Cost
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Total Cost
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(costData).map(
                                        ([id, costs]) => (
                                            <TableRow key={id}>
                                                <TableCell className="font-medium">
                                                    {id}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {costs.standaloneCost !==
                                                    undefined
                                                        ? costs.standaloneCost
                                                        : "N/A"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {costs.totalCost !==
                                                    undefined
                                                        ? costs.totalCost
                                                        : "N/A"}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="font-bold text-lg">Ratings</h1>
                    <div className="border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">
                                        Metric
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Rating
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Bus Factor
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.BusFactor?.toFixed(3) ||
                                            0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Bus Factor Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.BusFactor_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Correctness
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.Correctness?.toFixed(3) ||
                                            0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Correctness Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.Correctness_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Ramp Up
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.RampUp?.toFixed(3) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Ramp Up Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.RampUp_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Responsive Maintainer
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.ResponsiveMaintainer?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Responsive Maintainer Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.ResponsiveMaintainer_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        License Score
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.License?.toFixed(3) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        License Score Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.License_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Good Pinning Practice
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.NetScore?.toFixed(3) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Good Pinning Practice Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.NetScore_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Pull Request
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.BusFactor?.toFixed(3) ||
                                            0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Pull Request Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.NetScore_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Net Score
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.NetScore?.toFixed(3) || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Net Score Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ratingsData?.NetScore_Latency?.toFixed(
                                            3
                                        ) || 0}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className="flex flex-row gap-2">
                    <DeletePackageButton packageID={name || ""} />
                    <UpdatePackageButton packageID={name || ""} />
                </div>
            </div>
        </div>
    );
}
