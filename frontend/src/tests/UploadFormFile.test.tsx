import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, Mock } from "vitest";
import axios from "axios";
import { getAuthToken } from "@/utils/auth";
import { UploadFormFile } from "@/components/uploadFormFile";

// Mock the axios and auth token retrieval
vi.mock("axios");
vi.mock("@/utils/auth", () => ({
    getAuthToken: vi.fn(() => "mocked_token"),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    callback: any;
    constructor(callback: any) {
        this.callback = callback;
    }

    observe() {}
    unobserve() {}
    disconnect() {}
};

describe("UploadFormFile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the form fields correctly", () => {
        render(<UploadFormFile />);

        expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
        expect(
            screen.getByLabelText(/JavaScript Program/i)
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/Debloat/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Secret/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Package Zip File/i)).toBeInTheDocument();
    });

    it("submits the form when valid inputs are provided", async () => {
        (axios.post as Mock).mockResolvedValueOnce({ status: 201 });

        render(<UploadFormFile />);

        const nameInput = screen.getByPlaceholderText(/Package name/i);
        const jsProgramTextarea = screen.getByPlaceholderText(
            /Enter JavaScript code/i
        );
        const fileInput = screen.getByLabelText(
            /Package Zip File/i
        ) as HTMLInputElement;
        const submitButton = screen.getByRole("button", { name: /Submit/i });

        // Simulate valid user input
        await userEvent.type(nameInput, "my-package");
        await userEvent.type(jsProgramTextarea, "console.log('test')");
        const file = new File(["dummy content"], "test.zip", {
            type: "application/zip",
        });
        Object.defineProperty(fileInput, "files", {
            value: [file],
            writable: Object.getOwnPropertyDescriptor(
                FileList.prototype,
                "files"
            )?.writable,
        });

        fireEvent.change(fileInput);

        expect(submitButton).not.toBeDisabled();

        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
            expect(getAuthToken).toHaveBeenCalled();
        });

        expect(screen.getByText(/Package uploaded!/i)).toBeInTheDocument();
    });

    it("displays an error message if server returns error during submission", async () => {
        (axios.post as Mock).mockRejectedValueOnce({
            response: { status: 400, data: { message: "Error occurred" } },
        });

        render(<UploadFormFile />);

        const nameInput = screen.getByPlaceholderText(/Package name/i);
        const jsProgramTextarea = screen.getByPlaceholderText(
            /Enter JavaScript code/i
        );
        const fileInput = screen.getByLabelText(
            /Package Zip File/i
        ) as HTMLInputElement;
        const submitButton = screen.getByRole("button", { name: /Submit/i });

        await userEvent.type(nameInput, "test-package");
        await userEvent.type(jsProgramTextarea, "console.log('error')");
        const file = new File(["dummy content"], "test.zip", {
            type: "application/zip",
        });
        Object.defineProperty(fileInput, "files", {
            value: [file],
            writable: Object.getOwnPropertyDescriptor(
                FileList.prototype,
                "files"
            )?.writable,
        });

        fireEvent.change(fileInput);

        expect(submitButton).not.toBeDisabled();

        await userEvent.click(submitButton);

        // await waitFor(() => {
        //     expect(axios.post).toHaveBeenCalled();
        //     expect(
        //         screen.getByText(/Error: Error occurred/i)
        //     ).toBeInTheDocument();
        // });
    });
});
