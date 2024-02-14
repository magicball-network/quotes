import glob from "glob-promise";
import jq from "node-jq";

async function validate_json(filePattern) {
	let files = await glob(filePattern);
	let allValid = true;
	for (let file of files) {
		try {
			await jq.run(".", file);
		} catch (e) {
			console.error('Invalid JSON file "%s": %s', file, e.message);
			allValid = false;
		}
	}
	return allValid;
}

let allValid = true;
for (let i = 2; i < process.argv.length; i++) {
	allValid &= await validate_json(process.argv[i]);
}

if (!allValid) {
	console.info("❌ JSON validation FAILED");
	process.exit(1);
} else {
	console.info("✅ JSON validation passed");
}
