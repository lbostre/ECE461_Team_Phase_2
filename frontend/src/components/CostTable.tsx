import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import React from "react";

type CostData = Record<
    string,
    {
        standaloneCost?: number;
        totalCost?: number;
    }
>;

interface CostTableProps {
    costData: CostData;
}

const CostTable: React.FC<CostTableProps> = ({ costData }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[300px]">ID</TableHead>
                    <TableHead className="text-right">
                        Standalone Cost
                    </TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(costData).map(([id, costs]) => (
                    <TableRow key={id}>
                        <TableCell className="font-medium">{id}</TableCell>
                        <TableCell className="text-right">
                            {costs.standaloneCost !== undefined
                                ? costs.standaloneCost.toFixed(2)
                                : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                            {costs.totalCost !== undefined
                                ? costs.totalCost.toFixed(2)
                                : "N/A"}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default CostTable;
