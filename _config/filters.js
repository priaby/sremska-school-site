import { DateTime } from "luxon";
import metadata from "../_data/metadata.js";

const imageRegex = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

export default function (eleventyConfig) {
	eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
	eleventyConfig.addFilter("log", (content) => {
		console.log(content);
		return content;
	});

	eleventyConfig.addFilter("imagesOnly", (media) => {
		if (!media) return [];
		return media.filter((file) => imageRegex.test(file));
	});

	eleventyConfig.addFilter("striptags", function (content) {
		if (typeof content !== "string") return content;
		return content.replace(/<[^>]*>/g, "");
	});

	// Filter to get only non-image files
	eleventyConfig.addFilter("nonImages", (media) => {
		if (!media) return [];
		return media.filter((file) => !imageRegex.test(file));
	});

	eleventyConfig.addFilter("removeExtension", (filename) => {
		return filename.replace(/\.[^/.]+$/, "");
	});

	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" })
			.setLocale("ru")
			.toFormat(format || "LLL yyyy");
	});

	eleventyConfig.addFilter("taglink", function (posttag) {
		const found = (metadata.tag_links || []).find(
			(link) => link.name === posttag,
		);
		if (found) {
			return found.url;
		}
		return posttag; // fallback to raw tag (or slugify if you want)
	});

	eleventyConfig.addFilter("pretty", function (content) {
		const lines = content.split("\n");

		for (let i = 1; i < lines.length; i++) {
			if (
				lines[i].includes('class="sidenote"') &&
				lines[i - 1].trim().startsWith("<p")
			) {
				// Swap lines in-place
				[lines[i - 1], lines[i]] = [lines[i], lines[i - 1]];
			}
		}

		return lines.join("\n");
	});

	eleventyConfig.addFilter("htmlDateString", (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if (!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if (n < 0) {
			return array.slice(n);
		}

		return array.slice(0, n);
	});

	// Return the smallest number argument
	eleventyConfig.addFilter("min", function (input) {
		if (Array.isArray(input)) {
			return Math.min(...input);
		} else if (typeof input === "number") {
			return input;
		} else {
			console.warn("min filter got invalid input:", input);
			return NaN;
		}
	});

	// Return the keys used in an object
	eleventyConfig.addFilter("getKeys", (target) => {
		return Object.keys(target);
	});

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter((tag) => ["all", "posts"].indexOf(tag) === -1);
	});

	eleventyConfig.addFilter("sortAlphabetically", (strings) =>
		(strings || []).sort((b, a) => b.localeCompare(a)),
	);

	eleventyConfig.addFilter("topTagCounts", (tagsCollection) => {
		if (!Array.isArray(tagsCollection)) return [];

		// Extract item counts
		const counts = tagsCollection.map((tagObj) => tagObj.items.length);

		// Sort descending
		counts.sort((a, b) => b - a);

		// Get top 10% (at least one)
		const topN = Math.max(1, Math.ceil(counts.length / 10));

		return counts.slice(0, topN);
	});

	eleventyConfig.addFilter("typeof", function (value) {
		return typeof value;
	});
}
