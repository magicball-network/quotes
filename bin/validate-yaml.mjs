import glob from "glob-promise";
import fs from "node:fs/promises";
import yaml from "yaml";
import path from "node:path";

function validate_content(file, data) {
	if (path.basename(file) === "_bundle.yaml") {
		if (!data.area) {
			throw new Error("Missing 'area' value in bundle file");
		}
	} else {
		if (!data.message) {
			throw new Error("Missing 'message' value in quote file");
		}
	}
}

async function validate_yaml(filePattern) {
	let files = await glob(filePattern);
	let allValid = true;
	for (let file of files) {
		try {
			let data = await fs.readFile(file, "utf8");
			validate_content(
				file,
				yaml.parse(data, { strict: true, prettyErrors: true }),
			);
		} catch (e) {
			console.error('Invalid YAML file "%s": %s', file, e.message);
			allValid = false;
		}
	}
	return allValid;
}

let allValid = true;
for (let i = 2; i < process.argv.length; i++) {
	allValid &= await validate_yaml(process.argv[i]);
}

if (!allValid) {
	console.info("❌ YAML validation FAILED");
	process.exit(1);
} else {
	console.info("✅ YAML validation passed");
}
