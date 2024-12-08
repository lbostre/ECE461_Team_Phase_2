import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getAuthToken } from "@/utils/auth";
import axios from "axios";

type versionOptions = "exact" | "boundedRange" | "carat" | "tilde";
type UserPerms = Array<"upload" | "search" | "download">;
export default function Root() {
    const navigate = useNavigate();
    const token = getAuthToken();
    const apiUrl = import.meta.env.VITE_API_URL;
    const [userPerms, setUserPerms] = useState<UserPerms>([]);
    const [packageName, setPackageName] = useState("");
    const [versionNumber, setVersionNumber] = useState("");
    const [versionNumberTwo, setVersionNumberTwo] = useState("");
    const [regex, setRegex] = useState("");
    const [regexError, setRegexError] = useState("");
    const [versionError, setVersionError] = useState(false);
    const [selectedOption, setSelectedOption] =
        useState<versionOptions>("exact");

    const handleChange = (value: versionOptions) => {
        setSelectedOption(value); // Update state when an option is selected
        console.log(value);
    };

    const validateVersion = (value: string) => {
        const versionRegex = /^\d+\.\d+\.\d+$/; // Full match for #.#.# format
        setVersionError(value !== "" && !versionRegex.test(value));
    };

    const handleVersionChange = (value: string) => {
        setVersionNumber(value);
        setVersionError(false); // Reset error during typing
    };

    const handleVersionChangeTwo = (value: string) => {
        setVersionNumberTwo(value);
        setVersionError(false); // Reset error during typing
    };

    const handleBlur = () => {
        validateVersion(versionNumber); // Validate on blur
    };

    const handleSubmit = async () => {
        const token = getAuthToken();

        // Map the selected option to its corresponding format
        const versionFormats = {
            exact: `Exact (${versionNumber})`,
            boundedRange: `Bounded range (${versionNumber}-2.1.0)`, // Example range
            carat: `Carat (^${versionNumber})`,
            tilde: `Tilde (~${versionNumber})`,
        };

        // Build the Version string based on the selected option
        const selectedVersion = versionFormats[selectedOption];

        // Create the request body
        const requestBody = [{ Version: selectedVersion, Name: packageName }];
        console.log(requestBody);

        try {
            const response = await axios.post(
                `${apiUrl}/packages`,
                requestBody,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            navigate("/packages", { state: { data: response.data } });
        } catch (error) {
            console.error("Error submitting the request:", error);
        }
    };

    const handleSubmitRegex = async () => {
        try {
            const response = await axios.post(
                `${apiUrl}/package/byRegEx`,
                {
                    RegEx: regex,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Authorization": token,
                    },
                }
            );
            navigate("/packages", { state: { data: response.data } });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                setRegexError(error.response.data.error);
            } else {
                setRegexError("An unknown error occurred.");
            }
            console.error("Error submitting the request:", error);
        }
    };

    useEffect(() => {
        const authenticate = async () => {
            try {
                const response = await axios.get(`${apiUrl}/users`, {
                    headers: {
                        "x-Authorization": token,
                    },
                });
                console.log(
                    "Authenticated user permissions:",
                    response.data.User.permissions
                );
                setUserPerms(response.data.User.permissions);
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        };

        authenticate();
    }, [token]);

    return (
        <div className="flex flex-col items-center justify-center w-screen h-screen">
            <div className="flex flex-col gap-4 items-center w-[600px] h-fit">
                <h1 className="font-bold text-2xl">Package Manager</h1>
                {userPerms.includes("search") && (
                    <div className="flex flex-col gap-4 items-center w-full">
                        <div className="w-full flex flex-col gap-2">
                            <h1 className="font-bold text-xl">
                                Search with Name and Version
                            </h1>
                            <Input
                                className="text-black w-full"
                                placeholder="Search packages..."
                                value={packageName}
                                onChange={(e) => setPackageName(e.target.value)}
                            />
                            <div className="flex flex-row items-center justify-between">
                                <div className="flex flex-row items-center gap-2">
                                    <Select
                                        value={selectedOption}
                                        onValueChange={handleChange}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="exact">
                                                    Exact
                                                </SelectItem>
                                                <SelectItem value="boundedRange">
                                                    Bounded range
                                                </SelectItem>
                                                <SelectItem value="carat">
                                                    Carat
                                                </SelectItem>
                                                <SelectItem value="tilde">
                                                    Tilde
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        className="text-black w-40"
                                        placeholder="Version number"
                                        value={versionNumber}
                                        onChange={(e) =>
                                            handleVersionChange(e.target.value)
                                        }
                                        onBlur={handleBlur} // Validate on blur
                                    />
                                    {selectedOption === "boundedRange" && (
                                        <Input
                                            className="text-black w-40"
                                            placeholder="Version number"
                                            value={versionNumberTwo}
                                            onChange={(e) =>
                                                handleVersionChangeTwo(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={handleBlur} // Validate on blur
                                        />
                                    )}
                                </div>
                                <Button
                                    className="w-fit"
                                    disabled={
                                        versionError ||
                                        !versionNumber ||
                                        !packageName
                                    }
                                    onClick={() => handleSubmit()}
                                >
                                    Search
                                </Button>
                            </div>
                            {versionError && (
                                <p className="text-red-500 text-sm">
                                    Version number must be in #.#.# format.
                                </p>
                            )}
                        </div>
                        <div className="w-full flex flex-col gap-2">
                            <h1 className="font-bold text-xl">
                                Search with Regex
                            </h1>
                            <div className="flex flex-row gap-2">
                                <Input
                                    className="text-black w-full"
                                    placeholder="Search packages..."
                                    value={regex}
                                    onChange={(e) => setRegex(e.target.value)}
                                />
                                <Button
                                    className="w-fit"
                                    disabled={!regex}
                                    onClick={() => handleSubmitRegex()}
                                >
                                    Search
                                </Button>
                            </div>
                            {regexError && (
                                <p className="text-red-500 text-sm">
                                    Error: {regexError}
                                </p>
                            )}
                            {versionError && (
                                <p className="text-red-500 text-sm">
                                    Version number must be in #.#.# format.
                                </p>
                            )}
                        </div>
                    </div>
                )}
                {userPerms.includes("upload") && (
                    <>
                        <p>or</p>
                        <Link to="/upload">
                            <Button className="w-fit">Upload</Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
