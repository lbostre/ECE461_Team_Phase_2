import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import SignIn from "./SignIn";
import SignUp from "./SignUp";

export default function SignInButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 rounded-md bg-black text-white font-medium text-sm flex gap-2 items-center"
                >
                    Sign in
                </button>
            </DialogTrigger>
            <DialogContent className="px-8 py-6">
                {isSignUp ? (
                    <SignUp setIsOpen={setIsOpen} />
                ) : (
                    <SignIn setIsOpen={setIsOpen} />
                )}
                <button
                    className="text-blue-500 hover:underline mt-2 text-sm"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp
                        ? "Already have an account?"
                        : "Don't have an account?"}
                </button>
            </DialogContent>
        </Dialog>
    );
}
