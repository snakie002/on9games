const path = require("path");
const eleventyImage = require("@11ty/eleventy-img");

module.exports = (eleventyConfig) => {
	function relativeToInputPath(inputPath, relativeFilePath) {
		let split = inputPath.split("/");
		split.pop();

		return path.resolve(split.join(path.sep), relativeFilePath);
	}

	// Eleventy Image shortcode
	// https://www.11ty.dev/docs/plugins/image/
	eleventyConfig.addAsyncShortcode(
		"image",
		async function imageShortcode(src, alt, widths, sizes) {
			// Full list of formats here: https://www.11ty.dev/docs/plugins/image/#output-formats
			// Warning: Avif can be resource-intensive so take care!
			let formats = ["avif", "webp", "auto"];
			let file = relativeToInputPath(this.page.inputPath, src);

			let metadata = await eleventyImage(file, {
				widths: widths || ["auto"],
				formats,
				outputDir: path.join(eleventyConfig.dir.output, "img"), // Advanced usage note: `eleventyConfig.dir` works here because we’re using addPlugin.
			});

			// TODO loading=eager and fetchpriority=high
			let imageAttributes = {
				alt,
				sizes,
				loading: "lazy",
				decoding: "async",
			};
			return eleventyImage.generateHTML(metadata, imageAttributes);
		}
	);

    eleventyConfig.addAsyncShortcode(
        "coverimage",
        async function coverImageShortcode(post, filePathStem, coverImage2) {
            try {
                const filepath = post?.filePathStem || filePathStem;
                const coverImage = post?.data.coverImage || coverImage2;
                const serverUrl = process.env.MEDIA_SERVER;
				
                const src = `${serverUrl}/${path.join(
                    filepath.replace("/blog/", "").replace("/index", ""),
                    coverImage
                )}`;
                return `<img loading="lazy" src="${src}" />`;
            } catch (err) {
                console.error(err);
            }

			// Full list of formats here: https://www.11ty.dev/docs/plugins/image/#output-formats
			// Warning: Avif can be resource-intensive so take care!
			/*
			let formats = ["avif", "webp", "auto"];

			const chunks = src.split("/");
			const imgPath = path.join(
				process.env.MEDIA_DIR,
				[
					chunks[chunks.length - 3],
					chunks[chunks.length - 2],
					chunks[chunks.length - 1],
				].join("/")
			);

			let metadata = await eleventyImage(imgPath, {
				widths: widths || ["auto"],
				formats,
				outputDir: path.join(eleventyConfig.dir.output, "img"), // Advanced usage note: `eleventyConfig.dir` works here because we’re using addPlugin.
			});

			// TODO loading=eager and fetchpriority=high
			let imageAttributes = {
				alt,
				sizes,
				loading: "lazy",
				decoding: "async",
			};
			return eleventyImage.generateHTML(metadata, imageAttributes);
			*/
		}
	);
};
