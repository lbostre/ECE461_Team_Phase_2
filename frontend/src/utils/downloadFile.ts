// utils/downloadFile.ts

export function downloadFile(base64String: string, packageName: string): void {
    try {
        const byteString = atob(base64String); // Decode the base64 string
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const intArray = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
            intArray[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], { type: "application/zip" });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${packageName}.zip`;
        a.click();

        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error processing downloadFile:", error);
    }
}
