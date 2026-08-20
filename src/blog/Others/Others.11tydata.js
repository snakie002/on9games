module.exports = {
	tags: ["posts"],
	layout: "layouts/post-others.njk",
	permalink: function(data) {
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
