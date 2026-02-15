import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
    entry: "./src/DenoiserWorklet.ts",
    output: {
        filename: "DenoiserWorklet.js",
        path: path.resolve(__dirname, "lib"),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    mode: "production",
    performance: {
        hints: false,
    },
}