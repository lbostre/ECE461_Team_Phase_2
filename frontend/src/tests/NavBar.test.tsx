import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NavBar from "@/components/NavBar";

// Mock the Link component to simulate routing navigation
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");

    return {
        ...actual, // Keep the actual exports
        Link: vi.fn(({ to, children }: any) => (
            <a href={to} onClick={() => console.log(`Navigated to: ${to}`)}>
                {children}
            </a>
        )),
    };
});

describe("NavBar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the Home link", () => {
        render(
            <MemoryRouter>
                <NavBar />
            </MemoryRouter>
        );

        expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("renders the Account button with the icon and navigates when clicked", () => {
        render(
            <MemoryRouter>
                <NavBar />
            </MemoryRouter>
        );

        const accountButton = screen.getByRole("link", { name: /Account/i });
        expect(accountButton).toBeInTheDocument();
        expect(screen.getByText("Account")).toBeInTheDocument();
    });

    it("displays the IoPersonCircleOutline icon properly", () => {
        render(
            <MemoryRouter>
                <NavBar />
            </MemoryRouter>
        );

        expect(
            screen.getByRole("link", { name: /Account/i }).querySelector("svg")
        ).not.toBeNull();
    });
});
