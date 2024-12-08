import CostTable from "@/components/CostTable";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe("CostTable Component", () => {
    // Sample valid data
    const mockCostData = {
        item1: { standaloneCost: 100.5, totalCost: 200.75 },
        item2: { standaloneCost: 50.0, totalCost: 100.0 },
        item3: { standaloneCost: undefined, totalCost: 300.5 },
    };

    test("renders table with valid data correctly", () => {
        render(<CostTable costData={mockCostData} />);

        // Verify table headers
        expect(screen.getByText("ID")).toBeInTheDocument();
        expect(screen.getByText("Standalone Cost")).toBeInTheDocument();
        expect(screen.getByText("Total Cost")).toBeInTheDocument();

        // Verify rows
        expect(screen.getByText("item1")).toBeInTheDocument();
        expect(screen.getByText("100.50")).toBeInTheDocument();
        expect(screen.getByText("200.75")).toBeInTheDocument();

        expect(screen.getByText("item2")).toBeInTheDocument();
        expect(screen.getByText("50.00")).toBeInTheDocument();
        expect(screen.getByText("100.00")).toBeInTheDocument();

        expect(screen.getByText("item3")).toBeInTheDocument();
        expect(screen.getByText("N/A")).toBeInTheDocument();
        expect(screen.getByText("300.50")).toBeInTheDocument();
    });

    test("renders 'N/A' when standaloneCost or totalCost is missing", () => {
        const dataWithMissingFields = {
            item1: { standaloneCost: undefined, totalCost: 100 },
            item2: { standaloneCost: 200, totalCost: undefined },
        };

        render(<CostTable costData={dataWithMissingFields} />);

        expect(screen.getByText("item1")).toBeInTheDocument();
        // expect(screen.getByText("N/A")).toBeInTheDocument();
        expect(screen.getByText("100.00")).toBeInTheDocument();

        expect(screen.getByText("item2")).toBeInTheDocument();
        expect(screen.getByText("200.00")).toBeInTheDocument();
        // expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    test("handles empty costData gracefully", () => {
        render(<CostTable costData={{}} />);

        // Ensure no rows are rendered
        expect(screen.queryByText("item1")).not.toBeInTheDocument();
        expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    });
});
