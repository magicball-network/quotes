import path from "node:path";
import fs from "node:fs/promises";
import glob from "glob-promise";
import jq from "node-jq";

async function merge_json(filePattern, destination) {
	await fs.mkdir(path.dirname(destination), { recursive: true });
	let files = await glob(filePattern);
	let merged = await jq.run("[ .[] | .[] ]", files, {
		output: "string",
		slurp: true,
	});
	await fs.writeFile(destination, merged);
	console.log(`Merged ${filePattern} into ${destination}`);
}

await merge_json("lba1/*.json", "dist/lba1.json");
await merge_json("lba2/*.json", "dist/lba2.json");
