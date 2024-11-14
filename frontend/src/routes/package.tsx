import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useParams } from "react-router-dom";

export default function Package() {
    let { name } = useParams();
    const formattedName =
        String(name).charAt(0).toUpperCase() + String(name).slice(1);
    return (
        <div className="flex flex-col items-center justify-center w-screen p-10">
            <div className="flex flex-col gap-4 w-[600px] h-fit">
                <div className="flex flex-row justify-between items-center">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-bold text-2xl">{formattedName}</h1>
                        <h5>Version 1.0.0</h5>
                    </div>
                    <Button className="w-fit">Download</Button>
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
                                    {/* <TableHead>Status</TableHead>
                                    <TableHead>Method</TableHead> */}
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
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Bus Factor Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Correctness
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Correctness Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Ramp Up
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Ramp Up Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Responsive Maintainer
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Responsive Maintainer Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        License Score
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        License Score Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Good Pinning Practice
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Good Pinning Practice Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Pull Request
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Pull Request Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Net Score
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        Net Score Latency
                                    </TableCell>
                                    <TableCell className="text-right">
                                        0
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
