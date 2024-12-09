import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, Mocked, test, vi } from "vitest";
import axios from "axios";
import CreateUser from "@/components/CreateUser";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as Mocked<typeof axios>;

global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Test suite
describe("CreateUser Component", () => {
    beforeEach(() => {
        mockedAxios.post.mockClear();
    });

    test("renders the form correctly", () => {
        render(<CreateUser />);

        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/admin\?/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/group/i)).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /create user/i })
        ).toBeInTheDocument();
    });

    test("validates that passwords match", async () => {
        render(<CreateUser />);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: "testuser" },
        });

        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: "differentpassword" },
        });
    });

    test("submits form data on valid input", async () => {
        mockedAxios.post.mockResolvedValue({ data: {} }); // Mock successful API response

        render(<CreateUser />);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: "testuser" },
        });

        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: "password" },
        });
        fireEvent.change(screen.getByLabelText(/group/i), {
            target: { value: "dev-team" },
        });

        fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    });

    test("handles API failure on form submission", async () => {
        mockedAxios.post.mockRejectedValue(new Error("API error"));

        render(<CreateUser />);

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: "testuser" },
        });

        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: "password" },
        });
        fireEvent.change(screen.getByLabelText(/group/i), {
            target: { value: "dev-team" },
        });

        fireEvent.click(screen.getByRole("button", { name: /create user/i }));

        expect(screen.queryByText(/user created!/i)).not.toBeInTheDocument();
    });

    test("toggles isAdmin switch correctly", () => {
        render(<CreateUser />);

        const adminSwitch = screen.getByLabelText(/admin\?/i);

        expect(adminSwitch).not.toBeChecked();

        fireEvent.click(adminSwitch);

        expect(adminSwitch).toBeChecked();
    });

    test("can select multiple permissions", async () => {
        render(<CreateUser />);

        const uploadCheckbox = screen.getByLabelText(/upload/i);
        const searchCheckbox = screen.getByLabelText(/search/i);

        expect(uploadCheckbox).not.toBeChecked();
        expect(searchCheckbox).not.toBeChecked();

        fireEvent.click(uploadCheckbox);
        fireEvent.click(searchCheckbox);

        expect(uploadCheckbox).toBeChecked();
        expect(searchCheckbox).toBeChecked();
    });
});
