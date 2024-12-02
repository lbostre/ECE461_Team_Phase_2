"use client";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Link } from "react-router-dom";
import SignInButton from "./SignInButton";

export default function NavBar() {
    return (
        <header
            className={
                "px-12 py-5 fixed top-0 z-40 flex items-center justify-between w-full"
            }
        >
            <NavigationMenu className="hidden lg:block">
                <NavigationMenuList>
                    <NavigationMenuItem>
                        <Link to={"/"}>
                            <NavigationMenuLink className="font-bold">
                                Home
                            </NavigationMenuLink>
                        </Link>
                    </NavigationMenuItem>
                </NavigationMenuList>
            </NavigationMenu>
            <SignInButton />
        </header>
    );
}
