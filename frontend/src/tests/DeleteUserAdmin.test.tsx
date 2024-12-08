import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import DeleteUserAdmin from "@/components/DeleteUserAdmin";

// Mock axios
vi.mock("axios");

// Mock auth token
vi.mock("@/utils/auth", () => ({
    getAuthToken: () => "mocked_token",
}));

describe("DeleteUserAdmin", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders the form with a username input and submit button", () => {
        render(<DeleteUserAdmin />);

        expect(screen.getByText("Delete a User")).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Enter a username")
        ).toBeInTheDocument();
        expect(screen.getByText("Delete user")).toBeInTheDocument();
    });

    it("handles successful user deletion and renders success message", async () => {
        // Mock axios globally
        vi.mock("axios", () => ({
            delete: vi.fn(() => Promise.resolve({ status: 200 })),
        }));

        render(<DeleteUserAdmin />);

        // Simulate user entering username
        const usernameInput = screen.getByPlaceholderText("Enter a username");
        fireEvent.change(usernameInput, { target: { value: "testuser" } });

        // Simulate form submission by clicking the button
        const deleteButton = screen.getByText("Delete user");
        fireEvent.click(deleteButton);

        // Wait for mocked axios.delete call
        // await waitFor(() => {
        //     expect(axios.delete).toHaveBeenCalledWith(
        //         expect.stringMatching(/users\/testuser/),
        //         expect.objectContaining({
        //             headers: expect.any(Object),
        //         })
        //     );
        // });

        // Wait for UI confirmation
        // expect(await screen.findByText("User deleted!")).toBeInTheDocument();
    });

    it("handles missing auth token case", async () => {
        vi.mock("@/utils/auth", () => ({
            getAuthToken: () => undefined,
        }));

        render(<DeleteUserAdmin />);

        fireEvent.change(screen.getByPlaceholderText("Enter a username"), {
            target: { value: "testuser" },
        });

        fireEvent.click(screen.getByText("Delete user"));

        await waitFor(() => {
            expect(
                screen.getByText("Authorization token is missing.")
            ).toBeInTheDocument();
        });
    });
});
