/**
 * This script splits the original bundles JSON files into separate YAML files for each quote.
 * lba1/06.json is transformed into:
 * - lba1/06/_bundle.yaml
 * - lba1/06/001.yaml
 * - etc.
 */
import path from "node:path";
import fs from "node:fs/promises";
import glob from "glob-promise";
import yaml from "yaml";

async function process_json_file(file) {
	console.log("Processing quote file", file);
	let json = JSON.parse(await fs.readFile(file));
	if (json.length === 0) {
		return;
	}
	let fileName = path.parse(file);
	let destDir = path.join(fileName.dir, fileName.name);
	await fs.mkdir(destDir, { recursive: true });
	let promises = [];

	let bundle = {
		area: json[0].area,
	};
	promises.push(
		fs.writeFile(
			path.join(destDir, "_bundle.yaml"),
			yaml.stringify(bundle),
		),
	);

	for (let quote of json) {
		let data = {
			location: quote.location,
			speaker: quote.speaker,
			message: quote.message,
		};
		let localId = (
			"000" + quote.id.substr(quote.id.indexOf(":") + 1)
		).slice(-3);
		promises.push(
			fs.writeFile(
				path.join(destDir, localId + ".yaml"),
				yaml.stringify(data, {
					nullStr: "",
					defaultKeyType: "PLAIN",
				}),
			),
		);
	}

	return Promise.all(promises);
}

async function process_json_files(filePattern) {
	let files = await glob(filePattern);
	let promises = [];
	for (let file of files) {
		promises.push(process_json_file(file));
	}
	return Promise.all(promises);
}

await Promise.all([
	process_json_files("lba1/*.json"),
	process_json_files("lba2/*.json"),
]);
