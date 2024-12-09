import { render, screen } from "@testing-library/react";
import MetricsTable from "@/components/MetricsTable";
import { Ratings } from "@/routes/package";
import { describe, it, expect } from "vitest";

// Mock ratings data to simulate props
const mockRatingsData: Ratings = {
    BusFactor: 0.8,
    Correctness: 0.9,
    RampUp: 0.7,
    ResponsiveMaintainer: 0.95,
    LicenseScore: 0.88,
    GoodPinningPractice: 0.75,
    PullRequest: 0.85,
    NetScore: 0.78,
    BusFactorLatency: 0.1,
    CorrectnessLatency: 0.2,
    RampUpLatency: 0.15,
    ResponsiveMaintainerLatency: 0.12,
    LicenseScoreLatency: 0.13,
    GoodPinningPracticeLatency: 0.2,
    PullRequestLatency: 0.25,
    NetScoreLatency: 0.1,
};

describe("MetricsTable Component", () => {
    it("renders the table headers correctly", () => {
        render(<MetricsTable ratingsData={mockRatingsData} />);

        // Verify headers
        expect(screen.getByText("Metric")).toBeInTheDocument();
        expect(screen.getByText("Rating")).toBeInTheDocument();
        expect(screen.getByText("Latency")).toBeInTheDocument();
    });

    it("renders the correct number of rows based on the metrics array", () => {
        render(<MetricsTable ratingsData={mockRatingsData} />);

        // There should be 8 rows in total (as per the metrics array length)
        expect(screen.getAllByRole("row")).toHaveLength(9); // 1 header row + 8 table rows
    });

    it("displays correct ratings and latencies for each metric", () => {
        render(<MetricsTable ratingsData={mockRatingsData} />);

        // Check if each metric's corresponding rating and latency are rendered correctly
        expect(screen.getByText("Bus Factor")).toBeInTheDocument();
        expect(screen.getByText("0.800")).toBeInTheDocument();

        expect(screen.getByText("Correctness")).toBeInTheDocument();
        expect(screen.getByText("0.900")).toBeInTheDocument();

        expect(screen.getByText("Ramp Up")).toBeInTheDocument();
        expect(screen.getByText("0.700")).toBeInTheDocument();
        expect(screen.getByText("0.150")).toBeInTheDocument();
    });
});
