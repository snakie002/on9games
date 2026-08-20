module.exports = {
	tags: ["posts"],
	layout: "layouts/post-hfok.njk",
	permalink: function(data) {
		// Extract year from file path: /blog/Hfok/24/240219-FFF_398/index
		const parts = data.page.filePathStem.split('/');
		const hfokIndex = parts.indexOf('Hfok');
		if (hfokIndex >= 0 && hfokIndex + 1 < parts.length) {
			const year = parts[hfokIndex + 1];
			if (/^\d{2}$/.test(year)) {
				return year + '/' + data.page.fileSlug + '/index.html';
			}
		}
		// Fallback: use date
		if (data.date) {
			const d = new Date(data.date);
			if (!isNaN(d)) {
				const yy = String(d.getFullYear()).slice(-2);
				return yy + '/' + data.page.fileSlug + '/index.html';
			}
		}
		return data.page.fileSlug + '/index.html';
	}
};
