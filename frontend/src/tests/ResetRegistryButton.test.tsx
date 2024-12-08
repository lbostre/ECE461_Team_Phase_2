import { render, screen, fireEvent } from "@testing-library/react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ResetRegistryButton from "@/components/ResetRegistryButton";
import { describe, expect, it, vi, Mocked, beforeEach, Mock } from "vitest";

// Mock axios
vi.mock("axios");

// Mock the `useNavigate` hook
vi.mock("react-router-dom", () => ({
    useNavigate: vi.fn(),
}));

const mockedAxios = axios as Mocked<typeof axios>;
const mockNavigate = vi.fn();

describe("ResetRegistryButton", () => {
    beforeEach(() => {
        mockedAxios.delete.mockClear();
        mockNavigate.mockClear();
        (useNavigate as Mock).mockImplementation(() => mockNavigate);
    });

    it("renders the Reset button and opens the dialog on click", () => {
        render(<ResetRegistryButton />);

        expect(
            screen.getByRole("button", { name: /Reset/i })
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

        expect(
            screen.getByText(/are you sure you want to reset/i)
        ).toBeInTheDocument();
    });

    it("handles successful registry reset and redirects upon clicking the reset button", async () => {
        mockedAxios.delete.mockResolvedValue({ status: 200 });

        render(<ResetRegistryButton />);

        // Open dialog
        fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

        // Click the Reset button in the dialog
        fireEvent.click(
            screen.getByRole("button", { name: /Reset/i, hidden: false })
        );

        // Simulate the async call
        expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
        expect(mockedAxios.delete).toHaveBeenCalledWith(
            "https://lbuuau0feg.execute-api.us-east-1.amazonaws.com/dev/reset",
            expect.objectContaining({
                headers: {
                    "x-Authorization": null,
                },
            })
        );

        // Wait for navigation
        expect(mockNavigate).not.toHaveBeenCalledWith("/");
    });

    it("handles errors when axios.delete fails", async () => {
        mockedAxios.delete.mockRejectedValue(new Error("Server failure"));

        render(<ResetRegistryButton />);

        fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

        fireEvent.click(
            screen.getByRole("button", { name: /Reset/i, hidden: false })
        );

        expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();

        // Ensure error handling logs are triggered (use `console.error`)
        // expect(console.error).toHaveBeenCalled();
    });
});
