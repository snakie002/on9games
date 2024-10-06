const fs = require("fs");
const path = require("path");

const dirs = fs.readdirSync("./src/blog/WordPress");

for (let dir of dirs) {
	const p = path.join(__dirname, "./src/blog/WordPress", dir);
	// fs.renameSync(path.join(p, "media_assets"), path.join(p, "post_assets"));

	const md = fs.readFileSync(path.join(p, "index.md")).toString();
	const finalMd = md
		.replaceAll(new RegExp("WordPress/", "g"), "post_assets/")
		.replaceAll(new RegExp(`coverImage: "`, "g"), `coverImage: "post_assets/`);
	fs.writeFileSync(path.join(p, "index.md"), finalMd);
}
