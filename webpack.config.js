const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
let local = { devServer: {}, plugins: [] };
try {
    local = require("./local.webpack");
} catch (e) {

}


let environment = "development";
//let environment = "production";
module.exports = [
    {
        target: "web",
        entry: {
            compiler: ["./src/compiler/index.ts"],
            designer: ["./src/designer/index.ts"],
            executer: ["./src/executer/index.ts"],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "ts-loader",
                            options: {
                                configFile: "tsconfig.json",
                            },
                        }
                    ]
                },
                {
                    test: /\.twig$/,
                    // loader: "twig-loader",
                    loader: "raw-loader",
                    options: {
                        // See options section below
                    },
                }
            ],
        },
        plugins: [
            ...(local.plugins || []),
            new CopyPlugin({
                patterns: [
                    { context: 'src/designer/public', from: './**/*', to: "." },
                ]
            }),
            // new MiniCssExtractPlugin(),
            // new HtmlWebpackPlugin({
            //     excludeChunks: ["sw"],
            //     template: '!!handlebars-loader!src/index.hbs',
            // }),
        ],
        mode: environment,
        output: {
            path: path.resolve(__dirname, "./build"),
            filename: "js/[name].js",
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        devServer: {
            ...local.devServer,
            contentBase: path.join(__dirname, 'build'),
        }
    },
]