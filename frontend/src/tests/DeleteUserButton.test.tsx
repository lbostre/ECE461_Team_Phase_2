import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import DeleteUserButton from "@/components/DeleteUserButton";
import "@testing-library/jest-dom";

// Mock axios
vi.mock("axios");

// Mock auth token
vi.mock("@/utils/auth", () => ({
    getAuthToken: vi.fn(() => "mocked_token"),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe("DeleteUserButton", () => {
    afterEach(() => {
        // Cleanup mocks after each test
        vi.restoreAllMocks();
    });

    it("renders correctly and opens the dialog", () => {
        render(
            <MemoryRouter>
                <DeleteUserButton username="testuser" />
            </MemoryRouter>
        );

        // Ensure the button text is rendered
        const button = screen.getByText("Delete Account");
        expect(button).toBeInTheDocument();

        // Simulate clicking the button
        fireEvent.click(button);

        // Ensure the dialog opens by checking for expected text
        expect(
            screen.getByText("Are you sure you want to delete your account?")
        ).toBeInTheDocument();
    });

    it("calls the delete API and navigates to /login on success", async () => {
        // Mock successful response for the delete API
        vi.spyOn(axios, "delete").mockResolvedValue({ status: 200 });

        render(
            <MemoryRouter>
                <DeleteUserButton username="testuser" />
            </MemoryRouter>
        );

        // Simulate opening the dialog
        fireEvent.click(screen.getByText("Delete Account"));

        // Simulate clicking the delete button
        fireEvent.click(screen.getByText("Delete"));

        // Wait for the API call and navigation
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith(
                `${import.meta.env.VITE_API_URL}/users/testuser`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": "mocked_token",
                    },
                }
            );
            expect(mockNavigate).toHaveBeenCalledWith("/login");
        });
    });

    it("handles API errors gracefully", async () => {
        // Simulate an API failure with a rejected promise
        vi.spyOn(axios, "delete").mockRejectedValue(new Error("Network Error"));

        render(
            <MemoryRouter>
                <DeleteUserButton username="testuser" />
            </MemoryRouter>
        );

        // Simulate clicking the dialog button to open it
        fireEvent.click(screen.getByText("Delete Account"));

        // Simulate clicking delete
        fireEvent.click(screen.getByText("Delete"));

        // Wait for the error API call
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});
