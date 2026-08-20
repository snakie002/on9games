module.exports = {
	tags: ["posts"],
	layout: "layouts/post.njk",
	permalink: function(data) {
		// Extract year from file path: /blog/Snakie/26/260821-TESTING/index
		const parts = data.page.filePathStem.split('/');
		// Find the year folder (23, 24, 25, 26, etc.)
		const snakieIndex = parts.indexOf('Snakie');
		if (snakieIndex >= 0 && snakieIndex + 1 < parts.length) {
			const year = parts[snakieIndex + 1];
			if (/^\d{2}$/.test(year)) {
				return year + '/' + data.page.fileSlug + '/index.html';
			}
		}
		return data.page.fileSlug + '/index.html';
	}
};
