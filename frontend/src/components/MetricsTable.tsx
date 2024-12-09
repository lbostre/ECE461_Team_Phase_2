import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Ratings } from "@/routes/package";

interface RatingsTableProps {
    ratingsData: Ratings;
}

const MetricsTable: React.FC<RatingsTableProps> = ({ ratingsData }) => {
    // Helper function to map metrics for the table rows
    const metrics = [
        { label: "Bus Factor", key: "BusFactor" },
        { label: "Correctness", key: "Correctness" },
        { label: "Ramp Up", key: "RampUp" },
        { label: "Responsive Maintainer", key: "ResponsiveMaintainer" },
        { label: "License Score", key: "LicenseScore" },
        { label: "Good Pinning Practice", key: "GoodPinningPractice" },
        { label: "Pull Request", key: "PullRequest" },
        { label: "Net Score", key: "NetScore" },
    ];

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[300px]">Metric</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Latency</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {metrics.map(({ label, key }) => (
                    <TableRow key={key}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-right">
                            {ratingsData[key as keyof Ratings].toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                            {ratingsData[
                                `${key}Latency` as keyof Ratings
                            ].toFixed(3)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default MetricsTable;
