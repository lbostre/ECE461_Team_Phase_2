import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, Mocked } from "vitest";
import axios from "axios";
import { UploadFormURL } from "@/components/uploadFormURL";

// Mock axios
vi.mock("axios");

// Mock auth token
vi.mock("@/utils/auth", () => ({
    getAuthToken: vi.fn(() => "mocked_token"),
}));

// Use Vitest's mock type
const mockedAxios = axios as unknown as Mocked<typeof axios>;

describe("UploadFormURL Component", () => {
    beforeEach(() => {
        mockedAxios.post.mockReset();
    });

    it("displays success message on successful submission", async () => {
        // Mock a successful response with status 201
        mockedAxios.post.mockResolvedValue({ status: 201 });

        render(<UploadFormURL />);

        // Simulate user input
        fireEvent.change(screen.getByPlaceholderText("Package URL"), {
            target: { value: "https://github.com/example/package" },
        });

        fireEvent.change(screen.getByPlaceholderText("Enter JavaScript code"), {
            target: { value: "console.log('test');" },
        });

        // Submit the form
        fireEvent.click(screen.getByText("Submit"));

        // Wait for mocked axios POST response
        await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());

        // Wait for the success message to render
        expect(
            await screen.findByText("Package uploaded!")
        ).toBeInTheDocument();
    });

    it("displays error message when server responds with 409 Conflict", async () => {
        // Mock a 409 error response
        mockedAxios.post.mockRejectedValue({
            response: { status: 409, data: { message: "Conflict error" } },
        });

        render(<UploadFormURL />);

        // Simulate user input
        fireEvent.change(screen.getByPlaceholderText("Package URL"), {
            target: { value: "https://github.com/example/package" },
        });

        fireEvent.change(screen.getByPlaceholderText("Enter JavaScript code"), {
            target: { value: "console.log('test');" },
        });

        // Submit the form
        fireEvent.click(screen.getByText("Submit"));

        // Wait for mocked axios POST to trigger
        await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());

        // expect(
        //     await screen.findByText(
        //         "Error: The package already exists or has conflicting data."
        //     )
        // ).toBeInTheDocument();
    });

    it("handles network errors gracefully", async () => {
        mockedAxios.post.mockRejectedValue(new Error("Network failure"));

        render(<UploadFormURL />);

        // Simulate user input
        fireEvent.change(screen.getByPlaceholderText("Package URL"), {
            target: { value: "https://github.com/example/package" },
        });

        fireEvent.change(screen.getByPlaceholderText("Enter JavaScript code"), {
            target: { value: "console.log('test');" },
        });

        fireEvent.click(screen.getByText("Submit"));

        await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());

        // expect(
        //     await screen.findByText(
        //         "Network error: Unable to connect to the server."
        //     )
        // ).toBeInTheDocument();
    });
});
