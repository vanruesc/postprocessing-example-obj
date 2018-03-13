const path = require("path");

module.exports = {

	entry: {
		"bundle": "./src/index.js"
	},

	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "public/libs")
	},

	externals: {
		three: "THREE"
	},

	mode: "development",

	module: {
		rules: [
			{
				test: /\.js$/,
				include: /src/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["env"]
					}
				}
			}
		]
	}

};
